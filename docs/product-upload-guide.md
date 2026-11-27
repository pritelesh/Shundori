# Product upload guide

> **Status: Phase 10 preparation only.** No deployment has happened. No
> production Supabase project, production credentials or final domain exist, and
> nothing in this workspace is LIVE. Deployment requires the project owner's
> explicit approval; production testing has not been run. Source files are
> tracked in Git at `https://github.com/pritelesh/Shundori.git`.

## Scope and conventions

- Money is stored as integer poisha and displayed with `formatPrice()`; the
  admin form accepts BDT with up to two decimals and converts it server-side
  with `Math.round(taka * 100)`.
- Roles are `customer`, `admin` and `staff`; only `admin`/`staff` may use this
  workflow. There is no self-registration for those roles.
- COD is the only enabled payment method; payment and courier integrations are
  placeholders.
- Migrations `0001`–`0010` must be applied in filename order.
- Product images live in the public `product-images` bucket. Public object URLs
  bypass RLS. `SUPABASE_SERVICE_ROLE_KEY` is server-only and never
  `NEXT_PUBLIC_`.

## Where to work

| Task | Path |
| ---- | ---- |
| List, search, filter, publish/unpublish, delete | `/admin/products` |
| Create | `/admin/products/new` |
| Edit details and manage images | `/admin/products/[id]/edit` |
| Brands and categories first | `/admin/brands`, `/admin/categories` |

New products can only be assigned to **active** brands and categories. An
existing inactive assignment may be kept during an edit, but it cannot be
changed to a different inactive record. A brand/category in use cannot be
deleted until its products are moved or deleted.

## Required fields

The form marks these with `*`:

- **Product name** — required, at most 160 characters; the server generates a
  unique slug.
- **Brand** — required, must exist and be active for a new product.
- **Regular price (BDT)** — required, finite and >= 0.
- **Stock quantity** — required, whole number >= 0. Initial stock creates an
  `inventory_changes` row with reason `product_creation`.

Optional fields:

- SKU (<= 80), category, short description (<= 240), full description (<= 5000),
  expiry date, low-stock alert threshold (default `5`), ingredients, benefits,
  how to use, **Feature this product**, and **Published on the storefront**
  (checked by default for new products).
- Ingredients/benefits/how-to-use accept one entry per line or comma-separated
  entries, at most 40 entries per list and 240 characters per entry.
- **Discount percentage** is read-only: the database derives it from regular
  and sale prices; admin forms never accept it.

Prices and totals are poisha in the database; never enter raw poisha into the
BDT fields. Use `formatPrice()` for any display code.

## Offer fields and effective price

| Field | Rule |
| ----- | ---- |
| Sale price (BDT) | Optional; must be finite, >= 0 and <= regular price |
| Offer starts at | Optional `datetime-local` value, interpreted in Asia/Dhaka wall-clock time |
| Offer ends at | Optional; must be after the start when both are supplied |

The effective price used by the storefront and by the atomic COD placement RPC
is:

1. `salePrice` when a sale price exists **and** the current time is at or after
   the start (if set) and before the end (if set);
2. otherwise `regularPrice`.

Leaving both offer timestamps blank means a sale with no expiry. The regular
price is shown as the compare-at price only while the offer is active. The same
rule is implemented in `lib/offer-pricing.ts` and in
`public.effective_product_price()` inside `place_cod_order()`, so a browser
cannot buy at a display-only price.

## Image rules

- Accepted MIME types: **JPEG, PNG and WebP** only.
- Size: greater than 0 bytes and at most **5 MB** per file (`5242880` bytes).
- Maximum **8 images per product**.
- Object paths follow `products/<product-uuid>/<filename>`; the service
  generates a UUID-prefixed safe filename.
- Images are recorded as Storage paths on the product, not absolute URLs. The
  catalogue renders only paths from active products.

## Uploading and managing images

Images are managed on `/admin/products/[id]/edit` after the product record
exists:

1. **Add images** — choose one or more files; uploads show progress and results
   appear as thumbnails.
2. **Set cover** — moves the chosen image to the first position; the cover is
   labelled `Cover` in the grid.
3. **Replace** — uploads a new file in place and keeps display order stable;
   the previous object is removed on a best-effort basis.
4. **Remove** — asks for confirmation, clears the product path and removes the
   Storage object on a best-effort basis.

These controls call the protected route
`POST /api/admin/products/[id]/images` with intents `upload`, `replace`,
`delete` and `setCover`. Unauthenticated calls are denied; every operation
re-checks `requireAdmin()` and validates ownership of the path.

If a cleanup warning appears, the database change succeeded but the old object
could not be deleted. An authorised operator should remove the orphan from
Supabase Storage later. Do not treat the warning as a failed product save.

## Public bucket behavior

`product-images` is a public bucket so storefront images render without a
service-role key. Anyone with an exact `/storage/v1/object/public/...` URL can
fetch that object even if the product is later unpublished. Deactivation
controls visibility; delete the image or product when immediate revocation is
needed. The same caveat applies to `brand-assets`, `category-assets` and
`store-assets`. Never place sensitive files in these buckets.

## Publication and verification

Published, active products appear on `/shop`, search, category and brand pages
after `revalidatePath("/", "layout")`; no redeploy is needed. Before using real
catalogue data, verify in a disposable local stack that the image paths resolve,
offers switch at their window boundaries, and the product is absent when
unpublished. Production testing has not been run.
