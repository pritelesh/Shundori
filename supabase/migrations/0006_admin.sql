-- Shundori Phase 5 — admin dashboard support.
-- Adds inventory history and Storage buckets for brand/category artwork.
-- All privileged operations are still gated by public.is_admin() and by the
-- application's requireAdmin() server guard.

create table if not exists public.inventory_changes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  delta integer generated always as (new_quantity - previous_quantity) stored,
  reason text not null default 'manual_adjustment',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_changes_product_created_idx
  on public.inventory_changes (product_id, created_at desc);

alter table public.inventory_changes enable row level security;

revoke all on public.inventory_changes from anon, authenticated;
grant select on public.inventory_changes to authenticated;
grant all on public.inventory_changes to service_role;

drop policy if exists "Admins read inventory changes" on public.inventory_changes;
create policy "Admins read inventory changes"
on public.inventory_changes for select to authenticated
using (public.is_admin());

-- Brand logos and category images live in their own public buckets. Public
-- downloads bypass Storage RLS; only trusted admin services write objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brand-assets', 'brand-assets', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('category-assets', 'category-assets', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Brand assets are public" on storage.objects;
create policy "Brand assets are public"
on storage.objects for select to public
using (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = 'brands'
);

drop policy if exists "Admins manage brand assets" on storage.objects;
create policy "Admins manage brand assets"
on storage.objects for all to authenticated
using (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = 'brands'
  and public.is_admin()
)
with check (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = 'brands'
  and public.is_admin()
  and exists (
    select 1 from public.brands
    where brands.id::text = (storage.foldername(name))[2]
  )
);

drop policy if exists "Category assets are public" on storage.objects;
create policy "Category assets are public"
on storage.objects for select to public
using (
  bucket_id = 'category-assets'
  and (storage.foldername(name))[1] = 'categories'
);

drop policy if exists "Admins manage category assets" on storage.objects;
create policy "Admins manage category assets"
on storage.objects for all to authenticated
using (
  bucket_id = 'category-assets'
  and (storage.foldername(name))[1] = 'categories'
  and public.is_admin()
)
with check (
  bucket_id = 'category-assets'
  and (storage.foldername(name))[1] = 'categories'
  and public.is_admin()
  and exists (
    select 1 from public.categories
    where categories.id::text = (storage.foldername(name))[2]
  )
);

-- One database roundtrip supplies every dashboard statistic. Only trusted
-- service-role code may execute it after requireAdmin(); anon and authenticated
-- customers have no execute permission.
create or replace function public.phase5_dashboard_stats()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'totalProducts', (select count(*)::int from public.products),
    'activeProducts', (select count(*)::int from public.products where is_active),
    'outOfStockProducts', (select count(*)::int from public.products where stock_quantity = 0),
    'lowStockProducts',
      (select count(*)::int from public.products where stock_quantity > 0 and stock_quantity <= 5),
    'totalOrders', (select count(*)::int from public.orders),
    'pendingOrders', (select count(*)::int from public.orders where order_status = 'pending'),
    'completedOrders', (select count(*)::int from public.orders where order_status = 'delivered'),
    'totalSales',
      (select coalesce(sum(total_amount), 0)::bigint from public.orders
       where order_status not in ('cancelled', 'returned')
         and payment_status <> 'refunded')
  );
$$;

revoke all on function public.phase5_dashboard_stats() from public, anon, authenticated;
grant execute on function public.phase5_dashboard_stats() to service_role;
