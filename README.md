# Shundori

Premium cosmetics and skincare e-commerce for Bangladesh.

> **Phase 10 preparation status:** the Supabase-backed storefront, admin
> dashboard, Cash-on-Delivery checkout, order management, offers, coupons,
> reviews, wishlists and enquiries are implemented and were re-verified on a
> disposable local Supabase stack in Phase 9. Phase 10 adds deployment
> configuration, security headers, an initial-admin bootstrap script and
> operational guides. **No production deployment has been performed, no
> production URL exists, and Phase 10 is not LIVE.** Deployment still needs owner
> approval, production credentials, a chosen domain and production verification.
> See [`docs/phase9.md`](docs/phase9.md),
> [`docs/deployment-guide.md`](docs/deployment-guide.md) and
> [`docs/phase10.md`](docs/phase10.md).

---

## Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)          |
| Language   | TypeScript 5 (strict)                       |
| Styling    | Tailwind CSS 4                              |
| Backend    | Supabase (Postgres, Auth, Storage)          |
| Icons      | Lucide React                                |
| Deployment | Vercel                                      |

Other foundations: `@supabase/ssr` for cookie-based auth, `clsx` +
`tailwind-merge` for class composition, and `server-only` to guard server code.

## Requirements

- Node.js **20.9+**
- npm **10+**
- A Supabase project (only needed once you start using the Supabase clients)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file
#    PowerShell
Copy-Item .env.example .env.local
#    macOS / Linux
cp .env.example .env.local

# 3. Fill in the Supabase values in .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable                        | Scope     | Required | Purpose                                  |
| ------------------------------- | --------- | -------- | ---------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Public    | No       | Canonical site URL for metadata and links |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public    | Yes\*    | Supabase project URL                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public    | Yes\*    | Supabase anonymous key (RLS protected)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server    | No\*\*   | Trusted admin operations; bypasses RLS    |

\* Required for the storefront to read live catalogue data. When both are
blank, the UI serves the labelled demonstration catalogue instead; the build
still succeeds.

\*\* Required by the admin dashboard. Never prefix this key with `NEXT_PUBLIC_`,
never import it into Client Components, and never commit it.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Apply all ten SQL files in `supabase/migrations/` in order, as described in
   [`supabase/README.md`](supabase/README.md). `0006_admin.sql` adds inventory
   history and dashboard statistics; `0007_phase6_checkout.sql` adds checkout
   settings, atomic COD order placement and token-protected confirmation;
   `0008_phase7_orders.sql` adds status history, cancellation decisions,
   guarded stock restoration, courier-ready columns and the tracking RPC;
   `0009_order_audit_fixes.sql` blocks status changes while a cancellation is
   pending and makes missing products abort restoration; `0010_phase8.sql` adds
   offers, coupons, wishlists, reviews, enquiries, settings and alerts.
3. Copy **Project URL** and **anon public key** from
   **Project Settings → API** into `.env.local`.
4. Keep the **service role key** server-side only. Do not add it to Vercel's
   public variables.
5. Restart `npm run dev` and verify the connection:
   ```bash
   npm run verify:supabase
   ```
6. Generate full database types once the schema is live:

   ```bash
   npx supabase gen types typescript --project-id <project-id> > types/database.ts
   ```

   Then replace the narrow row shapes in `types/database.ts` and the casts in
   `services/`.

## Project structure

```text
app/
  (storefront)/          Storefront route group (header + footer layout)
    layout.tsx
    page.tsx             Homepage
    shop/                All products, filters, sorting and load more
    product/[slug]/      Product details and related products
    category/[slug]/     Category collections
    brand/[slug]/        Brand collections
    search/              Search results and empty state
    cart/                Persistent client-side bag
    checkout/            COD checkout form and Server Actions
    order-success/       Token-protected order confirmation
    track-order/         Privacy-safe customer tracking and cancellation
    about/, contact/     Customer-facing information pages
    help/, privacy/, privacy-policy/, terms/   Customer-care pages
    design-preview/      Internal, noindex component catalogue
  admin/                 Admin authentication and protected dashboard
    (auth)/login/        Admin/staff sign-in
    (auth)/unauthorized/ Rejected-role notice
    (panel)/             Protected shell, dashboard, catalogue and orders
    api/                 Validated image and asset upload handlers
  layout.tsx             Root layout, fonts and metadata
  not-found.tsx          Styled global 404 page
  globals.css            Brand tokens, base styles and animations
components/
  ui/                    Buttons, badges, inputs, modal, toast, skeleton,
                         empty state, logo and section headings
  layout/                Header, navigation, search, footer, newsletter, contact
  products/              Product, category and brand cards + CSS artwork
  catalog/               Browser, grid, filters, purchase controls, notices
  cart/                  Persistent bag view with catalogue refresh
  checkout/              COD checkout form
  providers/             localStorage bag and wishlist state
  admin/                 Shell, forms, managers and row actions for admin UI
lib/
  mock/                  Demonstration catalogue and Phase 2 preview data
  catalog-filter.ts      Pure filter/sort helpers shared by server and client
  cart-state.ts          Pure, validated bag operations
  checkout-totals.ts     Integer poisha quote arithmetic
  checkout-validation.ts Customer, cart-line and key validation
  order-status.ts        Six-status lifecycle and transition guards
  order-tracking.ts      Order-number/phone validation and cancellation rules
  courier.ts             Disabled Pathao/Steadfast/RedX adapter registry
  payment-methods.ts     Enabled/disabled payment registry
  supabase/              Browser, server and admin Supabase clients
  env/                   Public and server-only environment access
  site.ts                Static site metadata and contact placeholders
services/
  catalog.ts             Supabase catalogue reads with demo fallback
  authorization.ts       Server-side admin guard
  admin-auth.ts          Admin/staff sign-in, logout and access state
  admin-page-guard.ts    Redirect guard for each protected admin page
  admin-products.ts      Admin product CRUD, filters and inventory history
  admin-taxonomy.ts      Admin brand/category CRUD and product counts
  admin-dashboard.ts     Database-backed dashboard statistics
  admin-assets.ts        Validated brand/category asset uploads
  profiles.ts            Customer profile queries
  orders.ts              Customer/admin order queries, status and decision RPCs
  checkout.ts            Quotes, atomic COD placement and confirmation reads
   order-tracking.ts      Privacy-safe tracking and cancellation RPC calls
  admin-settings.ts      Admin delivery-charge setting
  images.ts              Validated Storage upload/replace/delete
supabase/
  migrations/            Postgres schema, RLS policies and Storage buckets
scripts/
  verify-checkout.mjs    Dependency-free checkout logic checks
   verify-orders.mjs      Dependency-free order lifecycle/security checks
  verify-supabase.mjs    Optional live connectivity/RLS verification
   audit-checkout.mjs     Live COD order/idempotency/stock audit
   audit-orders.mjs       Live fulfilment/cancellation/tracking audit
hooks/                   Reusable client-side hooks
types/                   Domain types (products, cart, orders, customers)
utils/                   Class merging and formatting helpers
public/
  images/                Static image assets
```

### Why a `(storefront)` route group?

The header and footer live in `app/(storefront)/layout.tsx`, not the root
layout. When the admin dashboard is added, it can live in its own route group
with a separate layout and will not inherit the storefront chrome.

## Architecture notes

### Server vs client

- Components are Server Components by default.
- Add `"use client"` only for interactivity or browser APIs.
- `lib/supabase/server.ts` and `lib/supabase/admin.ts` import `server-only`, so
  an accidental client import fails at build time.

### Supabase clients

| Module                    | Use                                                    |
| ------------------------- | ------------------------------------------------------ |
| `lib/supabase/client.ts`  | Client Components; singleton browser client            |
| `lib/supabase/server.ts`  | Server Components, Server Actions, Route Handlers; RLS |
| `lib/supabase/admin.ts`   | Trusted server code only; bypasses RLS                 |

Create a new server client per request. Never cache a server client in a
module-level variable.

### Money

All monetary values are integers in the smallest currency unit (**poisha** for
BDT). This avoids floating-point errors. Use `formatPrice()` from
`utils/format.ts` for display.

### Types

`types/` contains application domain types. `types/database.ts` currently holds
only the minimal row shapes needed by services; replace it with generated
Supabase types once the live schema is available. Services map rows into domain
types and never return raw database records to components.

### Styling and branding

Official palette in `app/globals.css`: Peach Cream `#FFD5AF` for backgrounds,
Warm Caramel `#E59A59` for secondary actions, Muted Olive `#888870` for accents
and badges, and Deep Chocolate `#712E1E` for headings and primary actions.
Neutral tokens are Warm White `#FFFAF5`, Soft Cream `#FFF1E5`, Light Beige
`#F3E6D8` and Dark Text `#3A2923`. Derived tones stay in the token file so
components never hardcode colors. Accent text uses the accessible olive-deep
token instead of the lighter brand olive.

Playfair Display is used for headings and Inter for body and UI text. The
Shundori wordmark is a text placeholder until final logo artwork is approved.

The demonstration catalogue lives only in `lib/mock/catalog.ts` and is used by
`services/catalog.ts` solely when public Supabase credentials are absent. Those
listings are marked `isDemo: true`, show a disclosure notice and use placeholder
artwork. Live Supabase rows are marked `isDemo: false`, use Storage URLs when
available and fall back to placeholder artwork when no image is supplied. Real
image/ingredient/benefit claims are only as accurate as the database content.
`/design-preview`, `/cart`, `/checkout`, `/order-success/*`, `/track-order` and
the `/admin/*` panels are `noindex, nofollow`.

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Create a production build            |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | Run ESLint                           |
| `npm run typecheck` | Generate route types and type-check  |
| `npm run verify:checkout` | Dependency-free checkout logic checks |
| `npm run verify:orders` | Dependency-free order lifecycle/security checks |
| `npm run verify:phase8` | Static Phase 8 workflow/security checks |
| `npm run verify:phase9` | Static Phase 9 regression checks |
| `npm run verify:phase10` | Static Phase 10 deployment-readiness checks |
| `npm run verify:supabase` | Optional live schema/RLS verification |
| `npm run audit:checkout` | Live COD order/items/stock/idempotency audit (needs all three Supabase keys) |
| `npm run audit:orders` | Live fulfilment/cancellation/tracking audit (needs all three Supabase keys) |
| `npm run audit:phase8` | Live offers/coupons/settings audit |
| `npm run cleanup:phase8` | Remove throwaway Phase 8 audit rows |
| `npm run create:admin` | Create or upgrade the initial admin from shell-supplied credentials |

## Deployment (Vercel)

Configuration is prepared, but nothing has been deployed.

- `vercel.json` sets the framework to Next.js and the build command to
  `npm run build`.
- `next.config.ts` adds baseline security headers, including production HSTS and
  a CSP. Order-confirmation routes keep `no-referrer` and `no-store`.
- All price-rendering catalogue routes defer to request time so time-limited
  offers cannot be frozen into a build.
- The approved source repository is `https://github.com/pritelesh/Shundori.git`.
  Vercel integration is not configured; no existing repository was overwritten.

Owner actions still required: supply the production Supabase URL/keys, choose
and purchase the final domain, set Vercel environment variables, connect the
approved GitHub repository, configure DNS/SSL, approve the launch, and run the
production test checklist in [`docs/deployment-guide.md`](docs/deployment-guide.md).
The service role key must be a server-only Vercel variable and must never use a
`NEXT_PUBLIC_` prefix.

## Phase 2 (complete)

- Official brand tokens and typography
- Reusable UI/product/layout components and preview state providers
- Responsive storefront shell, 404, help, privacy and terms pages
- Internal `/design-preview` catalogue with noindex metadata

## Phase 3 (complete)

- Premium responsive homepage with hero, categories, brands, best sellers, new
  arrivals, offers, brand promise and newsletter
- `/shop` with category, brand, price, availability filters, five sort modes and
  Load more
- `/product/[slug]` with placeholder gallery, structured details, quantity
  selector, wishlist, add-to-bag and related products
- `/category/[slug]` and `/brand/[slug]` collections with filtering and sorting
- Functional front-end search with suggestions, results page and empty state
- Client-side bag at `/cart` with quantity updates, removal and subtotal
- `/about`, `/contact`, `/privacy-policy` and `/terms` customer pages
- Centralised, clearly labelled demonstration data behind `services/catalog.ts`
- Typecheck, lint, production build and route verification pass

## Phase 4 (implemented, awaiting live verification)

- PostgreSQL migrations for profiles, brands, categories, products, orders and
  order items, with relationships, constraints and indexes
- RLS: public reads of active catalogue data, customer-private orders and
  admin/staff-only writes; server-side `requireAdmin()` guard for privileged services
- Auth session refresh through `proxy.ts`, profile trigger and browser/server
  Supabase clients
- `product-images` public Storage bucket with active-product paths rendered by
  the app, admin/staff-only API writes and validated upload/replace/delete
  services. Direct public URLs bypass Storage RLS by design.
- Supabase-backed storefront reads for homepage, shop, search, product details,
  category and brand pages, with loading, empty and error states
- Customer profile and order query services; admin/staff-only order status changes
- `npm run typecheck`, `npm run lint` and `npm run build` pass locally
- **Live connectivity, applied migrations, RLS behaviour and Storage access
  have not been verified because no Supabase credentials are configured here.**

## Phase 5 (implemented, awaiting live verification)

- Supabase Auth sign-in/sign-out for `admin` and `staff` profiles, with no
  self-registration and server-side role checks on every panel page and action
- `/admin/dashboard` statistics read from a restricted database function, plus
  low-stock, out-of-stock and recent-order lists from live tables
- `/admin/products` search, filters, sorting, publish/unpublish and deletion;
  full create/edit forms with ingredients, benefits, usage notes and featured
  flags
- Multi-image upload, preview, replace and remove through validated API routes
- Brand and category create/edit/delete, activate/deactivate and image/logo
  upload
- `/admin/inventory` stock adjustment, low/out-of-stock identification and
  `inventory_changes` history
- `/admin/orders` read-only list with controlled status transitions; payment
  fields are never editable
- Responsive Peach Cream / Warm Caramel / Deep Chocolate admin shell with
  sidebar, top navigation, tables, forms, modals and toasts
- Admin mutations call `revalidatePath("/", "layout")` so published catalogue
  changes appear on the storefront without a redeploy
- Typecheck, lint, production build, unauthenticated route redirects and API
  denial checks pass locally. Live Supabase CRUD, Storage, auth and publication
  tests still require credentials.

## Phase 6 (implemented, awaiting live verification)

- Persistent localStorage bag with validated add/remove/quantity operations and
  refreshed catalogue prices, images and stock
- `/checkout` with Bangladesh address validation, live quote, delivery charge and
  final total, plus explicit disabled placeholders for bKash, Nagad and
  SSLCommerz
- Guest-capable COD order placement through one atomic service-role RPC that
  recomputes totals, locks products, checks stock, creates order/items, debits
  stock and records `order_placed` inventory history
- Idempotency keys and fingerprints prevent duplicate orders or reused keys with
  changed details; SQL errors are mapped to generic customer-safe messages
- `/order-success/[orderNumber]` requires a secret token, is request-rendered
  under Cache Components and hides customer data behind a 404 on mismatch
- Admin **Settings** page for the delivery charge, stored as integer poisha
- `npm run verify:checkout` passes locally. `npm run audit:checkout` and
  `npm run verify:supabase` were exercised against a disposable local Supabase
  stack: live COD placement, order/items, stock decrement, oversell rejection,
  duplicate and concurrent-submission deduplication, RLS and token-gated
  confirmation all passed. See [`docs/phase6-checkout.md`](docs/phase6-checkout.md).

## Phase 7 (implemented and verified locally)

- `/admin/orders` shows order number, customer, phone, order date, total,
  payment method, payment status and fulfilment/cancellation status
- `/admin/orders/[id]` shows customer details, delivery address, purchased
  products with quantities and prices, subtotal, delivery charge, discount,
  final total, status history and cancellation decision data
- Forward-only `pending → confirmed → processing → shipped → delivered`
  lifecycle plus controlled `cancelled` transitions, enforced by both services
  and database triggers
- Timestamped status history with `system`, `admin` and `customer` actors;
  existing orders receive a synthetic starting entry without invented history
- `/track-order` requires both order number and checkout phone number and
  returns only a privacy-safe status/items/payment DTO; it is linked from the
  footer and help page
- Customer cancellation requests before shipment, with admin approval/rejection
  and exactly-once stock restoration guarded by row locks and a boolean marker;
  a pending request blocks status advancement until it is decided, direct admin
  cancellation does not fabricate a customer request, and a deleted product
  aborts restoration instead of losing stock
- Courier registry/table for Pathao, Steadfast and RedX with every adapter
  disabled; no tracking state or delivery estimate is invented
- `npm run verify:orders`, `npm run verify:supabase`, `npm run audit:checkout`
  and `npm run audit:orders` passed against a disposable local Supabase stack,
  including the full lifecycle, cancellation paths, inventory consistency and
  tracking privacy. See [`docs/phase7-orders.md`](docs/phase7-orders.md).

## Phase 8 (implemented and verified locally)

- Offer windows, coupons, wishlists, approved-only reviews, enquiries, store
  settings, inventory alerts and aggregate analytics
- Static and live audits passed against a disposable local Supabase stack.
  See [`docs/phase8.md`](docs/phase8.md).

## Phase 9 (re-verified locally)

- QA/security/performance/responsive audit and low-risk hardening only.
- No critical or high-severity issue remained after re-verification. The app is
  a release candidate, not a deployed production site.
  See [`docs/phase9.md`](docs/phase9.md).

## Phase 10 (prepared, awaiting approval and credentials)

- Deployment configuration, production security headers, admin bootstrap
  script, operations guides and static readiness checks added.
- No deployment, no production database changes, no paid services configured,
  no domain invented and no production URLs claimed.
  See [`docs/phase10.md`](docs/phase10.md).

### Still to do (requires approval)

- Connect an approved GitHub repository and Vercel project; deploy only after
  credentials, domain and DNS/SSL are supplied
- Run the full production test checklist and monitoring setup
- Real online payment integrations (bKash, Nagad, SSLCommerz) and verified
  gateway callbacks
- Real courier integrations and provider-supplied tracking/ETA
- Customer account order history UI
- Verified product photography and content seeding
- Production analytics, alerting and CDN/WAF rate-limit verification

## License

Private and proprietary. All rights reserved.
