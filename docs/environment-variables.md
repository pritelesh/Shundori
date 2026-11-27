# Environment variables

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Copy `.env.example` to `.env.local` for local work; `.gitignore` ignores
  `.env*` except `.env.example`. Never commit `.env.local` or any secret.
- Money is integer poisha; formatting is handled by `formatPrice()` in
  `utils/format.ts`.
- Roles are `customer`, `admin` and `staff`; `admin`/`staff` are privileged and
  there is no self-registration for them.
- COD is the only enabled payment method; online payment/courier integrations
  are placeholders.
- Migrations `0001`–`0010` must be applied in filename order.
- Storage buckets (`product-images`, `brand-assets`, `category-assets`,
  `store-assets`) are public, so public object URLs bypass RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never be named
  `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` and must never be printed.

All `<...>` values below must be supplied by the project owner. Local CLI values
are disposable and are not production credentials.

## Variables from `.env.example`

| Variable | Scope | Where read / purpose | Local and production guidance |
| -------- | ----- | -------------------- | ----------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Public | `lib/site.ts`; canonical site URL for metadata and absolute links | `http://localhost:3000` locally. In production set to the owner-approved HTTPS origin `<final-domain>`; invalid values fall back to localhost. This does **not** configure Supabase Auth redirects. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `lib/env/public.ts`, `proxy.ts`, `lib/supabase/{client,server,public}.ts`, verification scripts | Local CLI prints `http://127.0.0.1:54321`. Hosted value is owner-supplied `<project-url>`. Blank with anon key blank serves the labelled demonstration catalogue. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Same public env module and clients; RLS-protected reads | Use the local CLI anon key or owner-supplied hosted anon key. Safe for browser bundles because RLS applies. Blank with URL blank enables demo data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | `lib/env/server.ts` → `lib/supabase/admin.ts`; admin services, atomic COD placement, confirmation, tracking, coupons, reviews, enquiries, analytics and live audit scripts | Required for admin dashboard and server-side COD. Bypasses RLS. Never prefix with `NEXT_PUBLIC_`, never import into a Client Component, never print. In Vercel set it as a server-only environment variable. |

`getSupabaseServiceRoleEnv()` throws if the URL or key is missing, and throws if
it detects `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. `npm run verify:phase9`
asserts that no public fallback exists.

## Optional `TEST_*` verification variables

These appear in `.env.example` and `supabase/README.md` and are read by
`scripts/verify-supabase.mjs`. They enable authenticated checks; without them
those checks are skipped. Use **throwaway users in a non-production project**
only, never real customer credentials.

| Variable | Scope | Where read / purpose |
| -------- | ----- | -------------------- |
| `TEST_CUSTOMER_EMAIL` | Local test only | Authenticated customer checks |
| `TEST_CUSTOMER_PASSWORD` | Local test only | Password for that throwaway customer |
| `TEST_OTHER_ORDER_ID` | Local test only | Cross-customer RLS/order denial check |
| `TEST_ADMIN_EMAIL` | Local test only | Authenticated admin checks |
| `TEST_ADMIN_PASSWORD` | Local test only | Password for that throwaway admin |
| `TEST_PRODUCT_ID` | Local test only | Product/image reachability and customer write-denial checks |

Do not set `TEST_*` in Vercel or in any production shell.

## Audit retention flags (`PHASE*_KEEP_DATA`)

| Variable | Scope | Where read / purpose |
| -------- | ----- | -------------------- |
| `PHASE7_KEEP_DATA` | Local disposable audit only | `scripts/audit-orders.mjs`; when equal to `1`, retains throwaway audit rows instead of deleting them |
| `PHASE8_KEEP_DATA` | Local disposable audit only | `scripts/audit-phase8.mjs`; when equal to `1`, retains throwaway rows for browser checks; `npm run cleanup:phase8` removes them |

Example in PowerShell:

```powershell
$env:PHASE8_KEEP_DATA = '1'
node --env-file=.env.local scripts/audit-phase8.mjs
```

Never use these flags on production. The audits create real orders/catalogue
rows and must be limited to disposable stacks.

## Bootstrap variables for `npm run create:admin`

These are read by `scripts/create-admin.mjs`, are **not** in `.env.example`, and
are supplied through the shell only:

| Variable | Scope | Rules |
| -------- | ----- | ----- |
| `ADMIN_EMAIL` | Trusted operator shell | Valid email address; owner-supplied |
| `ADMIN_PASSWORD` | Trusted operator shell | No default; at least 12 characters; rejected if on the weak-password list; store in the owner's vault |
| `ADMIN_FULL_NAME` | Trusted operator shell | Optional; defaults to `Shundori Administrator` |

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = '<owner-supplied-project-url>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
$env:ADMIN_EMAIL = '<owner-supplied-admin-email>'
$env:ADMIN_PASSWORD = '<owner-supplied-unique-password>'
npm run create:admin
```

The script loads other values from `.env.local` when present but takes the
password only from the shell. It creates the user with `email_confirm: true`,
grants `role = 'admin'`, and prints neither secrets nor the password. Do not put
`ADMIN_EMAIL` or `ADMIN_PASSWORD` in `.env.local`, Vercel, Git or issue reports.

## Site URL vs Supabase Auth redirect URL

`NEXT_PUBLIC_SITE_URL` is read by `lib/site.ts` for static site metadata and
canonical links; the running app falls back to `http://localhost:3000` when it
is absent or invalid. It does not configure Supabase Auth.

Supabase Auth has its own site URL and additional redirect URLs:

- Local `supabase/config.jsonc` uses `http://127.0.0.1:3000` and
  `https://127.0.0.1:3000`.
- For production, the owner must set both in **Supabase Dashboard →
  Authentication → URL Configuration** to the approved `<final-domain>` values.
- Update `NEXT_PUBLIC_SITE_URL` in Vercel to the same HTTPS origin and redeploy.
- Do not invent a domain or redirect URL; the owner supplies them.

## Never set or print

```text
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY   # forbidden; server.ts rejects it
```

Do not run commands such as `echo $env:SUPABASE_SERVICE_ROLE_KEY`, paste tokens
into logs, or attach `.env.local` to a ticket. Use the owner's secret manager and
Vercel's masked environment variables. See
[`backup-guide.md`](backup-guide.md) for secret vaulting and restore cautions.
