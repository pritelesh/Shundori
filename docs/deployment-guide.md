# Deployment guide

> **Status: Phase 10 preparation only. NOT DEPLOYED.** No deployment has
> happened, there is no production Supabase project, no production credentials
> and no final domain in this workspace. Nothing described here is LIVE.
> Deployment requires the project owner's explicit approval; production testing
> has not been run. Source files are tracked in Git at
> `https://github.com/pritelesh/Shundori.git`; Vercel deployment integration is
> not configured.

## Scope and conventions

- Money is integer poisha; display formatting goes through `formatPrice()`.
- Roles are `customer`, `admin` and `staff`; `admin`/`staff` are privileged and
  there is no self-registration for those roles.
- COD is the only enabled payment method; online payment and courier adapters
  are disabled placeholders.
- Storage buckets (`product-images`, `brand-assets`, `category-assets`,
  `store-assets`) are public, so object URLs bypass RLS.
- Migrations `0001`–`0010` must be applied in filename order.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with
  `NEXT_PUBLIC_` or exposed in a Client Component.

## Checks already run locally

These were run on the local codebase and against a **disposable local Supabase
stack**, not against a production project. The temporary `.env.local`, audit
manifest and throwaway data were removed after the Phase 9 pass.

| Check | Recorded result |
| ----- | --------------- |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed (Next.js 16.4.6; static generation clean) |
| `npm run verify:checkout` | 8/8 |
| `npm run verify:orders` | 6/6 |
| `npm run verify:phase8` | 14/14 |
| `npm run verify:phase9` | 13/13 |
| `npm run verify:phase10` | 8/8 |
| `npm run verify:supabase` | 70/70 executed checks with throwaway sessions; one optional image-reachability check skipped when no valid path remained |
| `node --env-file=.env.local scripts/audit-checkout.mjs` | 13/13, self-cleaning |
| `node --env-file=.env.local scripts/audit-orders.mjs` | 19/19, self-cleaning |
| `PHASE8_KEEP_DATA=1 node --env-file=.env.local scripts/audit-phase8.mjs` | 15/15, retained then cleaned with `npm run cleanup:phase8` |

Browser checks covered storefront, checkout, confirmation token gating,
tracking privacy, all admin sections, image MIME denial, conditional stock
writes, order transitions and logout/login. Responsive checks found no
document-level horizontal overflow. Lighthouse returned accessibility,
best-practices and SEO scores of 1.0 on sampled pages; no production performance
score or Core Web Vitals result exists.

Re-run the static verification commands before any approved deploy. Do **not**
run the live audit scripts against production; they create and delete throwaway
rows and must stay on disposable projects.

Two Phase 10 deployment blockers were found and fixed during preparation:

- A clean build in demo mode failed because offer-price helpers evaluated
  `new Date()` while prerendering. Home, shop, search, category, brand, product
  and product OG-image routes now call `await connection()` before rendering
  prices, so offer windows are evaluated at request time. The final build
  generated all 100 static entries successfully.
- A production-mode smoke request logged repeated "Supabase is not configured"
  errors from `WishlistSync` when no credentials were present.
  `services/wishlist.ts` now returns guest state in demo mode. A subsequent
  `next start` smoke test returned HTTP 200 for `/`, `/shop`, a product page and
  `/order-success/SD-SMOKE` with zero such errors.

## Configuration already in the repository

### `next.config.ts`

- `poweredByHeader: false`, `cacheComponents: true`, `partialPrefetching: true`.
- `allowedDevOrigins: ["127.0.0.1"]` for local development.
- Image `remotePatterns` permit public Storage paths on `*.supabase.co` for all
  four buckets, plus local `127.0.0.1:54321` and `localhost:54321` public paths.
  `dangerouslyAllowLocalIP` is enabled only when `NODE_ENV !== "production"`.
- Security headers on `/:path*`:
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-group=()`.
- In production only, `Strict-Transport-Security:
  max-age=31536000; includeSubDomains` is added.
- Production CSP: `default-src 'self'`, `base-uri 'self'`, `frame-ancestors
  'none'`, `form-action 'self'`, `object-src 'none'`, `script-src 'self'
  'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:
  blob: https://*.supabase.co`, `font-src 'self' data:`, `connect-src 'self'
  https://*.supabase.co`. Development additionally allows `'unsafe-eval'` in
  `script-src`.
- `/order-success/:path*` receives `Referrer-Policy: no-referrer` and
  `Cache-Control: private, no-store`; `proxy.ts` applies the same headers during
  session refresh. The confirmation URL is a bearer secret.

A local `next start` smoke test confirmed the production response headers: CSP,
HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, no
`X-Powered-By`, and `no-referrer` / `private, no-store` on the confirmation path.
This is not a production verification.

### `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build"
}
```

The framework preset and build command are already declared; do not replace the
build with a custom script. `package.json` requires Node `>=20.9.0`.

### `proxy.ts`

`proxy.ts` refreshes Supabase Auth cookies before rendering using the public
URL/anon key. It is session maintenance only; authorization is re-checked in
Server Components and services with `getUser()` and profile role lookups.

## Steps to perform after owner approval

### 1. GitHub

1. Obtain the owner's approval and the owner-supplied GitHub organisation and
   repository. There is no repository or remote configured in this workspace.
2. Initialise/copy this workspace into the approved repository as directed by
   the owner, then push it. Verify that `.env.local`, `.phase8-audit-data.json`
   and any credential files are absent; `.gitignore` ignores `.env*` except
   `.env.example`.
3. Do not commit production URLs, keys, passwords or a final domain until the
   owner supplies them.

### 2. Supabase production setup

1. The owner creates the hosted Supabase project and supplies
   `<project-ref>`, Project URL, anon public key and service-role key through a
   secret store.
2. Apply `supabase/migrations/0001` through `0010` **in filename order**, either
   in **SQL Editor → New query** or with:
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. Run `npm run verify:supabase` with the owner-supplied public values against
   that project if the owner approves; it performs schema/RLS/Storage checks and
   does not create orders. Never run `audit:*` scripts there.
4. Configure **Authentication → URL Configuration** with the owner-supplied
   site URL and redirect URLs (see
   [`environment-variables.md`](environment-variables.md)). Review email
   confirmation, password policy and sign-in rate limits per Phase 9's remaining
   deployment items.
5. Confirm the four Storage buckets and their file limits/MIME rules match the
   migrations. Sensitive files must never go into these public buckets.

### 3. Vercel project and environment

1. Import the owner-supplied GitHub repository into Vercel; accept the detected
   Next.js preset.
2. Root Directory: repository root. Build command: `npm run build` (from
   `vercel.json`). Node.js version: `20.9+`, chosen by the owner.
3. Set these Project Settings → Environment Variables with owner-supplied
   values:

   | Variable | Scope in Vercel |
   | -------- | --------------- |
   | `NEXT_PUBLIC_SITE_URL` | Public; owner's final domain |
   | `NEXT_PUBLIC_SUPABASE_URL` | Public; project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public; anon key, RLS-protected |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Server-only**; never public, never in client code |

4. Do **not** set `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`; `lib/env/server.ts`
   rejects it and `npm run verify:phase9` asserts that no fallback exists. Do
   not set `TEST_*`, `PHASE*_KEEP_DATA` or `ADMIN_*` in Vercel.
5. Never print secrets in build logs or shell transcripts.

### 4. Admin bootstrap

With the production URL/service-role key available only to the authorised
operator, run the bootstrap from a trusted shell (not in Vercel):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = '<owner-supplied-project-url>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
$env:ADMIN_EMAIL = '<owner-supplied-admin-email>'
$env:ADMIN_PASSWORD = '<owner-supplied-unique-password>'
npm run create:admin
```

The script has no default password, requires at least 12 characters, creates the
user with `email_confirm: true`, grants `role = 'admin'`, and stores the password
only in the owner's vault. Create `staff` accounts deliberately; never promote
customer accounts.

### 5. Domain, DNS and SSL

1. The owner supplies `<final-domain>`; no domain is assumed in this repository.
2. In Vercel → Project Settings → Domains, add `<final-domain>` and follow the
   exact DNS records Vercel displays. Do not guess A, CNAME or TXT values.
3. Wait for Vercel to issue/validate the TLS certificate; verify HTTPS with no
   mixed content.
4. Update `NEXT_PUBLIC_SITE_URL` to the owner-approved HTTPS origin and redeploy.
5. Update Supabase Auth site URL and redirect URLs to the same final origin.
6. Confirm sitemap/robots and metadata use the final origin; private routes
   (`/admin/*`, `/track-order`, `/order-success/*`, `/design-preview`) remain
   noindex.

### 6. Final production tests checklist (not yet performed)

- [ ] Owner has explicitly approved the deployment and all remaining Phase 9
      items (rate limits/WAF, CSP/HSTS confirmation, auth settings, monitoring).
- [ ] Static verification re-run after the final commit: typecheck, lint, build,
      `verify:checkout`, `verify:orders`, `verify:phase8`, `verify:phase9`,
      `verify:phase10`.
- [ ] Migrations `0001`–`0010` confirmed applied in order on the owner's project.
- [ ] `verify:supabase` run only if the owner approves; no `audit:*` script run
      against production.
- [ ] `/admin/login` rejects customers and wrong passwords; logout ends the
      session; privileged API routes deny anonymous calls.
- [ ] Product/brand/category edits publish to the storefront and images resolve
      from the public buckets; no sensitive object is uploaded.
- [ ] One owner-approved smoke COD order (if any) uses a throwaway product and
      is fully reconciled/cleaned up; no duplicate order or stock drift.
- [ ] Confirmation URL requires its token and returns `no-referrer` and
      `private, no-store` headers.
- [ ] Tracking with matching order number + phone shows only privacy-safe data;
      a mismatch is generic.
- [ ] Cancellation decisions are exercised only with disposable data; stock
      restoration is exactly-once.
- [ ] Production response headers include HSTS and the documented CSP.
- [ ] Service-role key is absent from all client bundles and no
      `NEXT_PUBLIC_*SERVICE_ROLE*` variable exists.
- [ ] Final domain, DNS, SSL, Supabase Auth URLs and `NEXT_PUBLIC_SITE_URL`
      agree.
- [ ] Monitoring/alerts exist for failed checkouts, coupon abuse, stock
      anomalies and admin auth failures before launch sign-off.

Nothing in this checklist has been executed against production. Keep this
document in "preparation" status until the owner signs off.
