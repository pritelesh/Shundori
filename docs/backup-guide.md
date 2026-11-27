# Backup guide

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Backups must be arranged by the project owner for an owner-approved Supabase
  project. There is no configured production project in this workspace.
- Money is integer poisha in the database; display formatting uses
  `formatPrice()`. Restores must preserve integer values exactly.
- Roles are `customer`, `admin` and `staff`; only `admin`/`staff` are privileged
  and there is no self-registration for those roles.
- COD is the only enabled payment method; online payments and courier
  integrations are placeholders.
- Migrations `0001`–`0010` must be applied in filename order on any restored
  database.
- Storage buckets are `product-images`, `brand-assets`, `category-assets` and
  `store-assets`. They are public: object URLs bypass RLS, so treat every stored
  object as publicly readable if its exact URL is known.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, never `NEXT_PUBLIC_`, and must
  never be printed or stored in a backup file.

## What needs protecting

| Asset | Where it lives | Notes |
| ----- | -------------- | ----- |
| Database schema and rows | Supabase Postgres | Migrations, catalogue, profiles, orders, history, settings |
| Auth users | Supabase Auth | Admin/staff bootstrap users and any customers |
| Objects | Supabase Storage | Four public buckets; preserve exact paths |
| Environment values | Secret manager / Vercel env | Never in Git or plain documents |
| Admin credentials | Owner's vault | `create:admin` uses shell-only `ADMIN_EMAIL`/`ADMIN_PASSWORD` |

## Database backups

### Supabase dashboard

For an owner-approved hosted project, the owner can use the Supabase dashboard
to export schema/data (SQL Editor or database export tools) and to configure
point-in-time recovery if the project plan provides it. Exact dashboard options
depend on the owner's plan and project; do not assume a backup already exists.

- Record the backup timestamp, project ref and which migrations were applied.
- Keep exports in owner-controlled encrypted storage.
- Do not include service-role keys, passwords or customer exports in a shared
  backup location.

### Supabase CLI (placeholders)

`<project-ref>`, `<backup-file>` and any database URL must be supplied by the
owner. Confirm flags against the installed CLI (`supabase db dump --help`)
before use.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db dump -f <backup-file>.sql
```

A local disposable stack can be dumped without a remote project ref:

```bash
npx supabase db dump --local -f <backup-file>.sql
```

Restoration is **not** an untested production command. `supabase db push` reapplies
pending migrations in filename order and is the documented CLI path for schema
setup:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

That is a migration replay, not a full data restore. A true point-in-time data
restore must follow the owner's Supabase plan/process (dashboard restore or
support-assisted restore). Never overwrite an existing database, reset a remote
project or import an arbitrary dump without explicit owner approval and a tested
plan.

## Storage bucket backups

The application stores references as paths, so a database backup alone is not a
complete backup. Copy objects with their exact paths:

- `product-images`: `products/<product-uuid>/<filename>`
- `brand-assets` and `category-assets`: owner-managed folders used by the admin
  asset routes
- `store-assets`: `store/...` for the store logo and related assets

Use the Supabase Storage dashboard, CLI or an owner-approved S3-compatible
client to download all four buckets. Keep folder structure and MIME types so a
restore can reproduce public URLs. Verify that JPEG/PNG/WebP assets under 5 MB
still satisfy the admin validation rules.

Because these buckets are public, a leaked object cannot be made private by RLS.
Rotate/remove sensitive assets deliberately and purge old copies from backup
storage according to the owner's retention policy.

## Environment values and secrets

- `.env.example` is a template only; `.env.local` is ignored by `.gitignore`
  (`.env*` except `.env.example`) and must never be committed or attached.
- Store `NEXT_PUBLIC_SITE_URL`, public Supabase URL/anon key, and the
  **server-only** `SUPABASE_SERVICE_ROLE_KEY` in the owner's secret manager and
  in Vercel's environment settings. Only the first three may be public.
- `TEST_*` credentials are for throwaway local verification users; never use real
  customer or admin credentials. `PHASE7_KEEP_DATA=1` / `PHASE8_KEEP_DATA=1`
  only retain throwaway audit rows and must never be used in production.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are supplied to `npm run create:admin`
  through the shell only. There is no default password; store the password in
  the vault and never echo it.
- Never print secrets to a terminal transcript, log, screenshot or issue report.
  `create-admin.mjs` deliberately does not print the password.

## Restore drill cautions

- Rehearse restores on a **disposable local or throwaway Supabase project**,
  never on production data.
- Confirm migrations `0001`–`0010` apply in filename order to the restored
  schema, then verify RLS, the four buckets and checkout/order RPCs with the
  local verification commands.
- Check that poisha amounts remain integers and that order status history,
  cancellation markers and confirmation tokens survive the restore.
- Verify that no demo data from `lib/mock/catalog.ts` is mistaken for restored
  live data; the demonstration catalogue only appears when public Supabase
  values are blank.
- Do not delete existing data to "make room" for a restore. Any deletion,
  including audit cleanup, requires the owner's explicit instruction.
- Test a restore of both database and Storage together; broken image paths are
  a silent failure mode if only SQL is restored.

No production backup, restore or deletion has been performed in this workspace.
