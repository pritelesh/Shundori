-- Shundori Phase 7 — order management, cancellation and courier readiness.
--
-- Every fulfilment change and cancellation decision runs through a service-role
-- RPC. Status history is written by a trigger so an application update cannot
-- silently skip the audit trail. Stock restoration is guarded by a row lock and
-- a boolean marker, so concurrent approvals cannot restore stock twice.

alter table public.orders
  add column if not exists cancellation_status text not null default 'none'
    check (cancellation_status in ('none', 'requested', 'approved', 'rejected')),
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_decided_at timestamptz,
  add column if not exists cancellation_decided_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_decision_note text,
  add column if not exists cancellation_stock_restored boolean not null default false;

create index if not exists orders_cancellation_status_idx
  on public.orders (cancellation_status, created_at desc);

create table if not exists public.order_status_changes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text check (
    from_status is null
    or from_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
  ),
  to_status text not null check (
    to_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
  ),
  actor_type text not null check (actor_type in ('system', 'admin', 'customer')),
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_changes_order_created_idx
  on public.order_status_changes (order_id, created_at desc);

-- Courier data is deliberately empty until a real provider adapter exists. The
-- schema and service layer are ready, but no tracking value is invented here.
create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null check (provider in ('pathao', 'steadfast', 'redx')),
  provider_shipment_id text,
  provider_status text,
  tracking_url text,
  estimated_delivery_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists courier_shipments_set_updated_at on public.courier_shipments;
create trigger courier_shipments_set_updated_at
before update on public.courier_shipments
for each row execute function public.set_updated_at();

alter table public.order_status_changes enable row level security;
alter table public.courier_shipments enable row level security;

revoke all on public.order_status_changes, public.courier_shipments from anon, authenticated;
grant select on public.order_status_changes, public.courier_shipments to authenticated;
grant all on public.order_status_changes, public.courier_shipments to service_role;

drop policy if exists "Admins read order status changes" on public.order_status_changes;
create policy "Admins read order status changes"
on public.order_status_changes for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read courier shipments" on public.courier_shipments;
create policy "Admins read courier shipments"
on public.courier_shipments for select to authenticated
using (public.is_admin());

-- `returned` remains a legacy terminal value from earlier phases. It is not a
-- Phase 7 transition target; new orders use only the six documented statuses.
create or replace function public.can_transition_order_status(
  p_current text,
  p_next text
)
returns boolean
language sql
immutable
set search_path = public, pg_catalog
as $$
  select p_next = p_current
    or (p_current = 'pending' and p_next in ('confirmed', 'cancelled'))
    or (p_current = 'confirmed' and p_next in ('processing', 'cancelled'))
    or (p_current = 'processing' and p_next in ('shipped', 'cancelled'))
    or (p_current = 'shipped' and p_next = 'delivered')
    or (p_current in ('delivered', 'cancelled', 'returned') and false);
$$;

revoke all on function public.can_transition_order_status(text, text) from public, anon, authenticated;
grant execute on function public.can_transition_order_status(text, text) to service_role;

/**
 * Database-level state-machine guard. The application RPCs check transitions
 * too, but this trigger prevents a direct table write from skipping them.
 * `returned` is tolerated on old rows only when it is not a new target.
 */
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.order_status not in (
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    ) then
      raise exception 'Unsupported order status.' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.order_status is distinct from old.order_status then
    if new.order_status not in (
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    ) then
      raise exception 'Unsupported order status.' using errcode = '22023';
    end if;

    if not public.can_transition_order_status(old.order_status, new.order_status) then
      raise exception 'Cannot change an order from % to %.',
        old.order_status, new.order_status
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_status_transition on public.orders;
create trigger orders_enforce_status_transition
before insert or update of order_status on public.orders
for each row execute function public.enforce_order_status_transition();

revoke all on function public.enforce_order_status_transition() from public, anon, authenticated;

/**
 * Writes one immutable row per status transition. `set_config` values are
 * transaction-local, so the RPCs can identify the actor without letting a
 * client supply a trusted role.
 */
create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_actor_type text;
  v_actor_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_changes (
      order_id, from_status, to_status, actor_type, actor_id, note
    )
    values (new.id, null, new.order_status, 'system', null, 'Order placed');
    return new;
  end if;

  if old.order_status is distinct from new.order_status then
    v_actor_type := coalesce(
      nullif(current_setting('app.order_actor_type', true), ''),
      case when auth.uid() is null then 'system' else 'admin' end
    );
    v_actor_id := coalesce(
      nullif(current_setting('app.order_actor_id', true), '')::uuid,
      auth.uid()
    );

    insert into public.order_status_changes (
      order_id, from_status, to_status, actor_type, actor_id, note
    )
    values (
      new.id,
      old.order_status,
      new.order_status,
      v_actor_type,
      v_actor_id,
      nullif(current_setting('app.order_note', true), '')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists orders_record_status_change on public.orders;
create trigger orders_record_status_change
after insert or update of order_status on public.orders
for each row execute function public.record_order_status_change();

-- Backfill existing orders with one synthetic starting point. Historic rows
-- have no original transition log, so their current value is recorded with the
-- original creation time rather than invented intermediate states.
insert into public.order_status_changes (
  order_id, from_status, to_status, actor_type, actor_id, note, created_at
)
select o.id, null, o.order_status, 'system', null, 'Imported order state', o.created_at
from public.orders o
where not exists (
  select 1 from public.order_status_changes c where c.order_id = o.id
);

revoke all on function public.record_order_status_change() from public, anon, authenticated;

/**
 * Restores stock for a cancelled order exactly once.
 *
 * Caller must hold an advisory lock and a row lock on the order. The boolean
 * marker and the product row locks make a second call a no-op.
 */
create or replace function public.restore_cancelled_order_stock(
  p_order_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_previous integer;
  v_new integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.' using errcode = '22023';
  end if;

  if v_order.order_status <> 'cancelled' then
    raise exception 'Only cancelled orders restore stock.' using errcode = '22023';
  end if;

  if v_order.cancellation_stock_restored then
    return;
  end if;

  for v_item in
    select * from public.order_items
    where order_id = p_order_id
      and product_id is not null
    order by product_id
  loop
    -- Re-read and lock each product so manual admin stock edits cannot race.
    select stock_quantity into v_previous
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'A product for this order is no longer available.' using errcode = '22023';
    end if;

    update public.products
    set stock_quantity = v_previous + v_item.quantity
    where id = v_item.product_id
    returning stock_quantity into v_new;

    insert into public.inventory_changes (
      product_id, previous_quantity, new_quantity, reason, changed_by
    )
    values (
      v_item.product_id,
      v_previous,
      v_new,
      'cancellation_restore',
      p_actor_id
    );
  end loop;

  update public.orders
  set cancellation_stock_restored = true
  where id = p_order_id;
end;
$$;

revoke all on function public.restore_cancelled_order_stock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.restore_cancelled_order_stock(uuid, uuid) to service_role;

/**
 * Admin-only fulfilment transition. Cancelling restores stock in the same
 * transaction; every real status change is logged by the trigger above.
 */
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status text,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Unsupported order status.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);

  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.' using errcode = '22023';
  end if;

  if p_status = v_order.order_status then
    return jsonb_build_object(
      'orderId', v_order.id,
      'orderNumber', v_order.order_number,
      'status', v_order.order_status,
      'changed', false
    );
  end if;

  if not public.can_transition_order_status(v_order.order_status, p_status) then
    raise exception 'Cannot change an order from % to %.',
      v_order.order_status, p_status
      using errcode = '22023';
  end if;

  if p_status = 'cancelled' and v_order.cancellation_status = 'rejected' then
    raise exception 'A rejected cancellation cannot be approved.' using errcode = '22023';
  end if;

  perform set_config('app.order_actor_type', 'admin', true);
  perform set_config('app.order_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.order_note', coalesce(v_note, ''), true);

  update public.orders
  set order_status = p_status,
      cancellation_status = case
        when p_status = 'cancelled' and cancellation_status in ('none', 'requested')
          then 'approved'
        else cancellation_status
      end,
      cancellation_decided_at = case
        when p_status = 'cancelled' then now()
        else cancellation_decided_at
      end,
      cancellation_decided_by = case
        when p_status = 'cancelled' then p_actor_id
        else cancellation_decided_by
      end,
      cancellation_decision_note = case
        when p_status = 'cancelled' then coalesce(v_note, cancellation_decision_note)
        else cancellation_decision_note
      end
  where id = p_order_id;

  if p_status = 'cancelled' then
    perform public.restore_cancelled_order_stock(p_order_id, p_actor_id);
  end if;

  return jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'status', p_status,
    'changed', true
  );
end;
$$;

revoke all on function public.set_order_status(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.set_order_status(uuid, text, uuid, text) to service_role;

/**
 * Customer cancellation request. Both the order number and the phone number
 * must match; a mismatch is indistinguishable from an unknown order.
 */
create or replace function public.request_order_cancellation(
  p_order_number text,
  p_phone text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_number text := upper(btrim(coalesce(p_order_number, '')));
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_phone text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if length(v_digits) = 13 and v_digits like '880%' then
    v_phone := '0' || substring(v_digits from 4);
  else
    v_phone := v_digits;
  end if;

  if v_number !~ '^SD-[0-9]{8}-[A-Z0-9]{8}$'
     or v_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'No matching order was found.' using errcode = '22023';
  end if;

  if length(coalesce(v_reason, '')) > 500 then
    raise exception 'Keep the cancellation reason under 500 characters.' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where upper(btrim(order_number)) = v_number
    and regexp_replace(customer_phone, '[^0-9]', '', 'g') = v_phone;

  if not found then
    raise exception 'No matching order was found.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_order.id::text)::bigint);

  select * into v_order from public.orders where id = v_order.id for update;

  if v_order.order_status not in ('pending', 'confirmed', 'processing') then
    raise exception 'This order can no longer be cancelled.' using errcode = '22023';
  end if;

  if v_order.cancellation_status = 'requested' then
    return jsonb_build_object(
      'orderNumber', v_order.order_number,
      'cancellationStatus', 'requested',
      'alreadyRequested', true
    );
  end if;

  if v_order.cancellation_status in ('approved', 'rejected') then
    raise exception 'A cancellation decision has already been recorded.' using errcode = '22023';
  end if;

  update public.orders
  set cancellation_status = 'requested',
      cancellation_requested_at = now(),
      cancellation_reason = v_reason,
      cancellation_decided_at = null,
      cancellation_decided_by = null,
      cancellation_decision_note = null
  where id = v_order.id;

  insert into public.order_status_changes (
    order_id, from_status, to_status, actor_type, actor_id, note
  )
  values (
    v_order.id,
    v_order.order_status,
    v_order.order_status,
    'customer',
    null,
    coalesce('Cancellation requested: ' || v_reason, 'Cancellation requested')
  );

  return jsonb_build_object(
    'orderNumber', v_order.order_number,
    'cancellationStatus', 'requested',
    'alreadyRequested', false
  );
end;
$$;

revoke all on function public.request_order_cancellation(text, text, text) from public, anon, authenticated;
grant execute on function public.request_order_cancellation(text, text, text) to service_role;

/** Admin approve/reject for a pending customer cancellation request. */
create or replace function public.decide_order_cancellation(
  p_order_id uuid,
  p_approve boolean,
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);

  select * into v_order from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found.' using errcode = '22023';
  end if;

  if v_order.cancellation_status <> 'requested' then
    raise exception 'There is no pending cancellation request.' using errcode = '22023';
  end if;

  if p_approve then
    v_result := public.set_order_status(p_order_id, 'cancelled', p_actor_id, v_note);
    return jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order.order_number,
      'decision', 'approved',
      'status', 'cancelled',
      'changed', v_result ->> 'changed'
    );
  end if;

  update public.orders
  set cancellation_status = 'rejected',
      cancellation_decided_at = now(),
      cancellation_decided_by = p_actor_id,
      cancellation_decision_note = v_note
  where id = p_order_id;

  perform set_config('app.order_actor_type', 'admin', true);
  perform set_config('app.order_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.order_note', coalesce(v_note, ''), true);

  insert into public.order_status_changes (
    order_id, from_status, to_status, actor_type, actor_id, note
  )
  values (
    p_order_id,
    v_order.order_status,
    v_order.order_status,
    'admin',
    p_actor_id,
    coalesce('Cancellation rejected: ' || v_note, 'Cancellation rejected')
  );

  return jsonb_build_object(
    'orderId', p_order_id,
    'orderNumber', v_order.order_number,
    'decision', 'rejected',
    'status', v_order.order_status,
    'changed', false
  );
end;
$$;

revoke all on function public.decide_order_cancellation(uuid, boolean, uuid, text) from public, anon, authenticated;
grant execute on function public.decide_order_cancellation(uuid, boolean, uuid, text) to service_role;

/**
 * Privacy-safe customer tracking. Both order number and phone are required,
 * and the payload never contains customer identity, address or order totals.
 */
create or replace function public.track_order(
  p_order_number text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.courier_shipments%rowtype;
  v_number text := upper(btrim(coalesce(p_order_number, '')));
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_phone text;
begin
  if length(v_digits) = 13 and v_digits like '880%' then
    v_phone := '0' || substring(v_digits from 4);
  else
    v_phone := v_digits;
  end if;

  if v_number !~ '^SD-[0-9]{8}-[A-Z0-9]{8}$'
     or v_phone !~ '^01[3-9][0-9]{8}$' then
    return 'null'::jsonb;
  end if;

  select * into v_order
  from public.orders
  where upper(btrim(order_number)) = v_number
    and regexp_replace(customer_phone, '[^0-9]', '', 'g') = v_phone;

  if not found then
    return 'null'::jsonb;
  end if;

  select * into v_shipment
  from public.courier_shipments
  where order_id = v_order.id
  limit 1;

  return jsonb_build_object(
    'orderNumber', v_order.order_number,
    'status', v_order.order_status,
    'placedAt', v_order.created_at,
    'paymentMethod', v_order.payment_method,
    'estimatedDeliveryAt', v_shipment.estimated_delivery_at,
    'cancellationStatus', v_order.cancellation_status,
    'cancellationRequestedAt', v_order.cancellation_requested_at,
    'courier', case
      when v_shipment.id is null then jsonb_build_object('state', 'not_connected')
      else jsonb_build_object(
        'state', 'connected',
        'provider', v_shipment.provider,
        'providerStatus', v_shipment.provider_status,
        'trackingUrl', v_shipment.tracking_url
      )
    end,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'productName', oi.product_name,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price,
            'lineTotal', oi.total_price
          )
          order by oi.id
        )
        from public.order_items oi
        where oi.order_id = v_order.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.track_order(text, text) from public, anon, authenticated;
grant execute on function public.track_order(text, text) to service_role;

-- Metadata-only report for dependency-free verification. It never returns rows.
create or replace function public.phase7_orders_report()
returns table (
  table_name text,
  columns text[],
  indexes text[],
  row_security boolean
)
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
    and c.relname in ('orders', 'order_status_changes', 'courier_shipments')
  group by c.relname, c.relrowsecurity
  order by c.relname;
$$;

revoke all on function public.phase7_orders_report() from public;
grant execute on function public.phase7_orders_report() to anon, authenticated, service_role;
