# Phase 9 — QA, security, performance and responsive audit

Date: 27 November 2026  
Status: complete; re-verified on 27 November 2026; awaiting approval. No
deployment was performed and Phase 10 was not started.

Phase 9 was an audit and hardening pass only. It added no product, cart,
checkout, auth or admin feature, no schema migration, and no admin navigation
entry. `supabase/migrations/0011_*` was not created and
`components/admin/admin-nav.tsx` has no Phase 9 entry.

At the time of Phase 9, the workspace was not a Git repository, so changes
remained local and uncommitted. An initial repository was configured later.

## Scope

Customer surfaces checked:

- Homepage, `/shop`, category and brand pages, `/search?q=offer`
- Product detail, including offer pricing and JSON-LD
- Cart, coupon application, COD checkout, order confirmation and tracking
- Wishlist, reviews, product enquiries, contact, about, help, privacy and terms

Admin surfaces checked:

- Login, dashboard, product list/new/edit, image upload, brands, categories,
  inventory, orders, settings, reports, coupons, reviews and enquiries
- Privileged mutations: product/image create, brand/category create and delete,
  order status transition, stock adjustment and logout/login

Security, performance, responsive and test-coverage scope were audited as
requested. The original audit used a fresh local Supabase stack with throwaway
suffix `8f098553`. A second full re-verification was run on a fresh stack with
throwaway suffix `b7ee1629`; its results are recorded below.

## Tests performed

### Static and database verification

All checks were run after the final code edits and again during re-verification:

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed — Next.js 16.4.6, 43 static pages generated |
| `npm run verify:phase9` | 13/13 |
| `npm run verify:phase8` | 14/14 |
| `npm run verify:checkout` | 8/8 |
| `npm run verify:orders` | 6/6 |
| `npm run verify:supabase` | 70/70 executed checks with throwaway customer/admin sessions |

The original `verify:supabase` run skipped its authenticated customer/admin
checks because `TEST_*` environment variables were unset; those paths were
exercised through the browser. During re-verification the variables were set
from the throwaway accounts and the authenticated checks passed. One image
reachability check was skipped because, after the valid PNG was deleted, active
products had no valid product-images path; optimisation was checked separately
in the browser.

`scripts/verify-supabase.mjs` was corrected during re-verification. Its
customer product-write denial check updated a nonexistent product id, which
PostgREST reports as a successful zero-row update, producing a false failure.
It now updates a real visible product, accepts either a permission error or zero
updated rows with an unchanged stored price, and re-reads the price. This was a
test-harness defect, not an application authorization failure.

### Live browser checks

Customer checks performed against `http://127.0.0.1:3000`:

- Homepage, `/shop` filters, sorting, search, category and brand pages rendered.
- Search results for `offer` rendered the active offer product.
- Product detail showed `৳700` for the active offer and JSON-LD price `700.00`.
- Cart accepted coupon `WEB8F098553` and applied `−৳140`.
- COD checkout placed order `SD-20261127-CD658E79` with a final `৳1,260` total.
- Confirmation loaded only with its token. Direct/incorrect token checks did not
  expose the order.
- Valid tracking returned the order; invalid tracking returned a generic error.
- After confirming the order, tracking showed `CONFIRMED`, payment method,
  estimated delivery, item line and cancellation controls, without customer
  name, address, phone or grand total in the tracking result.
- Guest wishlist worked through localStorage. No customer login route or UI
  exists; the header `Account` control only shows an “Account area opens at
  launch” notice.
- The review form was absent for an anonymous non-purchaser.
- Product enquiry submission showed `Enquiry sent` and the row was verified in
  `/admin/enquiries` before deletion.
- Contact form submission showed `Preview submitted locally. No message was
  stored or delivered.` No message was stored.

Admin checks performed:

- Admin login, dashboard, products, product new form, brands, categories,
  inventory, orders, settings, reports, coupons, reviews and enquiries were
  reachable.
- A QA product was created and a valid PNG upload succeeded.
- `.txt` upload returned HTTP 400 `{"error":"One or more images are invalid."}`.
- Anonymous upload returned HTTP 401 `{"error":"Sign in to continue."}`.
- Brand and category create/delete worked.
- Order status changed `pending → confirmed`.
- Stock update `8 → 9` succeeded with reason `qa_conditional_write`; the reason
  and new value were visible after reload.
- A customer-role login attempt did not grant admin access.

### Re-verification on a fresh local stack

A second full pass was run after recreating `.env.local` and the local Supabase
stack. It used throwaway suffix `b7ee1629`.

Live database audits:

- `node --env-file=.env.local scripts/audit-checkout.mjs`: 13/13 PASS, covering
  server-calculated prices, idempotency, oversell rejection and concurrent
  submission.
- `node --env-file=.env.local scripts/audit-orders.mjs`: 19/19 PASS, covering the
  status lifecycle, timestamped history, cancellation, stock restoration, RLS
  and confirmation-token gating.
- `PHASE8_KEEP_DATA=1 node --env-file=.env.local scripts/audit-phase8.mjs`:
  15/15 PASS, covering offer windows, coupons, wishlists, reviews, enquiries,
  settings, stock alerts, analytics and privileged RPC denials. Browser data was
  retained for the checks below.

Customer browser re-checks:

- `/`, `/shop`, `/search?q=offer`, category, brand, product, wishlist, contact,
  about, help, privacy and terms pages returned HTTP 200 and rendered.
- Product detail showed `৳700`; JSON-LD price was `700.00`.
- Cart accepted coupon `WEBB7EE1629` and applied `−৳70`.
- COD checkout placed `SD-20261127-04A288BF` with final total `৳630`.
- Confirmation returned `referrer-policy: no-referrer` and
  `cache-control: no-store`. Tracking with the matching order number and phone
  showed status only, while a wrong phone returned the generic failure with no
  customer identity.
- Guest wishlist state persisted across navigation. A product enquiry submitted
  in the browser (`phase9-reaudit-enquiry@example.test`) was visible in
  `/admin/enquiries`.

Admin browser re-checks:

- A customer-role sign-in was denied with “This account is not authorised to use
  the admin dashboard.”
- Admin sign-in succeeded; all 12 admin sections rendered without console
  errors.
- A throwaway product was created (`81ecc375-b12e-4a8a-b4e1-06f588e73ccd`). A
  `.txt` upload returned 400 `{"error":"One or more images are invalid."}`, a
  valid PNG upload returned 200 and was deleted, and an anonymous upload
  returned 401 `{"error":"Sign in to continue."}`.
- A throwaway brand and category were each created and deleted through the UI.
- Inventory stock changed `12 → 13` with reason `phase9_reaudit_conditional`;
  both the value and reason appeared in Recent stock changes.
- Order `SD-20261127-04A288BF` changed `pending → confirmed` with a timestamped
  `admin · from pending` history entry.
- Logout returned to `/admin/login`; immediate re-login restored the dashboard.
- The service-role JWT was absent from all 40 generated client JS bundles. No
  `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` fallback exists, and
  `lib/env/server.ts` rejects one if present.

### Responsive checks

A temporary iframe harness rendered pages at 390, 768, 1280 and 1920 px widths
for the homepage, `/shop`, a product page, `/checkout` and `/admin/inventory`.
No page produced document-level horizontal overflow. The admin mobile nav links
extend past the viewport but the nav container is horizontally scrollable. Home
decorative circles extend right but are clipped and do not create page overflow.

The product gallery was retested at 390 px after patching a throwaway product to
four image paths. All four thumbnails wrapped into two rows inside the viewport:
document scroll width 375 px, client width 375 px, thumbnail group right edge
355 px.

### Lighthouse and trace

The browser Lighthouse integration returned accessibility, best-practices and
SEO scores only. It did not return a performance score, so no performance score
is claimed here.

After the accessibility fixes, homepage, `/shop`, the QA product page,
`/checkout` and `/admin/dashboard` each scored 1.0 for accessibility,
best-practices and SEO, with no reported failures.

Chromium traces were captured in dev mode after the final fixes:

| Page | Trace window | Recorded events | Long tasks | Blocking |
| --- | --- | --- | --- | --- |
| Homepage | 1,904 ms | 5,135 | 1 | 130.680 ms |
| `/shop` | 1,737 ms | 5,187 | 1 | 112.452 ms |
| QA product | 1,947 ms | 5,588 | 2 | 158.985 ms |
| `/checkout` | full 20 s capture window | 7,954 | 1 | 14.575 ms |

These are dev-mode diagnostics, not production Core Web Vitals.

## Bugs found

| ID | Finding | Evidence |
| --- | --- | --- |
| P9-01 | Confirmation links lacked referrer/cache isolation until fixed | Missing `Referer-Policy`/`Cache-Control` on `/order-success/:path*` |
| P9-02 | Local image optimisation only matched one Storage path shape | Other public Supabase asset buckets could fail optimisation |
| P9-03 | Product gallery used plain `<img>` and a non-wrapping thumbnail row | Gallery did not use `next/image`; mobile layout risk with multiple images |
| P9-04 | Below-the-fold product grids preloaded images by default | `priority` was forced for the first cards |
| P9-05 | Public store settings could be fetched repeatedly in one request | No request-scoped deduplication around `getPublicStoreSettings()` |
| P9-06 | Toast context value changed on every provider render | All toast consumers re-rendered for unrelated state changes |
| P9-07 | Admin stock update could overwrite a concurrent change | Update was not conditional on the observed stock value |
| P9-08 | Lighthouse label/contrast failures | `-25%` badge accessible name was `25 percent off`; social link names omitted visible monograms; admin eyebrow `Overview` was low-contrast on the header at 2.42:1 |
| P9-09 | Admin login prerendered a session check | `Date.now()` in Supabase session validation produced a blocking prerender error |
| P9-10 | Transient dev Fast Refresh provider errors appeared after a config restart | `useToast`/`usePreviewStore` outside provider messages; not reproducible on clean reload, so not classified as a stable app bug |
| P9-11 | Test harness gave a false customer-write denial failure during re-verification | `verify:supabase` updated a nonexistent product id; PostgREST treated the zero-row update as success |

## Bugs fixed

| ID | Fix | Verification |
| --- | --- | --- |
| P9-01 | Added `/order-success/:path*` security headers in `next.config.ts` and applied them through `proxy.ts` | Live confirmation response returned HTTP 200 with `referrer-policy: no-referrer` and `cache-control: private, no-store` |
| P9-02 | Widened local Supabase `remotePatterns` to `/storage/v1/object/public/**` | `verify:phase9` covers both `127.0.0.1` and `localhost` patterns |
| P9-03 | Rebuilt `components/products/product-gallery.tsx` with `next/image`, responsive `sizes`, `fill`, `flex-wrap` and `shrink-0` | Browser confirmed `/_next/image?...` requests, correct `sizes`, four thumbnails wrapped at 390 px, no console errors |
| P9-04 | Defaulted grid image `priority` to `false` | `verify:phase9` asserts no forced first-card preload |
| P9-05 | Wrapped `getPublicStoreSettings()` in React `cache` | `verify:phase9` and clean reloads showed no duplicate-fetch regression |
| P9-06 | Memoised the toast provider context value | `verify:phase9` asserts the memoised provider value |
| P9-07 | Made stock writes conditional with retry and matching history value | Live stock change `8 → 9` succeeded with reason `qa_conditional_write`; history reason persisted |
| P9-08 | Fixed badge/social accessible names and changed admin eyebrow to `text-dark-text` | Lighthouse failures cleared; all measured pages scored 1.0 for accessibility |
| P9-09 | Added `await connection()` before `getAdminAccess()` in the admin login Suspense boundary | `verify:phase9` asserts the boundary; clean browser load showed no console or server error |
| P9-11 | Rewrote the customer-write denial check to update a real visible product and verify the stored price stayed unchanged | Final `verify:supabase` run: 70/70 checks passed |

## Remaining issues

The re-verification found no new critical or high-severity issue. These were not
fixed in Phase 9 because they are design/deployment decisions or larger
performance work, not confirmed functional bugs:

- **F-01 — Checkout abuse throttling.** Guest checkout can consume stock and
  coupon redemption capacity without an application-level rate limit or CAPTCHA.
  Server-side price, coupon, stock and idempotency validation all hold; the gap
  is abuse volume. Production WAF/CDN/proxy throttling was not configured or
  tested locally.
- **F-02 — Tracking/cancellation throttling.** Tracking and cancellation use
  order number plus phone. Errors are generic and cancellation is restricted to
  pre-shipment and once per order, but there is no app-level attempt limit.
- **F-05 — Public Storage downloads.** Product, brand, category and store-asset
  buckets are intentionally public, so download RLS is bypassed by design.
  Uploads remain restricted by admin service checks, MIME allowlist and 5 MB
  size limit. Sensitive objects must never be placed in these buckets.
- **Caching and query scaling.** No real `use cache`, `cacheLife()` or
  `cacheTag()` usage was found despite Cache Components being enabled. Header
  search loads the full catalogue per request; listing pages ship the full
  catalogue to the client; the homepage does category/brand count N+1 queries;
  admin taxonomy/list queries are unbounded. These are scalability concerns,
  not correctness failures at the audited dataset size.
- **Dev Fast Refresh observation.** P9-10 was not reproduced after a clean
  reload and should be watched, but no stable fix was justified.
- **Production-only configuration.** CSP/HSTS, WAF/CDN rate limits, Supabase
  Auth settings and monitoring/alerts are outside the local stack and were not
  verified.

## Security findings

No confirmed critical or high-severity authorization bypass, RLS escape, IDOR,
price/coupon manipulation, stock manipulation or upload-path bypass was found.
The fresh re-verification confirmed these protections again, including the
corrected customer product-write denial check.

Confirmed protections:

- `requireAdmin()` gates privileged services and routes.
- Order and wishlist RLS is owner-only; anonymous reads of orders and profiles
  are denied.
- Service-role-only RPCs handle order placement, confirmation, tracking,
  coupons, reviews, enquiries and analytics.
- Prices are recalculated from authoritative database values; coupons are
  validated again inside the placement transaction; stock writes are clamped and
  conditional.
- Confirmation pages require a token and now prevent referrer leakage and
  shared caching.
- Tracking returns generic errors and no customer identity.
- Uploads validate MIME type and are authenticated; direct Storage RLS denies
  anonymous writes.
- Social and WhatsApp URLs are sanitised before render.
- The service-role key remains server-only; no `NEXT_PUBLIC_*` fallback was
  introduced.

## Performance findings

Addressed:

- Product images now use Next.js image optimisation with responsive sizes.
- Below-the-fold images no longer preload.
- Public store settings are deduplicated per request.
- Toast context no longer re-renders all consumers on unrelated updates.
- Stock updates avoid lost writes under concurrency.

Not addressed:

- The header search index still loads the full catalogue per request.
- Listing pages still ship the full catalogue to the client.
- Homepage category/brand counts are N+1.
- Admin taxonomy and list queries are unbounded.
- Checkout is the heaviest client bundle observed in traces; production bundle
  analysis was not run in Phase 9.
- No production Lighthouse performance score or Core Web Vitals result is
  claimed.

## Production readiness

Phase 9 found no blocker that requires a schema migration or a feature change.
The fresh re-verification passed all static, automated, database, auth and core
customer/admin workflow checks recorded above. No critical or high-severity
issue remains from the audit or the re-verification. The app is functionally
ready for a release candidate, but it is not cleared for deployment: the owner
must accept the remaining non-critical issues above and complete the
deployment-only checks below.

1. Configure and verify WAF/CDN/proxy rate limits for checkout, tracking,
   cancellation and login.
2. Confirm production CSP and HSTS headers.
3. Review Supabase Auth password, email-confirmation and session settings.
4. Add monitoring/alerts for failed checkouts, coupon abuse, stock anomalies and
   admin auth failures.
5. Run production Lighthouse/Core Web Vitals. The production build passed, but
   no production performance score is claimed.

No deployment was performed and Phase 10 was not started.

## Cleanup

The original audit data (suffix `8f098553`) was removed before the first report.
The re-verification data (suffix `b7ee1629`) was removed after the final checks:

- Deleted the extra browser enquiry, browser order and QA product from the
  throwaway manifest before cleanup.
- `npm run cleanup:phase8` removed settings 10, logo 1, enquiries 3, reviews 1,
  orders 9, inventory changes 13, coupons 7, products 13, categories 1, brands 1
  and users 3.
- Verified zero matching rows for the QA product id, browser order number/id,
  re-audit enquiry email, suffix coupons/profiles/products and zero Storage
  objects under the QA image/logo prefixes.
- Cleared browser local and session storage; deleted `.env.local` and
  `.phase8-audit-data.json`. Earlier temporary responsive harness files were
  also removed.
- Stopped the dev server and local Supabase stack; ports 3000, 54321, 54323 and
  54324 were no longer listening.
