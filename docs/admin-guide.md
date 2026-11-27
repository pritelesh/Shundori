# Admin guide

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Sign in at the absolute site path **`/admin/login`**. There is no public URL
  or domain configured here; the owner supplies the final domain.
- Profile roles are `customer`, `admin` and `staff`. `admin` and `staff` pass
  every admin/Storage RLS check; `customer` does not. There is no admin or staff
  self-registration.
- Money is stored as integer poisha and displayed with `formatPrice()` from
  `utils/format.ts`.
- COD is the only enabled payment method; online payments and courier
  integrations are disabled placeholders.
- Migrations `0001`–`0010` in `supabase/migrations/` must be applied in filename
  order before the panel is usable.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with
  `NEXT_PUBLIC_`.
- Public Storage buckets (`product-images`, `brand-assets`, `category-assets`,
  `store-assets`) allow anonymous downloads through public object URLs; those
  URLs bypass RLS.

## Role model

| Role       | Privileges |
| ---------- | ---------- |
| `customer` | Storefront, own orders, guest-style tracking; no admin panel |
| `admin`    | Full admin panel, privileged services and Storage writes |
| `staff`    | Same privileged checks as `admin` |

`lib/order-status.ts`, `services/authorization.ts` (`requireAdmin()`),
`services/admin-auth.ts` and RLS policies independently enforce the same rule.
Client-supplied role claims are never trusted; the signed-in user's profile is
read on the server. A customer session that attempts admin sign-in is signed
out and rejected with a generic authorisation message.

## Initial administrator

The owner supplies the email and a unique password through the shell. There is
no default password in the repository.

```powershell
$env:ADMIN_EMAIL = '<owner-supplied-admin-email>'
$env:ADMIN_PASSWORD = '<owner-supplied-unique-password>'
npm run create:admin
```

`scripts/create-admin.mjs` reads the Supabase URL and service role key from the
environment or `.env.local`, requires a password of at least 12 characters,
rejects known weak values, creates the user with `email_confirm: true`, and
upserts `public.profiles` with `role = 'admin'`. It prints only the created user
id, email and role — never the password. For an existing email it rotates the
password from `ADMIN_PASSWORD` and promotes the profile. Keep `ADMIN_EMAIL` and
`ADMIN_PASSWORD` out of `.env.local`, source control and chat; store them in the
owner's vault.

Alternative manual setup (documented in `supabase/README.md`) is to add the
user in **Authentication → Users → Add user** and then set the profile role:

```sql
update public.profiles
set role = 'admin'
where email = '<owner-supplied-admin-email>';
```

Use `role = 'staff'` for a non-owner operator. Do not grant either role to
customer accounts.

## Protected pages

Unauthenticated visitors are redirected to `/admin/login`; signed-in customers
are redirected to `/admin/unauthorized`. If public Supabase variables are not
configured, the panel shows a "Admin dashboard is not configured" message. The
panel layout checks access, and each page repeats the check through
`guardAdminPage()` before querying privileged data, because Cache Components can
stream layout and page independently.

| Path | Purpose |
| ---- | ------- |
| `/admin/dashboard` | Counters, low/out-of-stock and recent orders |
| `/admin/products` | Search, filters, publish/unpublish, delete |
| `/admin/products/new` | Create product |
| `/admin/products/[id]/edit` | Edit product and manage images |
| `/admin/brands` | Brand CRUD, activation and logos |
| `/admin/categories` | Category CRUD, activation and images |
| `/admin/inventory` | Stock adjustments, alerts and change history |
| `/admin/orders` | Order list and status transitions |
| `/admin/orders/[id]` | Order detail, history, cancellation decisions |
| `/admin/coupons` | Coupon management |
| `/admin/reviews` | Review moderation |
| `/admin/enquiries` | Enquiry triage |
| `/admin/reports` | Aggregate analytics only |
| `/admin/settings` | Store details and delivery charge |

`/admin/login` and `/admin/unauthorized` are also non-indexed. Every admin page
sets `robots: { index: false, follow: false }`; private pages such as
`/track-order` and `/order-success/[orderNumber]` are noindex as well.

## Daily workflow

1. Create active brands and categories at `/admin/brands` and
   `/admin/categories`.
2. Create products at `/admin/products/new`; add images on the edit page.
3. Adjust stock at `/admin/inventory` using an absolute quantity and a reason.
4. Review `/admin/orders`; advance only allowed statuses and decide pending
   cancellation requests.
5. Use `/admin/settings` for store details and the delivery charge; totals are
   recorded per order and are never edited there.
6. Sign out with the **Logout** button in the admin shell. This calls
   `adminLogoutAction()` → `signOutAdmin()` and redirects to `/admin/login`.

Admin mutations call `revalidatePath("/", "layout")`, so published catalogue
changes appear on the storefront without a redeploy.

## Console and Storage cleanup notes

- Image replacement/deletion and product deletion remove Storage objects on a
  best-effort basis. If cleanup fails, the database operation still succeeds
  and the UI shows a cleanup warning; an orphaned object may need manual
  removal from Supabase Storage by an authorised operator.
- Public bucket URLs bypass RLS. Deactivating a product, brand or category only
  changes storefront visibility; anyone with an exact known object URL can
  still download it. Delete the object or owning record when immediate URL
  revocation is required.
- Browser console errors, failed uploads and API denials should be reported with
  the operator action and timestamp. Error responses are intentionally generic;
  the real detail is logged server-side.
- Do not paste service-role keys, passwords or customer data into console logs,
  issue reports or commits.

## Live verification still required

Local static checks and disposable local Supabase audits passed before this
documentation pass, but no production run occurred. Live checks with
owner-approved credentials still have to verify auth/role denials, Storage
uploads, admin CRUD, publication and order transitions. See
[`deployment-guide.md`](deployment-guide.md) for the deployment checklist.
