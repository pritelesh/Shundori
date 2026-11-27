-- Shundori Phase 4 — brands, categories and products with public read RLS.

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text unique,
  brand_id uuid not null references public.brands(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  short_description text,
  -- Integer poisha, never a floating-point amount.
  regular_price integer not null check (regular_price >= 0),
  sale_price integer check (sale_price >= 0 and sale_price <= regular_price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  -- product-images Storage object paths, in display order.
  images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8),
  ingredients jsonb not null default '[]'::jsonb
    check (jsonb_typeof(ingredients) = 'array'),
  benefits jsonb not null default '[]'::jsonb
    check (jsonb_typeof(benefits) = 'array'),
  usage_instructions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(usage_instructions) = 'array'),
  expiry_date date,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  visual text not null default 'dropper'
    check (visual in ('dropper', 'bottle', 'jar', 'tube', 'compact', 'lipstick', 'perfume', 'mist')),
  tone text not null default 'emerald'
    check (tone in ('pink', 'emerald', 'charcoal', 'cream')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create index if not exists brands_active_name_idx
  on public.brands (is_active, name);
create index if not exists categories_active_parent_idx
  on public.categories (is_active, parent_id);
create index if not exists products_active_featured_idx
  on public.products (is_active, is_featured, created_at desc);
create index if not exists products_category_active_idx
  on public.products (category_id, is_active);
create index if not exists products_brand_active_idx
  on public.products (brand_id, is_active);
create index if not exists products_created_at_idx
  on public.products (created_at desc);

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

revoke all on public.brands, public.categories, public.products from anon, authenticated;
grant select on public.brands, public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.brands, public.categories, public.products to authenticated;
grant all on public.brands, public.categories, public.products to service_role;

-- Public catalogue reads are limited to active records by RLS.
drop policy if exists "Active brands are public" on public.brands;
create policy "Active brands are public"
on public.brands for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage brands" on public.brands;
create policy "Admins manage brands"
on public.brands for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active categories are public" on public.categories;
create policy "Active categories are public"
on public.categories for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
on public.products for select to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all to authenticated
using (public.is_admin())
with check (public.is_admin());
