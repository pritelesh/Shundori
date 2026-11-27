-- Shundori Phase 8 — offers, coupons, wishlists, reviews, enquiries, business
-- settings, inventory alerts and analytics.
--
-- This migration is additive. Migrations 0001-0009 are immutable and have
-- already been applied in disposable and local databases. Every new table has
-- RLS, an explicit grant surface and metadata-only verification helpers.

-- ---------------------------------------------------------------------------
-- Product offers and per-product stock thresholds
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz,
  add column if not exists discount_percentage integer generated always as (
    case
      when regular_price > 0 and sale_price is not null
        then least(100, greatest(0, floor(
          (regular_price - sale_price)::numeric * 100 / regular_price
        )::integer))
      else 0
    end
  ) stored,
  add column if not exists low_stock_threshold integer not null default 5;

do $$
begin
  alter table public.products
    add constraint products_offer_window_check
    check (sale_starts_at is null or sale_ends_at is null or sale_starts_at < sale_ends_at);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.products
    add constraint products_low_stock_threshold_check
    check (low_stock_threshold >= 0);
exception
  when duplicate_object then null;
end $$;

create index if not exists products_offer_window_idx
  on public.products (is_active, sale_starts_at, sale_ends_at)
  where sale_starts_at is not null or sale_ends_at is not null;

create index if not exists products_stock_threshold_idx
  on public.products (stock_quantity, low_stock_threshold);

create or replace function public.effective_product_price(p_product public.products)
returns integer
language sql
stable
set search_path = public, pg_catalog
as $$
  select case
    when p_product.sale_price is not null
      and (p_product.sale_starts_at is null or p_product.sale_starts_at <= now())
      and (p_product.sale_ends_at is null or p_product.sale_ends_at > now())
    then p_product.sale_price
    else p_product.regular_price
  end;
$$;

revoke all on function public.effective_product_price(public.products)
  from public, anon, authenticated;
grant execute on function public.effective_product_price(public.products)
  to service_role;

-- ---------------------------------------------------------------------------
-- Coupons and redemptions
-- ---------------------------------------------------------------------------

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (
    code = upper(btrim(code)) and code ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'
  ),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  -- Percentage discounts store basis points (1500 = 15%); fixed discounts
  -- store integer poisha. Both are validated against the subtotal.
  discount_value integer not null check (
    discount_value > 0
    and (discount_type <> 'percentage' or discount_value <= 10000)
  ),
  minimum_subtotal_poisha integer not null default 0 check (minimum_subtotal_poisha >= 0),
  maximum_discount_poisha integer check (maximum_discount_poisha >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  redemptions_count integer not null default 0 check (redemptions_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_window_check
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  discount_poisha integer not null check (discount_poisha >= 0),
  created_at timestamptz not null default now()
);

create index if not exists coupons_active_code_idx
  on public.coupons (is_active, code);
create index if not exists coupon_redemptions_coupon_created_idx
  on public.coupon_redemptions (coupon_id, created_at desc);

do $$
begin
  create trigger coupons_set_updated_at
    before update on public.coupons
    for each row execute function public.set_updated_at();
exception
  when duplicate_object then null;
end $$;

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

revoke all on public.coupons from anon, authenticated;
revoke all on public.coupon_redemptions from anon, authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select on public.coupon_redemptions to authenticated;
grant all on public.coupons to service_role;
grant all on public.coupon_redemptions to service_role;

drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons"
  on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read coupon redemptions" on public.coupon_redemptions;
create policy "Admins read coupon redemptions"
  on public.coupon_redemptions for select to authenticated
  using (public.is_admin());

alter table public.orders
  add column if not exists coupon_code text;

create or replace function public.evaluate_coupon(
  p_coupon public.coupons,
  p_subtotal integer
)
returns jsonb
language sql
stable
set search_path = public, pg_catalog
as $$
  select case
    when p_coupon.id is null then
      jsonb_build_object('ok', false, 'message', 'That coupon was not found.')
    when not p_coupon.is_active then
      jsonb_build_object('ok', false, 'message', 'That coupon is not active.')
    when p_coupon.starts_at is not null and p_coupon.starts_at > now() then
      jsonb_build_object('ok', false, 'message', 'That coupon is not active yet.')
    when p_coupon.ends_at is not null and p_coupon.ends_at <= now() then
      jsonb_build_object('ok', false, 'message', 'That coupon has expired.')
    when p_subtotal < p_coupon.minimum_subtotal_poisha then
      jsonb_build_object('ok', false, 'message', 'Your bag does not meet the minimum order amount.')
    when p_coupon.usage_limit is not null
      and p_coupon.redemptions_count >= p_coupon.usage_limit then
      jsonb_build_object('ok', false, 'message', 'That coupon has reached its usage limit.')
    else
      jsonb_build_object(
        'ok', true,
        'code', p_coupon.code,
        'discount', least(
          case
            when p_coupon.discount_type = 'percentage'
              then floor(p_subtotal::numeric * p_coupon.discount_value::numeric / 10000.0)::integer
            else least(p_coupon.discount_value, p_subtotal)
          end,
          coalesce(p_coupon.maximum_discount_poisha, p_subtotal),
          p_subtotal
        )
      )
  end;
$$;

revoke all on function public.evaluate_coupon(public.coupons, integer)
  from public, anon, authenticated;
grant execute on function public.evaluate_coupon(public.coupons, integer)
  to service_role;

create or replace function public.validate_coupon(p_code text, p_subtotal integer)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_coupon public.coupons%rowtype;
begin
  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'
     or coalesce(p_subtotal, 0) < 0 then
    return jsonb_build_object('ok', false, 'message', 'Enter a valid coupon code.');
  end if;

  select * into v_coupon
  from public.coupons
  where code = v_code;

  return public.evaluate_coupon(v_coupon, p_subtotal);
end;
$$;

revoke all on function public.validate_coupon(text, integer)
  from public, anon, authenticated;
grant execute on function public.validate_coupon(text, integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Atomic coupon-aware order placement
-- ---------------------------------------------------------------------------

drop function if exists public.place_cod_order(
  text, text, uuid, text, text, text, jsonb, text, jsonb, uuid
);

create or replace function public.place_cod_order(
  p_idempotency_key text,
  p_idempotency_fingerprint text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_address jsonb,
  p_notes text,
  p_items jsonb,
  p_changed_by uuid,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_coupon public.coupons%rowtype;
  v_coupon_code text := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');
  v_coupon_result jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price integer;
  v_subtotal integer := 0;
  v_delivery_charge integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_seen_ids text[] := '{}';
  v_key text;
  v_image_path text;
begin
  if char_length(btrim(coalesce(p_idempotency_key, ''))) < 16
     or char_length(p_idempotency_key) > 128 then
    raise exception 'A valid checkout request key is required.'
      using errcode = '22023';
  end if;

  if coalesce(length(p_idempotency_fingerprint), 0) <> 64 then
    raise exception 'A valid checkout request fingerprint is required.'
      using errcode = '22023';
  end if;

  if v_coupon_code is not null and v_coupon_code !~ '^[A-Z0-9][A-Z0-9_-]{2,29}$' then
    raise exception 'Enter a valid coupon code.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key)::bigint);

  select * into v_existing
  from public.orders
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.idempotency_fingerprint is distinct from p_idempotency_fingerprint then
      raise exception 'This checkout request was already used for different details.'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'orderId', v_existing.id,
      'orderNumber', v_existing.order_number,
      'confirmationToken', v_existing.confirmation_token,
      'subtotal', v_existing.subtotal,
      'deliveryCharge', v_existing.delivery_charge,
      'discount', v_existing.discount,
      'total', v_existing.total_amount,
      'couponCode', v_existing.coupon_code
    );
  end if;

  if char_length(btrim(coalesce(p_customer_name, ''))) < 2
     or char_length(p_customer_name) > 100 then
    raise exception 'Enter a valid full name.'
      using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_customer_phone, ''))) < 8
     or char_length(p_customer_phone) > 30 then
    raise exception 'Enter a valid phone number.'
      using errcode = '22023';
  end if;

  if p_customer_email is not null and char_length(p_customer_email) > 160 then
    raise exception 'The email address is too long.'
      using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'Delivery notes are too long.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_delivery_address) is distinct from 'object' then
    raise exception 'A complete delivery address is required.'
      using errcode = '22023';
  end if;

  foreach v_key in array array[
    'fullName', 'phone', 'division', 'district', 'upazila', 'addressLine1'
  ] loop
    if char_length(btrim(coalesce(p_delivery_address ->> v_key, ''))) = 0 then
      raise exception 'A complete delivery address is required.'
        using errcode = '22023';
    end if;
  end loop;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Your bag must contain between 1 and 50 items.'
      using errcode = '22023';
  end if;

  -- Products are locked in id order so concurrent checkouts cannot deadlock or
  -- oversell the same stock. Prices use one authoritative offer-aware helper.
  for v_item in
    select value
    from jsonb_array_elements(p_items) as items(value)
    order by value ->> 'productId'
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or coalesce(v_item ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'One or more bag items are invalid.'
        using errcode = '22023';
    end if;

    v_product_id := (v_item ->> 'productId')::uuid;

    if v_product_id::text = any(v_seen_ids) then
      raise exception 'A product can appear only once in a bag.'
        using errcode = '22023';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_product_id::text);

    if jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception 'Invalid quantity in bag.'
        using errcode = '22023';
    end if;

    v_quantity := (v_item ->> 'quantity')::numeric::integer;
    if (v_item ->> 'quantity')::numeric <> v_quantity
       or v_quantity < 1
       or v_quantity > 99 then
      raise exception 'Invalid quantity in bag.'
        using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
    for update;

    if not found or not v_product.is_active then
      raise exception 'One or more products are no longer available.'
        using errcode = '22023';
    end if;

    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for %.' , v_product.name
        using errcode = '22023';
    end if;

    v_unit_price := public.effective_product_price(v_product);
    if v_unit_price < 0 or v_unit_price > 10000000 then
      raise exception 'A product price is invalid.'
        using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    if v_subtotal > 2000000000 then
      raise exception 'The order total is too large.'
        using errcode = '22023';
    end if;
  end loop;

  if v_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where code = v_coupon_code
    for update;

    v_coupon_result := public.evaluate_coupon(v_coupon, v_subtotal);
    if not (v_coupon_result ->> 'ok')::boolean then
      raise exception '%', v_coupon_result ->> 'message'
        using errcode = '22023';
    end if;
    v_discount := (v_coupon_result ->> 'discount')::integer;
  end if;

  select coalesce((value #>> '{}')::integer, 0)
  into v_delivery_charge
  from public.store_settings
  where key = 'delivery_charge_poisha';

  v_delivery_charge := coalesce(v_delivery_charge, 0);
  if v_delivery_charge < 0 or v_delivery_charge > 1000000 then
    raise exception 'The delivery charge setting is invalid.'
      using errcode = '22023';
  end if;

  v_total := v_subtotal + v_delivery_charge - v_discount;
  if v_total < 0 then
    raise exception 'The order total is invalid.'
      using errcode = '22023';
  end if;

  begin
    insert into public.orders (
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      subtotal,
      delivery_charge,
      discount,
      total_amount,
      payment_method,
      payment_status,
      order_status,
      notes,
      idempotency_key,
      idempotency_fingerprint,
      coupon_code
    )
    values (
      p_customer_id,
      btrim(p_customer_name),
      btrim(p_customer_phone),
      nullif(btrim(coalesce(p_customer_email, '')), ''),
      p_delivery_address,
      v_subtotal,
      v_delivery_charge,
      v_discount,
      v_total,
      'cash_on_delivery',
      'unpaid',
      'pending',
      nullif(btrim(coalesce(p_notes, '')), ''),
      p_idempotency_key,
      p_idempotency_fingerprint,
      v_coupon_code
    )
    returning * into v_order;
  exception
    when unique_violation then
      select * into v_existing
      from public.orders
      where idempotency_key = p_idempotency_key;

      if not found
         or v_existing.idempotency_fingerprint is distinct from p_idempotency_fingerprint then
        raise exception 'This checkout request could not be completed.'
          using errcode = '23505';
      end if;

      return jsonb_build_object(
        'orderId', v_existing.id,
        'orderNumber', v_existing.order_number,
        'confirmationToken', v_existing.confirmation_token,
        'subtotal', v_existing.subtotal,
        'deliveryCharge', v_existing.delivery_charge,
        'discount', v_existing.discount,
        'total', v_existing.total_amount,
        'couponCode', v_existing.coupon_code
      );
  end;

  if v_coupon_code is not null then
    insert into public.coupon_redemptions (
      coupon_id, order_id, customer_id, discount_poisha
    )
    values (v_coupon.id, v_order.id, p_customer_id, v_discount);

    update public.coupons
    set redemptions_count = redemptions_count + 1
    where id = v_coupon.id;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items) as items(value)
    order by value ->> 'productId'
  loop
    v_product_id := (v_item ->> 'productId')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric::integer;

    select * into v_product
    from public.products
    where id = v_product_id;

    v_image_path := case
      when jsonb_typeof(v_product.images) = 'array'
           and jsonb_array_length(v_product.images) > 0
      then v_product.images ->> 0
      else null
    end;

    v_unit_price := public.effective_product_price(v_product);

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      variant_label,
      unit_price,
      quantity,
      total_price
    )
    values (
      v_order.id,
      v_product_id,
      v_product.name,
      v_image_path,
      null,
      v_unit_price,
      v_quantity,
      v_unit_price * v_quantity
    );

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product_id
      and stock_quantity >= v_quantity;

    if not found then
      raise exception 'Insufficient stock for %.' , v_product.name
        using errcode = '22023';
    end if;

    insert into public.inventory_changes (
      product_id,
      previous_quantity,
      new_quantity,
      reason,
      changed_by
    )
    values (
      v_product_id,
      v_product.stock_quantity,
      v_product.stock_quantity - v_quantity,
      'order_placed',
      p_changed_by
    );
  end loop;

  return jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'confirmationToken', v_order.confirmation_token,
    'subtotal', v_order.subtotal,
    'deliveryCharge', v_order.delivery_charge,
    'discount', v_order.discount,
    'total', v_order.total_amount,
    'couponCode', v_order.coupon_code
  );
end;
$$;

revoke all on function public.place_cod_order(
  text, text, uuid, text, text, text, jsonb, text, jsonb, uuid, text
) from public, anon, authenticated;
grant execute on function public.place_cod_order(
  text, text, uuid, text, text, text, jsonb, text, jsonb, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Persistent wishlists (authenticated customers; guests keep localStorage)
-- ---------------------------------------------------------------------------

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_user_product_key unique (user_id, product_id)
);

create index if not exists wishlists_user_created_idx
  on public.wishlists (user_id, created_at desc);

alter table public.wishlists enable row level security;
revoke all on public.wishlists from anon, authenticated;
grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

drop policy if exists "Customers view their wishlist" on public.wishlists;
create policy "Customers view their wishlist"
  on public.wishlists for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers add to wishlist" on public.wishlists;
create policy "Customers add to wishlist"
  on public.wishlists for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers remove from wishlist" on public.wishlists;
create policy "Customers remove from wishlist"
  on public.wishlists for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Verified-purchase product reviews
-- ---------------------------------------------------------------------------

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_one_per_item unique (product_id, user_id, order_item_id)
);

create index if not exists product_reviews_public_idx
  on public.product_reviews (product_id, is_approved, created_at desc);
create index if not exists product_reviews_user_idx
  on public.product_reviews (user_id, created_at desc);
create index if not exists product_reviews_moderation_idx
  on public.product_reviews (is_approved, created_at desc);

do $$
begin
  create trigger product_reviews_set_updated_at
    before update on public.product_reviews
    for each row execute function public.set_updated_at();
exception
  when duplicate_object then null;
end $$;

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from anon, authenticated;
grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to authenticated;
grant all on public.product_reviews to service_role;

-- Verified eligibility is derived only from delivered, non-cancelled orders.
create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product_id
      and o.customer_id = auth.uid()
      and o.order_status = 'delivered'
      and coalesce(o.cancellation_status, 'none') not in ('requested', 'approved')
      and not exists (
        select 1 from public.product_reviews r where r.order_item_id = oi.id
      )
  );
$$;

revoke all on function public.can_review_product(uuid)
  from public, anon;
grant execute on function public.can_review_product(uuid)
  to authenticated, service_role;

drop policy if exists "Approved reviews are public" on public.product_reviews;
create policy "Approved reviews are public"
  on public.product_reviews for select to anon, authenticated
  using (is_approved);

drop policy if exists "Customers see their own reviews" on public.product_reviews;
create policy "Customers see their own reviews"
  on public.product_reviews for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins moderate reviews" on public.product_reviews;
create policy "Admins moderate reviews"
  on public.product_reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Verified customers submit reviews" on public.product_reviews;
create policy "Verified customers submit reviews"
  on public.product_reviews for insert to authenticated
  with check (
    auth.uid() = user_id
    and is_approved = false
    and public.can_review_product(product_id)
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and oi.product_id = product_reviews.product_id
        and o.id = order_id
        and o.customer_id = auth.uid()
        and o.order_status = 'delivered'
    )
  );

drop policy if exists "Customers delete their own reviews" on public.product_reviews;
create policy "Customers delete their own reviews"
  on public.product_reviews for delete to authenticated
  using (auth.uid() = user_id and not is_approved);

create or replace function public.product_review_stats()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select jsonb_object_agg(
        product_id::text,
        jsonb_build_object('rating', round(avg_rating::numeric, 1), 'reviewCount', review_count)
      )
      from (
        select product_id, avg(rating)::numeric as avg_rating, count(*)::integer as review_count
        from public.product_reviews
        where is_approved
        group by product_id
      ) stats
    ),
    '{}'::jsonb
  );
$$;

revoke all on function public.product_review_stats()
  from public;
grant execute on function public.product_review_stats()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Store assets and public business settings
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets', 'store-assets', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Store assets are public" on storage.objects;
create policy "Store assets are public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'store-assets' and (storage.foldername(name))[1] = 'store');

drop policy if exists "Admins manage store assets" on storage.objects;
create policy "Admins manage store assets"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'store'
    and public.is_admin()
  )
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = 'store'
    and public.is_admin()
  );

insert into public.store_settings (key, value) values
  ('store_name', '"Shundori"'::jsonb),
  ('store_logo_path', 'null'::jsonb),
  ('contact_number', '""'::jsonb),
  ('whatsapp_number', '""'::jsonb),
  ('whatsapp_enabled', 'false'::jsonb),
  ('contact_email', '""'::jsonb),
  ('social_links', '{}'::jsonb),
  ('currency', '"BDT"'::jsonb),
  ('store_description', '"Premium cosmetics and skincare, thoughtfully curated in Bangladesh."'::jsonb)
on conflict (key) do nothing;

create or replace function public.get_store_settings()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'storeName', coalesce((select value #>> '{}' from public.store_settings where key = 'store_name'), 'Shundori'),
    'storeLogoPath', (select value #>> '{}' from public.store_settings where key = 'store_logo_path'),
    'contactNumber', coalesce((select value #>> '{}' from public.store_settings where key = 'contact_number'), ''),
    'whatsappNumber', coalesce((select value #>> '{}' from public.store_settings where key = 'whatsapp_number'), ''),
    'whatsappEnabled', coalesce((select value #>> '{}' from public.store_settings where key = 'whatsapp_enabled')::boolean, false),
    'contactEmail', coalesce((select value #>> '{}' from public.store_settings where key = 'contact_email'), ''),
    'socialLinks', coalesce((select value from public.store_settings where key = 'social_links'), '{}'::jsonb),
    'currency', coalesce((select value #>> '{}' from public.store_settings where key = 'currency'), 'BDT'),
    'storeDescription', coalesce((select value #>> '{}' from public.store_settings where key = 'store_description'), '')
  );
$$;

revoke all on function public.get_store_settings() from public;
grant execute on function public.get_store_settings()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Product and order enquiries
-- ---------------------------------------------------------------------------

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('product', 'order', 'contact')),
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 100),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 8 and 30),
  customer_email text check (customer_email is null or char_length(customer_email) <= 160),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enquiries_status_created_idx
  on public.enquiries (status, created_at desc);

do $$
begin
  create trigger enquiries_set_updated_at
    before update on public.enquiries
    for each row execute function public.set_updated_at();
exception
  when duplicate_object then null;
end $$;

alter table public.enquiries enable row level security;
revoke all on public.enquiries from anon, authenticated;
grant select, update on public.enquiries to authenticated;
grant all on public.enquiries to service_role;

drop policy if exists "Admins read enquiries" on public.enquiries;
create policy "Admins read enquiries"
  on public.enquiries for select to authenticated
  using (public.is_admin());

create or replace function public.create_product_enquiry(
  p_product_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_message text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := btrim(coalesce(p_customer_phone, ''));
  v_email text := nullif(btrim(coalesce(p_customer_email, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
begin
  if not exists (select 1 from public.products where id = p_product_id and is_active) then
    raise exception 'That product is not available.'
      using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 100
     or char_length(v_phone) not between 8 and 30
     or char_length(v_message) not between 10 and 2000
     or (v_email is not null and char_length(v_email) > 160) then
    raise exception 'Check your details and try again.'
      using errcode = '22023';
  end if;

  insert into public.enquiries (
    source, product_id, customer_name, customer_phone, customer_email, message
  )
  values ('product', p_product_id, v_name, v_phone, v_email, v_message);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.create_order_enquiry(
  p_order_number text,
  p_customer_phone text,
  p_message text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_number text := upper(btrim(coalesce(p_order_number, '')));
  v_compact text := replace(replace(replace(btrim(coalesce(p_customer_phone, '')), ' ', ''), '-', ''), '(', '');
  v_local text := regexp_replace(replace(v_compact, ')', ''), '^\+?88', '');
  v_message text := btrim(coalesce(p_message, ''));
  v_order public.orders%rowtype;
begin
  if v_number !~ '^SD-[0-9]{8}-[A-Z0-9]{8}$'
     or v_local !~ '^01[3-9][0-9]{8}$'
     or char_length(v_message) not between 10 and 2000 then
    raise exception 'Check your order number, phone and message.'
      using errcode = '22023';
  end if;

  select * into v_order
  from public.orders o
  where o.order_number = v_number
    and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = v_local;

  if not found then
    -- The same generic error avoids confirming whether an order exists.
    raise exception 'Check your order number, phone and message.'
      using errcode = '22023';
  end if;

  insert into public.enquiries (
    source, order_id, customer_name, customer_phone, message
  )
  values (
    'order', v_order.id, v_order.customer_name, v_order.customer_phone, v_message
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.create_product_enquiry(uuid, text, text, text, text)
  from public;
grant execute on function public.create_product_enquiry(uuid, text, text, text, text)
  to anon, authenticated, service_role;

revoke all on function public.create_order_enquiry(text, text, text)
  from public;
grant execute on function public.create_order_enquiry(text, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Stock alert lifecycle
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  alert_type text not null check (alert_type in ('low_stock', 'out_of_stock')),
  threshold_snapshot integer not null check (threshold_snapshot >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create unique index if not exists inventory_alerts_open_unique
  on public.inventory_alerts (product_id, alert_type)
  where resolved_at is null;

create index if not exists inventory_alerts_open_created_idx
  on public.inventory_alerts (resolved_at, created_at desc);

alter table public.inventory_alerts enable row level security;
revoke all on public.inventory_alerts from anon, authenticated;
grant select on public.inventory_alerts to authenticated;
grant all on public.inventory_alerts to service_role;

drop policy if exists "Admins read inventory alerts" on public.inventory_alerts;
create policy "Admins read inventory alerts"
  on public.inventory_alerts for select to authenticated
  using (public.is_admin());

create or replace function public.refresh_inventory_alerts()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
begin
  if new.stock_quantity = 0 then
    insert into public.inventory_alerts (product_id, alert_type, threshold_snapshot)
    values (new.id, 'out_of_stock', new.low_stock_threshold)
    on conflict (product_id, alert_type) where resolved_at is null do nothing;

    update public.inventory_alerts
    set resolved_at = now()
    where product_id = new.id
      and alert_type = 'low_stock'
      and resolved_at is null;
  elsif new.stock_quantity <= new.low_stock_threshold then
    insert into public.inventory_alerts (product_id, alert_type, threshold_snapshot)
    values (new.id, 'low_stock', new.low_stock_threshold)
    on conflict (product_id, alert_type) where resolved_at is null do nothing;

    update public.inventory_alerts
    set resolved_at = now()
    where product_id = new.id
      and alert_type = 'out_of_stock'
      and resolved_at is null;
  else
    update public.inventory_alerts
    set resolved_at = now()
    where product_id = new.id
      and resolved_at is null;
  end if;

  return new;
end;
$$;

revoke all on function public.refresh_inventory_alerts() from public, anon, authenticated;

drop trigger if exists products_refresh_inventory_alerts on public.products;
create trigger products_refresh_inventory_alerts
  after insert or update of stock_quantity, low_stock_threshold on public.products
  for each row execute function public.refresh_inventory_alerts();

insert into public.inventory_alerts (product_id, alert_type, threshold_snapshot)
select
  p.id,
  case when p.stock_quantity = 0 then 'out_of_stock' else 'low_stock' end,
  p.low_stock_threshold
from public.products p
where p.stock_quantity <= p.low_stock_threshold
on conflict (product_id, alert_type) where resolved_at is null do nothing;

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
      (select count(*)::int from public.products
       where stock_quantity > 0 and stock_quantity <= low_stock_threshold),
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

-- ---------------------------------------------------------------------------
-- Business analytics (never exposes customer identity)
-- ---------------------------------------------------------------------------

create or replace function public.phase8_analytics_report(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  v_from date := coalesce(p_from, (current_date - interval '365 days')::date);
  v_to date := coalesce(p_to, current_date);
  v_result jsonb;
begin
  if v_to < v_from then
    raise exception 'The analytics end date must not precede the start date.'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'totals', coalesce(
      (
        select jsonb_build_object(
          'totalSales', coalesce(sum(o.total_amount), 0)::bigint,
          'orders', count(*)::integer,
          'averageOrderValue', coalesce(round(sum(o.total_amount)::numeric / nullif(count(*), 0), 0), 0)::bigint,
          'discountTotal', coalesce(sum(o.discount), 0)::bigint
        )
        from public.orders o
        where o.created_at >= v_from::timestamptz
          and o.created_at < (v_to + 1)::timestamptz
          and o.order_status not in ('cancelled', 'returned')
          and o.payment_status <> 'refunded'
      ),
      jsonb_build_object('totalSales', 0, 'orders', 0, 'averageOrderValue', 0, 'discountTotal', 0)
    ),
    'bestSellingProducts', coalesce(
      (
        select jsonb_agg(entry order by entry ->> 'revenue' desc)
        from (
          select jsonb_build_object(
            'productId', oi.product_id,
            'name', coalesce(pr.name, oi.product_name),
            'quantitySold', sum(oi.quantity)::bigint,
            'revenue', sum(oi.total_price)::bigint
          ) as entry
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
          left join public.products pr on pr.id = oi.product_id
          where o.created_at >= v_from::timestamptz
            and o.created_at < (v_to + 1)::timestamptz
            and o.order_status not in ('cancelled', 'returned')
            and o.payment_status <> 'refunded'
          group by oi.product_id, coalesce(pr.name, oi.product_name)
          order by sum(oi.total_price) desc
          limit 10
        ) ranked
      ),
      '[]'::jsonb
    ),
    'topBrands', coalesce(
      (
        select jsonb_agg(entry order by entry ->> 'revenue' desc)
        from (
          select jsonb_build_object(
            'brand', coalesce(b.name, 'Unattributed'),
            'quantitySold', sum(oi.quantity)::bigint,
            'revenue', sum(oi.total_price)::bigint
          ) as entry
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
          left join public.products pr on pr.id = oi.product_id
          left join public.brands b on b.id = pr.brand_id
          where o.created_at >= v_from::timestamptz
            and o.created_at < (v_to + 1)::timestamptz
            and o.order_status not in ('cancelled', 'returned')
            and o.payment_status <> 'refunded'
          group by coalesce(b.name, 'Unattributed')
          order by sum(oi.total_price) desc
          limit 10
        ) ranked
      ),
      '[]'::jsonb
    ),
    'monthlySales', coalesce(
      (
        select jsonb_agg(entry order by entry ->> 'month')
        from (
          select jsonb_build_object(
            'month', to_char(date_trunc('month', o.created_at), 'YYYY-MM'),
            'orders', count(*)::integer,
            'sales', sum(o.total_amount)::bigint
          ) as entry
          from public.orders o
          where o.created_at >= v_from::timestamptz
            and o.created_at < (v_to + 1)::timestamptz
            and o.order_status not in ('cancelled', 'returned')
            and o.payment_status <> 'refunded'
          group by date_trunc('month', o.created_at)
          order by date_trunc('month', o.created_at)
        ) months
      ),
      '[]'::jsonb
    ),
    'inventory', (
      select jsonb_build_object(
        'skus', count(*)::integer,
        'units', coalesce(sum(stock_quantity), 0)::bigint,
        'outOfStock', count(*) filter (where stock_quantity = 0)::integer,
        'lowStock', count(*) filter (where stock_quantity > 0 and stock_quantity <= low_stock_threshold)::integer,
        'stockValue', coalesce(sum(stock_quantity * public.effective_product_price(p)), 0)::bigint
      )
      from public.products p
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.phase8_analytics_report(date, date)
  from public, anon, authenticated;
grant execute on function public.phase8_analytics_report(date, date)
  to service_role;

-- Metadata only. This function never returns application rows or secrets.
create or replace function public.phase8_report()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'tables', (
      select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any(array[
          'coupons', 'coupon_redemptions', 'wishlists', 'product_reviews',
          'enquiries', 'inventory_alerts'
        ])
    ),
    'policies', (
      select coalesce(jsonb_agg(tablename || ':' || policyname order by tablename, policyname), '[]'::jsonb)
      from pg_policies
      where schemaname = 'public'
        and tablename = any(array[
          'coupons', 'coupon_redemptions', 'wishlists', 'product_reviews',
          'enquiries', 'inventory_alerts'
        ])
    ),
    'columns', (
      select coalesce(jsonb_agg(table_name || '.' || column_name order by table_name, column_name), '[]'::jsonb)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any(array['products', 'orders'])
        and column_name = any(array[
          'sale_starts_at', 'sale_ends_at', 'discount_percentage',
          'low_stock_threshold', 'coupon_code'
        ])
    ),
    'functions', (
      select coalesce(jsonb_agg(proname order by proname), '[]'::jsonb)
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and proname = any(array[
          'effective_product_price', 'evaluate_coupon', 'validate_coupon',
          'place_cod_order', 'can_review_product', 'product_review_stats',
          'get_store_settings', 'create_product_enquiry', 'create_order_enquiry',
          'refresh_inventory_alerts', 'phase8_analytics_report'
        ])
    ),
    'buckets', (
      select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
      from storage.buckets
      where id = 'store-assets'
    )
  );
$$;

revoke all on function public.phase8_report() from public;
grant execute on function public.phase8_report()
  to anon, authenticated, service_role;
