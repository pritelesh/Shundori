# Supabase setup

Migrations live in `migrations/` and must be applied in filename order. They
are plain SQL, so they can be pasted into the Supabase SQL Editor or applied
with the Supabase CLI once it is installed.

## Apply the schema

1. Create a Supabase project.
2. Open **SQL Editor → New query** and run these files in order:
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
3. Copy the **Project URL** and **anon public key** from
   **Project Settings → API** into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. If you need trusted admin operations, COD order placement, status changes,
   cancellation decisions or customer tracking, add the service
   role key to the same file. It must never be prefixed with `NEXT_PUBLIC_`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```
5. Restart `npm run dev`. Without the two public values the storefront serves
   the clearly labelled Phase 3 demonstration catalogue instead.

### Admin access

The admin panel has no registration form. Create a user in
**Authentication → Users → Add user**, then set that profile's role in the
`public.profiles` table:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Use `role = 'staff'` for a non-owner operator. Both roles pass every admin and
Storage RLS check. Do **not** grant privileged roles to customer accounts.

For the initial administrator, prefer `npm run create:admin` with `ADMIN_EMAIL`
and `ADMIN_PASSWORD` supplied through the shell. The script confirms the email,
sets `email_confirm: true`, promotes the profile to `admin`, and never prints the
password. There is no default password.

The service role key is required by the server-only admin clients. Keep it out
of `NEXT_PUBLIC_*` variables and out of client bundles. If you applied
`0006_admin.sql` before the final dashboard-function permission change, rerun
its last two statements so only `service_role` can execute
`public.phase5_dashboard_stats()`.

See [`../docs/phase5-admin.md`](../docs/phase5-admin.md) for the admin workflow,
[`../docs/phase6-checkout.md`](../docs/phase6-checkout.md) for checkout and order
placement, and [`../docs/phase7-orders.md`](../docs/phase7-orders.md) for the
fulfilment lifecycle, cancellation rules and live test steps.

With the CLI the equivalent is:

```bash
supabase link --project-ref <project-id>
supabase db push
```

## What the migrations create

- `profiles` linked to `auth.users`, with a sign-up trigger, role checks and a
  `public.is_admin()` security-definer helper. Both `admin` and `staff` roles
  are privileged.
- `brands`, `categories` and `products` with integer poisha prices, JSONB
  Storage-path arrays, constraints, indexes and active-record public SELECT
  policies.
- `orders` and `order_items` with customer-owned SELECT policies; writes are
  admin/staff-only. Customers cannot access another customer's order data.
- A public `product-images` Storage bucket. Storage API reads are restricted to
  images attached to active products; writes require an admin/staff profile.
  Allowed types are JPEG, PNG and WebP up to 5 MB.
- `inventory_changes`, with admin/staff-only reads and cascade deletion when a
  product is removed. Product create, edit and inventory adjustments append
  rows here.
- Public `brand-assets` and `category-assets` buckets for logos and category
  images, with admin/staff-only writes restricted to the owning folder.
- `public.phase5_dashboard_stats()`, executable only by `service_role`, which
  returns the dashboard counters in one call. Completed orders are delivered;
  cancelled/returned orders and refunded payments are excluded from sales.
- `store_settings`, protected by RLS with no anon/authenticated policies, plus
  `get_checkout_settings()` for public read-only delivery/discount values.
- `orders.idempotency_key`, `idempotency_fingerprint` and `confirmation_token`
  with unique indexes; `place_cod_order()` for service-role-only atomic COD
  placement; `get_order_confirmation()` for token-gated customer reads.
- `order_status_changes` with an RLS-protected, append-only audit trail written
  by triggers for every order creation and status change. A database trigger
  enforces the same forward-only transition rules as the application.
- `orders.cancellation_*` columns plus `set_order_status()`,
  `request_order_cancellation()`, `decide_order_cancellation()` and
  `track_order()`. All mutating/tracking RPCs are service-role-only; tracking
  requires both order number and phone and returns no customer identity,
  address or total.
- Guarded stock restoration: advisory and row locks, a
  `cancellation_stock_restored` marker and `cancellation_restore` inventory
  history rows make approval idempotent. `0009_order_audit_fixes.sql` also
  blocks status changes while a cancellation is pending and aborts restoration
  when an item's product row has been deleted.
- `courier_shipments` for future Pathao/Steadfast/RedX data. The adapter
  registry is disabled, and no provider status or ETA is synthesised.
- Read-only schema report functions used by the verification script. They return
  metadata only and contain no application rows.

Storage paths must follow `products/<product-uuid>/<filename>`. The image
service in `services/images.ts` enforces this format and performs the admin
role check before uploading, replacing or deleting objects. The catalogue only
renders paths from active products.

> **Public bucket caveat:** anonymous HTTP downloads through
> `/storage/v1/object/public/...` do not evaluate RLS. Anyone with the exact
> URL can fetch the object even if a product, brand or category is later
> deactivated. Deactivate controls storefront visibility; delete the product,
> brand, category or individual image when immediate URL revocation is
> required. Replaced and deleted assets are removed from Storage by the admin
> services.

## Verify connectivity

```bash
npm run verify:supabase
# or
node scripts/verify-supabase.mjs
```

`npm run verify:supabase` loads `.env.local` automatically when it exists and
still accepts real environment variables from CI or a shell.

The script checks connectivity, all nine tables, RLS enablement and policy
names, foreign keys, Storage bucket configuration, active catalogue fetches,
Phase 6 checkout helpers and denials, Phase 7 cancellation columns, status
history indexes, courier columns and anonymous tracking denials, anonymous RLS
denials and, when paths exist, image reachability. It does not use the service
role key or create live orders.

For a disposable project, `npm run audit:orders` uses all three keys to create
throwaway orders and exercise the full lifecycle, cancellation paths,
idempotent stock restoration and tracking privacy, then deletes its own rows.
Never run it against production data.

Optional throwaway credentials enable authenticated checks:

```env
TEST_CUSTOMER_EMAIL=
TEST_CUSTOMER_PASSWORD=
TEST_OTHER_ORDER_ID=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
TEST_PRODUCT_ID=
```

## Generate typed database definitions

Once the schema is live:

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

Then replace the minimal row shapes in `types/database.ts` and remove the
narrow casts in `services/`.
