# Installation (local development)

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Conventions used throughout these guides

- Money is stored as **integer poisha** and formatted for display with
  `formatPrice()` from `utils/format.ts`.
- Profile roles are `customer`, `admin` and `staff`. `admin` and `staff` are
  privileged; there is no admin/staff self-registration.
- Cash on Delivery (`cash_on_delivery`) is the only enabled payment method.
  bKash, Nagad, SSLCommerz and courier adapters are disabled placeholders.
- Storage buckets are `product-images`, `brand-assets`, `category-assets` and
  `store-assets`. These buckets are public: object URLs downloaded through
  `/storage/v1/object/public/...` bypass Row Level Security by design.
- Migrations `0001` through `0010` live in `supabase/migrations/` and must be
  applied in **filename order**.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with
  `NEXT_PUBLIC_`, never import it into a Client Component and never commit it.

## Prerequisites

| Requirement | Source |
| ----------- | ------- |
| Node.js **20.9+** | `engines.node` in `package.json` |
| npm **10+** | README requirements |
| Supabase CLI (local stack only) | `npx supabase ...` or an installed CLI |
| A Supabase project | Needed only for Supabase-backed data; owner supplies it |

No production values are bundled with the repository. All `<...>` placeholders
in this guide (for example `<project-ref>`) must be supplied by the project
owner.

## 1. Install dependencies

```bash
npm install
```

## 2. Create the local environment file

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

`.env.local` is ignored by `.gitignore` (`.env*`, with `.env.example` excepted).
Never commit it or any real credential.

## 3. Start local Supabase and apply migrations

Start the disposable local stack from the repository root:

```bash
npx supabase start
```

The CLI prints the local API URL, anon key and service-role key. Copy those
**local** values into `.env.local`; do not substitute production credentials:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-cli>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key-from-cli>
```

`supabase/config.jsonc` defines the local API on port `54321`, database on
`54322`, Studio on `54323` and the local SMTP UI on `54324`.

Apply all migrations in filename order. With the CLI, reapply the local schema:

```bash
npx supabase db reset
```

Alternatively, in Supabase Studio open **SQL Editor → New query** and run these
files in order:

1. `0001_profiles_and_helpers.sql`
2. `0002_catalog.sql`
3. `0003_orders.sql`
4. `0004_storage.sql`
5. `0005_verification.sql`
6. `0006_admin.sql`
7. `0007_phase6_checkout.sql`
8. `0008_phase7_orders.sql`
9. `0009_order_audit_fixes.sql`
10. `0010_phase8.sql`

For an owner-approved hosted project the equivalent CLI sequence is:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`<project-ref>` is supplied by the owner. Do not run hosted setup against an
unapproved project.

## 4. Create the first administrator

`npm run create:admin` runs `scripts/create-admin.mjs`. It requires
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from `.env.local` or
the shell), and takes the administrator email and password **from the shell
only**. There is no default password. The script creates the user with
`email_confirm: true`, upserts `public.profiles` with `role = 'admin'`, and does
not print the password.

```powershell
$env:ADMIN_EMAIL = '<owner-supplied-admin-email>'
$env:ADMIN_PASSWORD = '<owner-supplied-unique-password>'
npm run create:admin
```

`ADMIN_PASSWORD` must be at least 12 characters and is rejected if it matches
the script's weak-password list. If the email already exists, the script rotates
that user's password using the explicitly supplied value and promotes the
profile. Store the password in the owner's secure vault; do not put
`ADMIN_EMAIL` or `ADMIN_PASSWORD` in `.env.local` or in a commit. `staff` is the
other privileged role; customers must never be promoted for convenience.

See [`admin-guide.md`](admin-guide.md) for panel use and
[`environment-variables.md`](environment-variables.md) for the full variable
list.

## 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`. The admin sign-in path is `/admin/login`.

## 6. Verification commands

Static checks available from `package.json`:

```bash
npm run typecheck      # next typegen && tsc --noEmit
npm run lint           # eslint .
npm run build          # next build
npm run verify:checkout
npm run verify:orders
npm run verify:phase8
npm run verify:phase9
npm run verify:phase10 # checks the operational guides and deployment settings
npm run verify:supabase # needs public Supabase values; reads .env.local when present
```

`verify:checkout`, `verify:orders`, `verify:phase8`, `verify:phase9` and
`verify:phase10` are dependency-free/static checks. `verify:phase10` asserts that
the eight Phase 10 guides exist and that no credential-shaped token was added
to a source file. `verify:supabase` checks schema, RLS, Storage and denials
without creating live orders.

The live audits need all three Supabase keys and must only be run against a
**disposable** local or throwaway project:

```bash
npm run audit:checkout
npm run audit:orders
npm run audit:phase8
```

`PHASE7_KEEP_DATA=1` and `PHASE8_KEEP_DATA=1` retain throwaway audit rows for
browser checks; `npm run cleanup:phase8` removes retained Phase 8 data. Never
use those flags or audits against production.

## Demonstration catalogue behavior

If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both blank,
`services/catalog.ts` serves the clearly labelled Phase 3 demonstration
catalogue from `lib/mock/catalog.ts`:

- Listings are marked `isDemo: true` and show a disclosure notice.
- Artwork is placeholder/CSS artwork, not verified product photography.
- Ingredient, benefit and usage copy is illustrative, not verified claims.
- The build still succeeds and storefront UI can be evaluated.
- `/admin/*` redirects to `/admin/login` (or shows the "not configured" panel
  message when only some configuration is present).

Providing both public values switches reads to live Supabase rows under RLS;
query errors are surfaced rather than silently replaced with demo data.
Production testing has not been run.
