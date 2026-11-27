# Admin components

UI for the protected Phase 5 admin panel.

Guidelines:

- Server Components by default; add `"use client"` only for interactive UI.
- Reuse primitives from `components/ui`.
- Never import `lib/supabase/admin.ts` into a Client Component.
- Keep data fetching in `services/`; pages pass plain view models into these
  components. Client components call the Server Actions in
  `app/admin/(panel)/actions.ts` or the validated admin API routes.

## Components

| Component               | Responsibility                                      |
| ----------------------- | --------------------------------------------------- |
| `admin-shell.tsx`       | Responsive sidebar/top navigation shell and logout  |
| `admin-nav.tsx`         | Active-link aware admin navigation                  |
| `admin-page-header.tsx` | Shared page title, eyebrow and description          |
| `login-form.tsx`        | Admin/staff sign-in form                            |
| `product-form.tsx`      | Create/edit product fields and validation display   |
| `product-image-manager.tsx` | Multi-image upload, preview, set cover, replace, delete |
| `product-row-actions.tsx`   | Publish/unpublish, edit and delete confirmation     |
| `taxonomy-manager.tsx`  | Brand/category CRUD, status, asset upload and removal |
| `inventory-manager.tsx` | Stock adjustment and change history                 |
| `order-status-control.tsx` | Controlled order status transitions               |
| `order-status-badge.tsx`   | Fulfilment and cancellation status badges          |
| `cancellation-decision.tsx` | Admin approve/reject forms with audit notes        |
