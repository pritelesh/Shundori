-- Shundori Phase 6 — checkout settings, atomic COD order placement, and
-- token-gated order confirmation.
--
-- Order creation must happen in one database transaction. The server action is
-- allowed to call `place_cod_order` only through the service role after it has
-- validated the request; prices and totals are recomputed here from products.

alter table public.orders
  add column if not exists idempotency_key text,
  add column if not exists idempotency_fingerprint text,
  add column if not exists confirmation_token text;

create unique index if not exists orders_idempotency_key_key
  on public.orders (idempotency_key);
create unique index if not exists orders_confirmation_token_key
  on public.orders (confirmation_token);

-- Existing orders also need an unguessable confirmation value. Two UUIDs give
-- 64 hexadecimal characters without requiring the pgcrypto extension.
update public.orders
set confirmation_token =
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
where confirmation_token is null or btrim(confirmation_token) = '';

alter table public.orders alter column confirmation_token set not null;
alter table public.orders alter column confirmation_token
  set default (
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '')
  );

-- The future SSLCommerz integration uses its own payment-method value; no
-- online-payment status can be produced by this phase.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_payment_method_check'
  ) then
    alter table public.orders drop constraint orders_payment_method_check;
  end if;

  alter table public.orders add constraint orders_payment_method_check
    check (
      payment_method in (
        'cash_on_delivery', 'bkash', 'nagad', 'sslcommerz', 'card', 'bank_transfer'
      )
    );
end $$;

-- Server-only store settings. There is deliberately no anon/authenticated
-- policy: the public checkout reads a narrow security-definer function instead.
create table if not exists public.store_settings (
  key text primary key check (char_length(btrim(key)) > 0),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

revoke all on public.store_settings from anon, authenticated;
grant all on public.store_settings to service_role;

insert into public.store_settings (key, value)
values ('delivery_charge_poisha', '0'::jsonb)
on conflict (key) do nothing;

-- Public, read-only checkout settings. No customer data is involved.
create or replace function public.get_checkout_settings()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'deliveryCharge',
    greatest(
      0,
      coalesce(
        (select (value #>> '{}')::integer
         from public.store_settings
         where key = 'delivery_charge_poisha'),
        0
      )
    ),
    'discount', 0
  );
$$;

revoke all on function public.get_checkout_settings() from public, anon, authenticated;
grant execute on function public.get_checkout_settings() to anon, authenticated;

/**
 * Atomically places a cash-on-delivery order.
 *
 * The browser supplies only product ids, quantities, customer details and an
 * idempotency key. Every monetary value comes from locked product rows. Any
 * error rolls back order rows, order items, stock changes and audit rows.
 */
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
  p_changed_by uuid
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

  -- Serialize attempts that share a key. Without this, two concurrent double
  -- submissions can both miss the lookup below and race for the same stock;
  -- the loser would get a stock error instead of the original order.
  perform pg_advisory_xact_lock(hashtext(p_idempotency_key)::bigint);

  -- Replaying the same key with the same canonical request is a success, not
  -- a second order. Reusing it with different contents is a conflict.
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
      'total', v_existing.total_amount
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

  -- Validate and lock products in id order so concurrent checkouts cannot
  -- deadlock or oversell the same stock.
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

    v_unit_price := coalesce(v_product.sale_price, v_product.regular_price);
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
      idempotency_fingerprint
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
      p_idempotency_fingerprint
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
        'total', v_existing.total_amount
      );
  end;

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
      coalesce(v_product.sale_price, v_product.regular_price),
      v_quantity,
      coalesce(v_product.sale_price, v_product.regular_price) * v_quantity
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
    'total', v_order.total_amount
  );
end;
$$;

revoke all on function public.place_cod_order(
  text, text, uuid, text, text, text, jsonb, text, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.place_cod_order(
  text, text, uuid, text, text, text, jsonb, text, jsonb, uuid
) to service_role;

/**
 * Token-gated confirmation read. The order number alone is not a secret; the
 * unguessable confirmation token is required, so customer details cannot be
 * enumerated by changing the order number.
 */
create or replace function public.get_order_confirmation(
  p_order_number text,
  p_confirmation_token text
)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'customerPhone', o.customer_phone,
        'customerEmail', o.customer_email,
        'deliveryAddress', o.delivery_address,
        'subtotal', o.subtotal,
        'deliveryCharge', o.delivery_charge,
        'discount', o.discount,
        'total', o.total_amount,
        'paymentMethod', o.payment_method,
        'paymentStatus', o.payment_status,
        'status', o.order_status,
        'notes', o.notes,
        'createdAt', o.created_at,
        'items', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'productName', oi.product_name,
                'productImage', oi.product_image,
                'unitPrice', oi.unit_price,
                'quantity', oi.quantity,
                'lineTotal', oi.total_price
              )
              order by oi.id
            )
            from public.order_items oi
            where oi.order_id = o.id
          ),
          '[]'::jsonb
        )
      )
      from public.orders o
      where o.order_number = p_order_number
        and o.confirmation_token = p_confirmation_token
      limit 1
    ),
    'null'::jsonb
  );
$$;

revoke all on function public.get_order_confirmation(text, text) from public, anon, authenticated;
grant execute on function public.get_order_confirmation(text, text) to anon, authenticated;

-- Metadata-only report used by scripts/verify-supabase.mjs. It exposes column
-- and index names, never application rows or confirmation tokens.
create or replace function public.phase6_checkout_report()
returns table (table_name text, columns text[], indexes text[], row_security boolean)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select
    c.relname::text as table_name,
    coalesce(
      array_agg(distinct a.attname::text) filter (where a.attname is not null),
      '{}'::text[]
    ) as columns,
    coalesce(
      array_agg(distinct ic.relname::text) filter (where ic.relname is not null),
      '{}'::text[]
    ) as indexes,
    c.relrowsecurity as row_security
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attribute a
    on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_index i on i.indrelid = c.oid
  left join pg_class ic on ic.oid = i.indexrelid
  where n.nspname = 'public'
    and c.relname in ('orders', 'store_settings')
  group by c.relname, c.relrowsecurity
  order by c.relname;
$$;

revoke all on function public.phase6_checkout_report() from public;
grant execute on function public.phase6_checkout_report() to anon, authenticated, service_role;
