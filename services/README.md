# Services

Server-side data access layer.

Guidelines:

- One module per domain area, for example `products.ts`, `orders.ts`.
- Wrap Supabase queries here; keep query logic out of components and pages.
- Return domain types from `types/`, not raw database rows.
- Use `createPublicSupabaseClient` for anonymous catalogue reads (RLS enforced,
  cacheable) and `createServerSupabaseClient` for user-specific reads.
- Use `createAdminSupabaseClient` only after `requireAdmin()` succeeds in
  trusted server code.
- Validate and normalise inputs before querying.
- Never import React or browser APIs in this folder.

## Modules

| Module              | Responsibility                                                        |
| ------------------- | --------------------------------------------------------------------- |
| `catalog.ts`        | Products, brands, categories, counts and search index for storefront   |
| `authorization.ts`  | Session verification and server-side admin role guard                  |
| `profiles.ts`       | Customer profile reads and limited self-service updates                |
| `orders.ts`         | Admin detail/history reads and admin-only status/cancellation RPC calls |
| `order-tracking.ts` | Privacy-safe customer tracking and cancellation requests               |
| `images.ts`         | Validated product-image upload, replacement and deletion               |
| `admin-auth.ts`     | Admin/staff sign-in, logout and non-throwing access state              |
| `admin-page-guard.ts` | Page-level redirects before privileged data reads                    |
| `admin-products.ts` | Admin product CRUD, filters, active toggle and inventory history       |
| `admin-taxonomy.ts` | Admin brand/category CRUD, counts and asset cleanup                    |
| `admin-dashboard.ts` | Live dashboard counters and recent orders                              |
| `admin-assets.ts`   | Validated brand/category asset upload and removal                      |
| `parsers.ts`        | JSONB normalisation and placeholder-artwork helpers                    |

`catalog.ts` falls back to `lib/mock/catalog.ts` only when public Supabase
credentials are absent. It is clearly marked as demonstration data in the UI.
When credentials exist, query errors are thrown so they surface in the route
error boundary instead of silently showing mock products.
