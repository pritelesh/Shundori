-- Shundori Phase 4 — orders and order items with customer/admin-only RLS.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('SD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(trim(customer_name)) > 0),
  customer_phone text not null check (char_length(trim(customer_phone)) > 0),
  customer_email text,
  delivery_address jsonb not null default '{}'::jsonb
    check (jsonb_typeof(delivery_address) = 'object'),
  subtotal integer not null check (subtotal >= 0),
  delivery_charge integer not null default 0 check (delivery_charge >= 0),
  discount integer not null default 0 check (discount >= 0),
  total_amount integer not null check (total_amount >= 0),
  payment_method text not null
    check (payment_method in ('cash_on_delivery', 'bkash', 'nagad', 'card', 'bank_transfer')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed')),
  order_status text not null default 'pending'
    check (order_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  variant_label text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  total_price integer not null check (total_price = unit_price * quantity)
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc);
create index if not exists orders_status_created_idx
  on public.orders (order_status, created_at desc);
create index if not exists order_items_order_idx
  on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select, insert, update, delete on public.orders, public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;

-- Customers see only their own orders. There is no customer insert/update/delete
-- policy: order creation and status/payment changes go through trusted services.
drop policy if exists "Customers can view their own orders" on public.orders;
create policy "Customers can view their own orders"
on public.orders for select to authenticated
using (customer_id = auth.uid());

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
on public.orders for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Customers can view their own order items" on public.order_items;
create policy "Customers can view their own order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.customer_id = auth.uid()
  )
);

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
on public.order_items for all to authenticated
using (public.is_admin())
with check (public.is_admin());
