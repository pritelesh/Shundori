# Phase 7 — Order management

Phase 7 adds the operational order workflows and the customer-facing tracking
page. Supabase remains authoritative: browser-supplied prices and totals are
never trusted, and all mutations go through service-role database functions
called from trusted server code.

## Scope

- Admin list: `/admin/orders`
- Admin detail: `/admin/orders/[id]`
- Customer tracking: `/track-order` (`noindex, nofollow`)
- Database migrations:
  [`0008_phase7_orders.sql`](../supabase/migrations/0008_phase7_orders.sql) and
  [`0009_order_audit_fixes.sql`](../supabase/migrations/0009_order_audit_fixes.sql)
- Verification: `npm run verify:orders`, `npm run verify:supabase`
- Live audit: `npm run audit:orders`

COD remains the only enabled payment method. bKash, Nagad and SSLCommerz stay
disabled placeholders; no gateway callbacks were added.

## Lifecycle

| From        | Allowed next statuses       |
| ----------- | --------------------------- |
| `pending`   | `confirmed`, `cancelled`    |
| `confirmed` | `processing`, `cancelled`   |
| `processing`| `shipped`, `cancelled`      |
| `shipped`   | `delivered`                 |
| `delivered` | none                        |
| `cancelled` | none                        |

While a customer cancellation request is `requested`, `set_order_status()`
blocks every non-cancelling transition. An admin must approve or reject the
request first; the status dropdown is disabled in the UI until that decision is
made.

`returned` remains a legacy terminal value on older rows so they stay readable.
Phase 7 never targets `returned`. The same transition rules live in:

- `lib/order-status.ts` for UI option filtering and static verification
- `public.can_transition_order_status()` in the migration
- a `BEFORE INSERT OR UPDATE OF order_status` trigger, so a direct table write
  cannot skip the state machine

Every actual status change writes one `order_status_changes` row from an
`AFTER INSERT OR UPDATE OF order_status` trigger. Rows contain `from_status`,
`to_status`, `actor_type` (`system`, `admin` or `customer`), `actor_id`, a note
and a server timestamp. Existing orders receive one synthetic `Imported order
state` row on migration; no intermediate history is invented.

## Admin workflow

`services/orders.ts` provides the admin reads and maps database rows into domain
view models. The list shows order number, customer name, phone, date, item
count, total, payment method, payment status and fulfilment/cancellation
statuses; payment and total fields are read-only.

The detail page adds customer details, delivery address, purchased products
with unit prices and quantities, subtotal, delivery charge, discount, final
total, status history, cancellation decision data and courier readiness.
Status changes call `public.set_order_status()` with an actor from the signed-in
admin/staff profile. Cancellation approval calls
`public.decide_order_cancellation()`; rejection is recorded as a same-status
admin audit row and never changes stock.

All admin mutations revalidate `/admin/orders` so the detail, history and list
stay consistent.

## Customer tracking

`services/order-tracking.ts` calls `public.track_order()` with both the order
number and the checkout phone number. Either value alone is insufficient: a
mismatch is indistinguishable from an unknown order. The RPC returns only:

- order number, status and placed-at timestamp
- payment method
- privacy-safe line items (product name, quantity, unit price, line total)
- cancellation status and request time
- courier state and an estimated delivery time **only** when a real shipment row
  exists

It never returns customer name, phone, email, address, order-level
subtotal/delivery/discount/total, confirmation token, cancellation reason or
admin decision note. Per-item `lineTotal` values are returned as part of the
item list, so their sum can reveal the subtotal; no additional order-level value
is exposed. The service maps the payload to `TrackedOrder` and rejects
unexpected shapes defensively.

The cancellation form accepts a reason and calls
`public.request_order_cancellation()`. Requests are allowed only for
`pending`, `confirmed` or `processing` orders with no previous request or
decision. A successful submission returns a refreshed tracking DTO so the page
immediately shows `Review pending` instead of offering a duplicate request.

## Cancellation and stock

Cancellation is a two-step process:

1. The customer requests it; the order keeps its current status and stock is
   untouched. A same-status `customer` history row records the reason.
2. An admin approves or rejects it. Approval calls `set_order_status(...,
   'cancelled', ...)`, marks the cancellation approved and restores stock in the
   same transaction. Rejection records a decision and an admin history row.

An admin may also cancel an order directly from the status control. That path
restores stock and writes the status history, but it does **not** fabricate a
customer request: orders with no request keep `cancellationStatus = none`, and
orders with a rejected request keep that decision. Only a previously requested
cancellation becomes `approved`.

`public.restore_cancelled_order_stock()` takes an advisory transaction lock,
locks the order and each product row, adds back the recorded quantities, writes
one `cancellation_restore` row per product in `inventory_changes`, and sets
`cancellation_stock_restored = true`. Replaying the decision or the restore
function is a no-op. If an item no longer has a product row—for example after a
hard delete—the whole transaction fails instead of silently losing the
adjustment.

## Courier readiness

`lib/courier.ts` defines a small registry for Pathao, Steadfast and RedX. All
adapters are currently `enabled: false`; `getEnabledCourierAdapters()` is empty
and `isCourierConnected()` returns `false`.

`courier_shipments` stores an optional provider, provider shipment ID, provider
status, tracking URL and estimated delivery time. No row is created by Phase 7
and no tracking status or ETA is simulated. When a real adapter is enabled in a
later phase, it can write this table and the existing admin/customer views will
surface only values supplied by that provider.

## Security notes

- The tracking and cancellation-reason functions are executable only by
  `service_role`; browser clients cannot call them directly.
- `order_status_changes` and `courier_shipments` have RLS enabled. Anonymous
  access is revoked; only admin/staff sessions can SELECT, and only
  `service_role` can write.
- The confirmation token on `/order-success/[orderNumber]` is still a private
  bearer secret and is not included in any Phase 7 tracking payload.
- `/track-order`, `/admin/orders` and `/admin/orders/[id]` are `noindex,
  nofollow`.
- Tracking deliberately requires both the order number and checkout phone, but
  Phase 7 does not add request throttling. No customer identity, address,
  confirmation token or order-level total is exposed; abuse-rate limiting is
  left as a separate review item rather than a Phase 7 bug fix.

## Tests

`npm run verify:orders` is dependency-free apart from TypeScript and checks the
status table, input normalisation, cancellation eligibility, courier registry,
migration safety invariants, required admin fields and tracking privacy.

`npm run verify:supabase` checks the new tables, columns, RLS, report function,
anonymous denials and the Phase 6 schema.

`npm run audit:orders` requires all three Supabase keys and must be run against
a disposable project. It creates throwaway catalogue rows and COD orders, then
verifies:

- Pending → Confirmed → Processing → Shipped → Delivered
- timestamped, actor-tagged history for every transition
- no payment/total mutation and rejection of backwards transitions
- matching and mismatching order number/phone tracking, with no private fields
- customer request followed by admin rejection, leaving stock unchanged
- a pending request blocking status advancement until it is decided
- admin approval, exactly-once stock restoration and terminal cancellation
- concurrent approvals producing exactly one restoration
- direct admin cancellation without a fabricated customer request
- a deleted product aborting restoration instead of losing stock
- anonymous/customer denials for every order RPC and cross-customer RLS reads
- cleanup of every row created by the audit

A browser pass additionally checked the admin list/detail, status dropdown,
customer cancellation request, admin approval, immediate tracking refresh and
the footer link to `/track-order`.
