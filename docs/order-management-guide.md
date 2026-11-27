# Order management guide

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Admin list: **`/admin/orders`**; detail: **`/admin/orders/[id]`**.
- Customer tracking: **`/track-order`** (`noindex, nofollow`).
- Roles are `customer`, `admin` and `staff`; only `admin`/`staff` can change
  order status or decide cancellations. There is no privileged self-registration.
- Money is integer poisha in the database and displayed with `formatPrice()`.
  Admin screens never accept payment status or totals as editable input.
- **COD is the only enabled payment method.** bKash, Nagad and SSLCommerz are
  disabled placeholders; courier adapters (Pathao, Steadfast, RedX) are disabled
  and no status or ETA is invented.
- Migrations `0001`–`0010` must be applied in filename order.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, never `NEXT_PUBLIC_`; privileged
  RPCs are called from trusted server code.

## Fulfilment lifecycle

| From        | Allowed next statuses    |
| ----------- | ------------------------ |
| `pending`   | `confirmed`, `cancelled` |
| `confirmed` | `processing`, `cancelled` |
| `processing`| `shipped`, `cancelled`   |
| `shipped`   | `delivered`              |
| `delivered` | none                     |
| `cancelled` | none                     |

`returned` is a legacy terminal value kept only so older rows remain readable;
it is never offered as a new target. The same transition table is enforced in
`lib/order-status.ts`, `public.can_transition_order_status()` and a database
trigger on `ORDER STATUS` changes, so a direct table write cannot skip states.

While a customer's cancellation status is `requested`, every non-cancelling
transition is blocked in both the UI (the status dropdown is disabled) and
`set_order_status()`. An admin must approve or reject the request first.

## Admin list and detail

`/admin/orders` shows order number, customer, phone, item count, total, payment
method, payment status, order status, cancellation status and order date. The
status control is server-enforced and payment/total columns are read-only.

`/admin/orders/[id]` adds:

- customer details, notes and delivery address;
- purchased products with unit price, quantity and line total;
- subtotal, delivery charge, discount and final total, all formatted with
  `formatPrice()`;
- fulfilment status control and cancellation badge;
- timestamped status history;
- cancellation request and decision data;
- courier readiness. With no real shipment row it states that no courier is
  connected and lists the providers as "planned".

## Status history

Every order creation and actual status change writes one
`order_status_changes` row from a database trigger. Entries show `from_status`,
`to_status`, `actor_type` (`system`, `admin` or `customer`), actor id, optional
note and server timestamp (rendered in Asia/Dhaka time). Existing orders received
one synthetic `Imported order state` entry on migration; no intermediate history
was invented. Rejection of a cancellation is recorded as a same-status `admin`
audit row.

## Cancellation decisions

Customers may request cancellation at `/track-order` using both the order number
and checkout phone number. Requests are allowed only for `pending`,
`confirmed` or `processing` orders with no prior request or decision; the reason
is capped at 500 characters. The order keeps its current status and stock is
untouched until an admin decides.

On the detail page:

- **Approve cancellation** calls `decide_order_cancellation()`. It sets status
  to `cancelled`, marks the cancellation approved, and restores stock in the same
  transaction. An optional decision note (<= 500 characters) enters the audit
  trail.
- **Reject request** records the decision and an admin history row. Stock and
  order status are unchanged.
- A direct admin cancellation via the status control restores stock and writes
  history, but does **not** fabricate a customer request: an order with no
  request keeps `cancellationStatus = none`; a rejected request keeps its
  rejection.

`public.restore_cancelled_order_stock()` uses advisory and row locks, adds back
the recorded quantities, writes one `cancellation_restore` row per product, and
sets `cancellation_stock_restored = true`. Replaying approval or restore is a
no-op. If an item's product row was hard-deleted, the whole transaction fails
instead of losing the adjustment.

## Customer tracking privacy

`track_order()` requires **both** the order number and the phone number used at
checkout. Either value alone is insufficient, and a mismatch is
indistinguishable from an unknown order (generic error). The privacy-safe DTO
contains only:

- order number, status and placed-at time;
- payment method;
- item names, quantities, unit prices and line totals;
- cancellation status and request time;
- courier state, provider status/tracking URL and ETA **only** when a real
  shipment row exists.

It never returns customer name, phone, email, address, order-level
subtotal/delivery/discount/total, confirmation token, cancellation reason or
admin decision note. Phase 9 noted that there is no app-level attempt throttling
for tracking or cancellation; WAF/CDN/proxy limits remain an owner/deployment
decision.

## Confirmation token

A successful COD placement redirects the customer to
`/order-success/[orderNumber]?token=...`. The token in that URL is a bearer
secret for one order:

- a wrong token or order number returns the normal 404 page with no customer
  details;
- the confirmation page is request-rendered and `noindex`;
- `next.config.ts` and `proxy.ts` set `Referrer-Policy: no-referrer` and
  `Cache-Control: private, no-store` for `/order-success/:path*`;
- the token is never included in a tracking result.

Treat confirmation URLs as private. Do not paste them into shared tickets or
logs.

## Verification status

Local static checks and disposable-stack audits previously covered the full
lifecycle, actor-tagged history, cancellation approval/rejection, exactly-once
stock restoration, tracking privacy and RLS denials. These were throwaway
orders on a local stack; no production test was performed. Automated audit
scripts (`npm run audit:orders`, `npm run audit:checkout`,
`npm run audit:phase8`) must never be pointed at production data.
