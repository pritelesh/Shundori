# Phase 8 — Advanced storefront features

Phase 8 adds offers, coupons, verified reviews, persistent authenticated
wishlists, configurable business settings, private enquiries, SEO metadata,
inventory alerts and privacy-safe analytics. It is additive: Phase 7 fixes stay
in `0008_phase7_orders.sql` and `0009_order_audit_fixes.sql`, and those two
migrations were not edited.

## Scope

- Additive migration:
  [`0010_phase8.sql`](../supabase/migrations/0010_phase8.sql)
- Customer pages: home, product detail, cart, checkout, wishlist, order success
  and enquiry forms
- Admin pages: `/admin/settings`, `/admin/coupons`, `/admin/reviews`,
  `/admin/enquiries`, `/admin/inventory`, `/admin/reports`
- Static checks: `npm run verify:phase8`, plus the Phase 6/7 checks
- Live audits: `npm run audit:phase8`, plus `audit:checkout` and `audit:orders`

COD remains the only payment method. Phase 8 adds no auth, product, cart or
checkout flow that bypasses the trusted server/database boundary. Phase 9 was
not started.

## Money and pricing invariant

All money remains integer poisha in the database. `utils/format.ts` is the only
place taka is formatted for display.

There is one offer-price rule:

- `lib/offer-pricing.ts` computes storefront quotes and display prices from
  regular price, sale price and the offer window.
- `public.effective_product_price()` applies the same rule inside
  `place_cod_order()`. It is service-role only, so the browser cannot call it
  with a forged price.

`discount_percentage` is a generated database column derived from the regular
and sale prices. Admin forms never accept it as input.

## Coupons

`public.validate_coupon()` checks code, status, start/end window, usage cap and
the order minimum against authoritative database values. Checkout quotes call
it through `getCartQuoteAction({ lines, couponCode })`; order placement repeats
the validation in the database transaction.

`place_cod_order()` gained an eleventh argument,
`p_coupon_code text default null`. A redeemed coupon writes one
`coupon_redemptions` row with the order id, coupon id and poisha discount. The
row lock serialises concurrent use of a limited coupon so the cap cannot be
exceeded. `get_checkout_settings()` still returns discount `0`; discounts are
only produced by the quote and placement paths.

`orderFingerprint()` now includes the coupon code. Replaying an idempotency key
with a different coupon is rejected instead of silently changing the order.

## Reviews

Review eligibility is derived only from delivered, non-cancelled orders. The
service checks `order_items` against `orders`, never a client-supplied flag.
Every submitted review starts `is_approved = false`; only staff can approve or
hide it. Approved-review aggregates are exposed through
`public.product_review_stats()` and contain no customer identity.

During implementation two runtime issues were fixed:

- an invalid `order_items.created_at` reference was removed from the eligibility
  query and sorting was moved into application code;
- admin review listing fetches `profiles.full_name` separately because
  `product_reviews.user_id` references `auth.users`, not `public.profiles`.

Customer moderation attempts return no error but leave the row unchanged; live
audits verify the unchanged database state rather than expecting a thrown
error.

Product pages are prerendered, so baking review eligibility into page props
would expose whichever visitor populated the cache. `ReviewForm` now calls
`getReviewEligibilityAction(productId)` from an effect and renders nothing until
the server action returns that visitor's own eligible delivered order items.
The fresh browser audit confirmed an eligible customer sees the form, a
non-purchaser does not, submitted reviews start unapproved, and approval makes
the review public without exposing customer identity.

## Wishlists

Guests keep wishlist ids in localStorage only. Authenticated customers also
sync through server actions into `public.wishlists`, which has owner-only RLS
and anonymous writes revoked. Removal on `/wishlist` calls
`setWishlistProductAction(product.id, false)` and replaces the local list from
the server result, so local and persisted state agree.

`WishlistSync` calls `await connection()` inside Suspense. Without that request
boundary, Supabase session validation used `Date.now()` during prerender and
React reported a cross-component update error.

## Business settings, links and enquiries

Public store chrome reads one narrow `get_store_settings()` RPC; direct
`store_settings` reads are denied to anon. Admin edits go through service-role
code with validation. `store_logo_path` stores JSON `null` when no logo is set.

WhatsApp and social URLs are normalised before render. Only bundled country
dial codes and safe `tel:`/`https:` targets are accepted. Product enquiries
include only the public product name and store name; order enquiries require
the order secret and never return customer identity to the browser. Direct
enquiry reads are denied to anon and silently empty for non-admin sessions;
admin reads work through RLS.

## SEO and inventory alerts

Product JSON-LD, metadata, robots rules, sitemap and OpenGraph images use
public-safe fields only. Private, demo and tracking pages are not indexed.

Stock threshold changes insert or resolve one open `inventory_alerts` row per
product and alert type. The partial unique index prevents duplicates. Alerts
are readable by admins only; refresh and write functions are privileged.

## Analytics

`public.phase8_analytics_report()` returns aggregates for revenue, orders,
discount and inventory. It is service-role only and returns no names, phones,
emails, addresses or tokens. The admin reports page only renders those
aggregates.

## Next 16 rendering notes

Local Supabase image optimisation needs this dev-only setting in
`next.config.ts`:

```ts
images: { dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production" }
```

Storefront chrome and the shared catalogue helper now defer request-time reads
with `connection()` and `io()` inside Suspense boundaries. This removes the
partial-prerender fetch cancellations and `Date.now()` warnings while keeping
the static shell instant. `allowedDevOrigins: ["127.0.0.1"]` lets local
development reach dev-only assets and Server Actions through either localhost
or 127.0.0.1.

## Verification results (27 November 2026, fresh audit)

Static checks after the final edits:

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run verify:phase8` | 14/14 |
| `npm run verify:supabase` | 61/61 |
| `npm run build` | passed, clean static generation |

Live audits against the local Supabase project:

| Check | Result |
| --- | --- |
| `node --env-file=.env.local scripts/audit-checkout.mjs` | 13/13, self-cleaning |
| `node --env-file=.env.local scripts/audit-orders.mjs` | 19/19, self-cleaning |
| `PHASE8_KEEP_DATA=1 node scripts/audit-phase8.mjs` | 15/15, retained for browser checks |

Browser verification before final cleanup covered:

- Active, future and expired offer windows. The active offer rendered `৳700`
  from `৳1,000` with `-30%` and JSON-LD price `700.00`; the future offer kept
  `৳1,000` and the expired offer kept `৳900`.
- Sanitised product WhatsApp, `tel:` and social links; no private customer data
  in product enquiries. The product enquiry toast rendered "Enquiry sent" and
  the database row matched the browser submission.
- Guest wishlist persistence in localStorage and authenticated wishlist
  insertion/removal in `public.wishlists`.
- Coupon checkout with `WEB3900FDDB`: `−৳100` applied to a `৳1,000` subtotal,
  order `SD-20261127-05B990BA` placed with `discount = 10000` poisha and a
  matching `coupon_redemptions` row.
- Review eligibility from the server action, submission as unapproved,
  admin approval, and public visibility only after approval. Admin reports,
  settings, coupons, reviews, enquiries, inventory and orders were reachable;
  reports showed aggregates with no names, phones or emails.
- Business settings save/read round trip, restored to seeded values; inventory
  alert resolution and stock adjustment persisted with actor-tagged history.
- Metadata, canonical URLs, robots directives, OpenGraph tags and product
  JSON-LD on home, shop, category and product routes.

The earlier checkout mobile overflow fix (`min-w-0` on form grid children) and
responsive checks at 390px and 768px remained intact.

## Cleanup

The retained browser dataset was removed with `npm run cleanup:phase8`. A final
sweep also removed the enquiries and coupon order created directly in the
browser (they were not in the retained-id manifest), cleared the leftover logo
setting and confirmed zero rows for Phase 8 products, categories, brands,
coupons, coupon redemptions, orders, order items, enquiries, reviews, wishlists,
inventory alerts, inventory changes and test users. Business settings now match
their seeded values, with `store_logo_path` absent so the default null logo
applies.

Temporary query/setup scripts, `.env.local`, `.phase8-audit-data.json`, the
local dev server and local Supabase were all removed or stopped. No throwaway
credentials remain in the workspace.
