# Phase 5 — admin dashboard

This guide covers setup, day-to-day use and verification of the Shundori admin
panel. It is intentionally separate from the storefront documentation because
admin operations use the service role key and must never be exposed publicly.

> Current setup note: this phase document is retained for historical context.
> For a new installation, follow [`installation.md`](installation.md),
> [`environment-variables.md`](environment-variables.md) and
> [`deployment-guide.md`](deployment-guide.md). Apply all current migrations
> `0001`–`0010` in filename order and create the first operator with
> `npm run create:admin` using shell-supplied credentials.

## What is implemented

- **Authentication:** `/admin/login` signs in only users whose `profiles.role`
  is `admin` or `staff`. There is no admin self-registration. Sign-out clears
  the Supabase cookie session.
- **Protection:** `/admin/dashboard`, `/admin/products`, `/admin/products/new`,
  `/admin/products/[id]/edit`, `/admin/brands`, `/admin/categories`,
  `/admin/inventory` and `/admin/orders` redirect unauthenticated visitors to
  `/admin/login`. A signed-in customer is redirected to `/admin/unauthorized`.
  Each page repeats the server-side check before querying data, because Cache
  Components can stream the layout and page independently.
- **Authorisation:** every Server Action, API route and admin service calls
  `requireAdmin()` again. RLS policies independently require an `admin` or
  `staff` profile.
- **Dashboard:** statistics are queried from live tables through
  `public.phase5_dashboard_stats()`. `completedOrders` counts delivered orders;
  `totalSales` excludes cancelled/returned orders and refunded payments.
- **Catalogue:** product search, brand/category/stock/status filters, sorting,
  create, edit, delete, publish/unpublish, multiple images, ingredients,
  benefits and usage instructions. New products can only use active brands and
  categories; an existing inactive assignment can be edited but cannot be
  assigned to a different product.
- **Taxonomy:** brand and category create, edit, delete, activate/deactivate and
  logo/image upload, replacement and removal. Uploaded artwork is rendered on
  the storefront when the record is active. Brands or categories in use cannot
  be deleted until their products are moved or deleted.
- **Inventory:** absolute stock adjustments with a reason and a 100-entry
  `inventory_changes` history. Low stock is `1–5`; out of stock is `0`.
- **Orders:** read-only list with server-enforced transitions. `pending` can
  move to `confirmed` or `cancelled`, `confirmed` to `processing` or `cancelled`,
  `processing` to `shipped` or `cancelled`, `shipped` to `delivered` or
  `returned`, and `delivered` to `returned`. `cancelled` and `returned` are
  terminal. Payment status is displayed but cannot be edited here.
- **Publication:** mutations call `revalidatePath("/", "layout")`, so a newly
  published active product, brand or category appears on the storefront without
  a redeploy.
- **Design:** responsive admin shell using the official Shundori tokens —
  Peach Cream `#FFD5AF`, Warm Caramel `#E59A59`, Muted Olive `#888870` and Deep
  Chocolate `#712E1E` — with sidebar, top navigation, summary cards, tables,
  search, forms, modals and toast notifications.

## One-time setup

1. In Supabase, run all migrations in `supabase/migrations/` in numeric order
   (`0001`–`0010`). `0006_admin.sql` is the migration that originally introduced
   the admin dashboard.
2. Put the project URL and anon public key in `.env.local` as
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Put the service role key in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.
   It must never be prefixed with `NEXT_PUBLIC_` or imported by a Client
   Component.
4. Create the first operator with `npm run create:admin`, supplying
   `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` through the shell. Do not use a
   sign-up flow to grant admin rights and do not store a default password in
   source control.
5. The script email-confirms that user and promotes the profile to `admin`. For
   a non-owner operator, set that profile's role to `staff` in Supabase;
   `public.is_admin()` and all admin services treat both roles as privileged.
6. Restart `npm run dev`, then open `/admin/login` and sign in.
7. Optional: run `npm run verify:supabase` with throwaway test credentials in
   `.env.local` to check the schema, RLS and Storage configuration.

If `0006_admin.sql` was applied before the final permission change, rerun its
last two statements:

```sql
revoke all on function public.phase5_dashboard_stats() from public, anon, authenticated;
grant execute on function public.phase5_dashboard_stats() to service_role;
```

## Workflow

1. **Brands and categories first.** Add them at `/admin/brands` and
   `/admin/categories`, upload a logo/image, and keep them active. Uploaded
   artwork appears on the storefront; use the remove button to clear it.
2. **Create a product.** Go to `/admin/products/new`, fill in the required name,
   brand and prices, then add optional SKU, category, description, stock,
   expiry date, ingredients, benefits, usage instructions and featured flag.
   Leave **Active** checked to publish immediately.
3. **Add images.** After the product is created, use the image manager on the
   edit page to upload one or more JPEG/PNG/WebP files up to 5 MB each. Set a
   cover image, replace an existing image or remove it. References are saved as
   Storage paths, not absolute URLs.
4. **Manage stock.** Use `/admin/inventory` for absolute quantity changes. The
   history table records previous quantity, new quantity, reason, actor and
   time. The dashboard flags low and out-of-stock products.
5. **Review orders.** `/admin/orders` lists orders and lets authorised staff
   move order status through the allowed transitions. Payment fields are
   intentionally read-only.
6. **Check the storefront.** Published active products appear in `/shop`,
   search, brand and category pages immediately after revalidation.

## Live test checklist

These checks require real credentials, applied migrations, a throwaway
admin/staff user and seeded data. They have **not** been executed in this
workspace because no Supabase project is configured here.

### Authentication and protection

- [ ] `/admin/login` rejects a wrong password and shows a generic message.
- [ ] A customer account is signed out and cannot enter the panel.
- [ ] An anonymous request to every `/admin/*` panel page redirects to
      `/admin/login`.
- [ ] A signed-in customer redirects to `/admin/unauthorized`.
- [ ] Sign-out from the admin shell ends the session; Back does not reveal
      cached privileged data.
- [ ] A direct POST to an admin Server Action or image API without an admin
      session fails with `401`/`403`.

### Dashboard

- [ ] All eight counters match manual `select count(*)` queries.
- [ ] `totalSales` excludes cancelled/returned orders and refunded payments.
- [ ] Low-stock and out-of-stock lists match the configured thresholds.
- [ ] Recent orders match the `orders` table.

### Products and media

- [ ] Create a product with every optional field; verify values after reload.
- [ ] Edit, search by name/SKU/description, filter by brand/category/status/
      stock and change sort order.
- [ ] Upload multiple images; preview, set cover, replace and remove one.
- [ ] Confirm Storage paths are stored and old files are removed on replace/
      delete.
- [ ] Delete a product with images; confirm both DB row and objects are gone.
- [ ] Publish an active product and confirm automatic appearance on the
      storefront; unpublish and confirm removal.

### Brands and categories

- [ ] Create, edit, activate/deactivate and delete brands and categories.
- [ ] Upload, replace and remove logos/images; confirm old objects are removed.
- [ ] Confirm a brand/category with products cannot be deleted.
- [ ] Confirm active changes appear on public brand/category pages after
      revalidation.

### Inventory

- [ ] Adjust stock up and down; confirm the product quantity and history row.
- [ ] Confirm `0` appears in out-of-stock and `1–5` in low stock.
- [ ] Confirm a customer cannot read `inventory_changes`.

### Orders

- [ ] Confirm orders are visible only to admin/staff.
- [ ] Change status through the UI and verify the database update.
- [ ] Confirm payment status and amount cannot be changed from the admin UI.
- [ ] Confirm a direct Server Action call with an invalid transition is rejected.

## Security notes

- The service role key bypasses RLS and is used only in `lib/supabase/admin.ts`
  after `requireAdmin()` succeeds.
- Public Storage buckets bypass RLS for downloads. Deactivation changes
  storefront visibility but does not invalidate an already-known public URL.
  Delete the image or owning record when immediate revocation is required.
- Every FormData field is explicitly parsed and validated in
  `lib/admin-validation.ts`; UUIDs, emails, integers, calendar-valid dates,
  list lengths and server-side text caps are checked before database writes.
  Admin asset and image APIs call `requireAdmin()` before reading request data.
- Uploaded files are restricted by MIME type and 5 MB size, and stored under
  predictable owner folders that RLS also validates.
- Dashboard statistics are exposed only through a `service_role`-only
  database function; authenticated customers cannot call it directly.
- Admin API failures log the real error server-side but return generic messages
  to clients, so Storage/PostgREST internals are not disclosed.
- Storage cleanup after replacement/deletion is best-effort. If cleanup fails,
  the operation succeeds and the UI shows an explicit cleanup warning; the
  orphaned object can be removed later.

## Local static checks passed after the audit fixes

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Production route sweep for public pages, login/unauthorized pages and every
  admin panel route
- Unauthenticated admin-page streamed redirect checks with
  configured-but-unreachable Supabase values
- Unauthenticated admin asset and product image API denial checks
- Browser checks of desktop and 390px-wide storefront/shop/admin-login layouts
  with no horizontal overflow and no console errors
- Secret scan for accidental `NEXT_PUBLIC_*SERVICE_ROLE*` variables or
  service-role literals in client code
