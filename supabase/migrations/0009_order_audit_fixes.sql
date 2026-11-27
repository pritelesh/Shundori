-- Shundori Phase 7 audit fixes.
--
-- Applied migrations are immutable, so these corrections are additive:
--   1. A pending customer cancellation must be decided before a status change.
--   2. An admin-initiated cancellation does not fabricate a customer request.
--   3. A missing product aborts stock restoration instead of dropping it.

/**
 * Restores stock for a cancelled order exactly once. A null product reference
 * now fails loudly: hard-deleting a product sets order_items.product_id to null,
 * and silently skipping that line would lose the adjustment forever.
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
    select *
    from public.order_items
    where order_id = p_order_id
    order by product_id
  loop
    if v_item.product_id is null then
      raise exception 'A product for this order is no longer available.'
        using errcode = '22023';
    end if;

    -- Re-read and lock each product so manual admin stock edits cannot race.
    select stock_quantity into v_previous
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'A product for this order is no longer available.'
        using errcode = '22023';
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
 * Admin-only fulfilment transition. A customer request must be resolved before
 * the order can advance, because shipping an order with a live request leaves
 * an approvable cancellation that the state machine can no longer apply.
 *
 * Cancellation metadata is only marked as an approved customer request when
 * one actually existed. An admin cancelling a fresh order (or an order whose
 * request was already rejected) leaves the customer request state untouched.
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

  if v_order.cancellation_status = 'requested' and p_status <> 'cancelled' then
    raise exception 'Decide the pending cancellation request before changing the order status.'
      using errcode = '22023';
  end if;

  perform set_config('app.order_actor_type', 'admin', true);
  perform set_config('app.order_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.order_note', coalesce(v_note, ''), true);

  update public.orders
  set order_status = p_status,
      cancellation_status = case
        when p_status = 'cancelled' and v_order.cancellation_status = 'requested'
          then 'approved'
        when p_status = 'cancelled' and v_order.cancellation_status = 'none'
          then 'none'
        else v_order.cancellation_status
      end,
      cancellation_decided_at = case
        when p_status = 'cancelled' and v_order.cancellation_status = 'requested'
          then now()
        else v_order.cancellation_decided_at
      end,
      cancellation_decided_by = case
        when p_status = 'cancelled' and v_order.cancellation_status = 'requested'
          then p_actor_id
        else v_order.cancellation_decided_by
      end,
      cancellation_decision_note = case
        when p_status = 'cancelled' and v_order.cancellation_status = 'requested'
          then coalesce(v_note, v_order.cancellation_decision_note)
        else v_order.cancellation_decision_note
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
