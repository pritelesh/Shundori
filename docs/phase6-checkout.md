# Phase 6 — cart, checkout and COD orders

Phase 6 adds a persistent browser bag and a server-authoritative Cash on
Delivery (COD) checkout. Online payment methods are shown as architecture
placeholders only; no paid or successful online-payment status is simulated.

## Apply the schema

Apply every migration in `supabase/migrations/` in filename order, including the
new `0007_phase6_checkout.sql`. It adds:

- `store_settings` with RLS enabled and **no** anon/authenticated policies. Only
  the service role can read or write it.
- `get_checkout_settings()`, a read-only security-definer function exposing only
  the current delivery charge and discount to the storefront.
- `idempotency_key`, `idempotency_fingerprint` and `confirmation_token` columns
  on `orders`, with unique indexes on the idempotency key and confirmation
  token. Existing orders receive a generated confirmation token.
- `place_cod_order(...)`, executable only by `service_role`. It locks product
  rows, validates stock, recomputes every price from `products`, creates the
  order and items, debits stock, writes an `order_placed` inventory row, and
  deduplicates identical retries — all in one transaction.
- `get_order_confirmation(...)`, executable by anon/authenticated clients but
  returning customer data **only** when both order number and secret token
  match.
- `phase6_checkout_report()`, a metadata-only helper used by the verification
  script.

The service role key stays server-side. It is required for order placement and
admin settings; never prefix it with `NEXT_PUBLIC_`.

## Customer flow

1. `/cart` reads a localStorage bag, refreshes prices/artwork/stock from the
   catalogue, and shows quantity, product subtotal and cart total. Add, remove,
   increase and decrease operations are clamped to available stock.
2. `/checkout` re-quotes the bag from Supabase. The quote shows current unit
   prices, line totals, total quantity, delivery charge, discount and final
   total. Unavailable products and stock reductions are disclosed; the order
   button is disabled until every line is available.
3. The form validates full name, Bangladesh mobile number, optional email,
   division, district, upazila and full address. It submits only product ids and
   quantities plus an idempotency key. Browser prices and totals are never sent
   as order data.
4. `placeCodOrderAction` validates the form again on the server, resolves the
   signed-in user when present (guest checkout is allowed), and calls the atomic
   RPC with the service role.
5. On success the bag is cleared and the browser is redirected to
   `/order-success/[orderNumber]?token=...`. The confirmation page is
   `noindex`, reads `searchParams` and an uncached Supabase RPC, and has no
   `"use cache"` scope, so Cache Components renders it per request. It requires
   the unguessable token in the URL; a wrong token or order number returns the
   normal 404 page without customer details.

Keep the confirmation URL private: anyone holding it can view that order.

## Duplicate prevention

The checkout form generates an idempotency key for an attempt. Repeating the
same request with that key returns the original order rather than creating a
second one. The SQL function serializes attempts with the same key so concurrent
double submissions cannot race on stock. Reusing the key with different customer
or bag details is rejected. The key changes when the bag changes or after a
failed attempt, so a user can correct details without a stale fingerprint
conflict.

## Admin delivery charge

Admin and staff users can open **Settings** in the admin navigation and set the
delivery charge in BDT with up to two decimal places. The value is stored as
integer poisha in `store_settings`. Existing orders retain the charge recorded
when they were placed.

## Payment methods

`lib/payment-methods.ts` is the central registry:

| Method                    | State                                      |
| ------------------------- | ------------------------------------------ |
| `cash_on_delivery`        | Enabled; creates `unpaid` / `pending` order |
| `bkash`, `nagad`          | Disabled placeholder                       |
| `sslcommerz`              | Disabled placeholder                       |

Only enabled methods pass server validation. A future integration should replace
a placeholder with a real gateway flow and a verified callback before any
payment status changes.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:checkout
npm run verify:supabase   # requires live Supabase credentials
```

`npm run verify:checkout` runs dependency-free checks for cart operations,
persisted cart parsing, integer poisha totals, customer/line validation, payment
method gating and the atomic migration's safety invariants. It does **not**
contact a database.

`npm run verify:supabase` additionally checks the Phase 6 schema report, public
checkout settings, anonymous denials on `store_settings` and order placement,
and that an unknown confirmation token reveals nothing. It does not create live
orders.

`npm run audit:checkout` requires the same Supabase credentials plus
`SUPABASE_SERVICE_ROLE_KEY`. It creates a throwaway brand/category/product,
places a real COD order, verifies the order row, order item, stock decrement and
inventory history, checks token gating and anonymous denials, then tests
replay, changed-fingerprint rejection, overselling and concurrent double
submission. It removes all rows it created. A local Supabase stack can be used
with `npx supabase start` and the printed API/anon/service-role keys.

Manual live COD testing in a shared environment still requires a throwaway
product with stock and a guest order:

1. Note the product price, stock and admin delivery charge.
2. Add the product, complete checkout with a throwaway address, and confirm the
   redirect and page contents.
3. Re-submit the same checkout key request (for example by retrying the same
   browser submission before navigation) and confirm only one order exists.
4. In the admin panel, confirm one order, one `order_placed` inventory row and
   the reduced stock, then restore the throwaway product to its original state.
5. Try the confirmation URL with a changed token and confirm a 404 with no
   customer data.

A disposable local Supabase stack was used to execute `npm run verify:supabase`
(50/50 checks) and `npm run audit:checkout` (all checks passed), plus a browser
COD order placed through the real UI. Those throwaway rows were removed and the
delivery charge was restored. A production project still needs its own live
run with throwaway data before deployment.
