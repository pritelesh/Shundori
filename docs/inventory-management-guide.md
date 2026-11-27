# Inventory management guide

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Work at **`/admin/inventory`**; only `admin` and `staff` profiles are allowed.
  Roles are `customer`, `admin` and `staff`, with no self-registration for the
  privileged roles.
- Stock is a whole-number quantity. Money is integer poisha and displayed with
  `formatPrice()`.
- COD is the only enabled payment method. Placing a COD order debits stock
  through the service-role RPC `place_cod_order()`; customers cannot write stock
  directly.
- Migrations `0001`–`0010` must be applied in filename order.
- Storage buckets are public and object URLs bypass RLS;
  `SUPABASE_SERVICE_ROLE_KEY` remains server-only, never `NEXT_PUBLIC_`.

## Adjusting stock

The inventory table lists every product with its current stock, threshold and
availability. Select **Update stock** to open the modal:

1. Enter the **new absolute quantity** (the field is prefilled with the current
   value). This is not a `+/-` delta.
2. Enter a **reason**, at most 60 characters. The default is
   `manual_adjustment`; examples used locally include `restock`, `damaged` and
   `product_update`.
3. Select **Save stock**.

`updateAdminStock()` in `services/admin-products.ts` uses a conditional write to
avoid losing a concurrent change:

- It reads the currently observed quantity.
- It updates only while the stored quantity still equals that observed value.
- It retries with a fresh read up to three times if another write won the race.
- On success it inserts one `inventory_changes` row using the **same observed
  previous quantity**, the new quantity, the reason and the actor id.
- If the quantity is unchanged, no history row is written. After three failed
  attempts, the operator is told to review the quantity and try again.

Creating a product with stock writes a `product_creation` history row; editing
a product with a changed quantity writes `product_update`. COD placement writes
`order_placed`; an approved cancellation writes `cancellation_restore`.

## Recent stock changes

The **Recent stock changes** table shows the newest 100 rows, newest first, with
product name, `previous → new` quantity and signed delta, reason, and timestamp
in Asia/Dhaka time. Deleted products display as "Deleted product" because the
history rows remain after cascade-related product removal. `inventory_changes`
is admin/staff-only under RLS; customers cannot read it.

## Low-stock threshold and alerts

The product form exposes **Low-stock alert threshold** (default `5`, minimum
`0`). The inventory page's summary counts and availability column compare each
product's stock to that product's own threshold:

- `0` — out of stock / unavailable.
- `1` through the threshold — low stock.
- Above the threshold — well stocked (subject to `is_active` for storefront
  availability).

Migration `0010_phase8.sql` creates `public.inventory_alerts` and the
`products_refresh_inventory_alerts` trigger. After an insert or an update of
`stock_quantity` or `low_stock_threshold`, the trigger:

- inserts or retains an `out_of_stock` alert when stock is `0`, and resolves any
  open `low_stock` alert;
- inserts or retains a `low_stock` alert when stock is above `0` and at or below
  the threshold, and resolves any open `out_of_stock` alert;
- resolves all open alerts when stock is above the threshold.

A partial unique index prevents duplicate open alerts per product and type. The
**Open stock alerts** section at the top of `/admin/inventory` shows type,
threshold snapshot, current stock and creation time. **Resolve** sets
`resolved_at` and `resolved_by`; resolved rows remain as an audit trail and are
no longer listed as open.

Note: the older `/admin/products` "Low stock" filter in
`services/admin-products.ts` still uses the fixed constant
`LOW_STOCK_THRESHOLD = 5`; use `/admin/inventory` for per-product thresholds.

## Customer and service boundaries

- Customers have no UI or RLS path to adjust `products.stock_quantity` or read
  `inventory_changes`.
- Checkout re-reads prices and stock on the server; the atomic COD RPC locks
  product rows, rejects overselling and records inventory history.
- Cancellation approval restores stock exactly once under row/advisory locks
  with a `cancellation_stock_restored` marker. If an item's product row was
  hard-deleted, restoration aborts rather than silently losing stock.

## Verification

Disposable local checks already covered conditional writes, history values,
alert creation/resolution and customer write denials. None of this was run
against production. Before any owner-approved production use, repeat the
inventory checks with a throwaway product and restore it afterwards; never edit
live customer data as a test.
