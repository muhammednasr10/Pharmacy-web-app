-- =============================================================================
-- Atomic POS sale — فاتورة بيع + خصم مخزون + حركات في معاملة واحدة
-- Run AFTER branch-transfer-batch-rpc.sql (reuses next_table_row_id) or standalone
-- =============================================================================

create or replace function public.next_table_row_id(p_table regclass)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  execute format('select coalesce(max(id), 0) from %s', p_table) into v_max;
  return v_max + 1 + floor(random() * 17)::bigint;
end;
$$;

create or replace function public.complete_sale_with_stock_deduction(
  p_pharmacy_id text,
  p_invoice jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_medicine_id bigint;
  v_qty integer;
  v_required integer;
  v_med public.medicines%rowtype;
  v_running_qty integer;
  v_qty_before integer;
  v_qty_after integer;
  v_invoice_id bigint;
  v_line_id bigint;
  v_movement_id bigint;
  v_invoice_number text;
  v_cashier_id text;
  v_cashier_name text;
  v_display_name text;
  v_shift_id text;
begin
  if coalesce(trim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not public.is_active_user() then
    raise exception 'not_authorized';
  end if;

  if not public.can_write_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  if p_invoice is null or p_invoice = 'null'::jsonb then
    raise exception 'invoice_required';
  end if;

  v_invoice_id := (p_invoice->>'id')::bigint;
  if v_invoice_id is null or v_invoice_id <= 0 then
    raise exception 'invoice_required';
  end if;

  v_invoice_number := coalesce(nullif(trim(p_invoice->>'invoice_number'), ''), 'INV-' || v_invoice_id::text);
  v_cashier_id := nullif(trim(p_invoice->>'cashier_id'), '');
  v_cashier_name := nullif(trim(p_invoice->>'cashier_name'), '');
  v_shift_id := nullif(trim(p_invoice->>'shift_id'), '');

  create temp table _sale_qty_required (
    medicine_id bigint primary key,
    required_qty integer not null check (required_qty > 0)
  ) on commit drop;

  create temp table _sale_med_state (
    medicine_id bigint primary key,
    qty_remaining integer not null
  ) on commit drop;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_qty := floor(coalesce((v_item->>'quantity')::numeric, 0))::integer;

    if v_medicine_id is null or v_medicine_id <= 0 or v_qty <= 0 then
      raise exception 'empty_cart';
    end if;

    insert into _sale_qty_required (medicine_id, required_qty)
    values (v_medicine_id, v_qty)
    on conflict (medicine_id) do update
      set required_qty = _sale_qty_required.required_qty + excluded.required_qty;
  end loop;

  for v_medicine_id, v_required in
    select medicine_id, required_qty
    from _sale_qty_required
    order by medicine_id
  loop
    select *
    into v_med
    from public.medicines
    where id = v_medicine_id
      and pharmacy_id = p_pharmacy_id
    for update;

    if not found then
      raise exception 'medicine_not_found';
    end if;

    if v_med.qty < v_required then
      raise exception 'insufficient_stock';
    end if;

    insert into _sale_med_state (medicine_id, qty_remaining)
    values (v_medicine_id, v_med.qty);
  end loop;

  insert into public.invoices (
    id,
    invoice_number,
    date,
    subtotal,
    discount,
    total,
    payment_method,
    customer_name,
    cashier_id,
    cashier_name,
    pharmacy_id,
    total_cost,
    total_profit,
    created_at,
    shift_id
  )
  values (
    v_invoice_id,
    v_invoice_number,
    coalesce(nullif(trim(p_invoice->>'date'), ''), to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    coalesce((p_invoice->>'subtotal')::numeric, 0),
    coalesce((p_invoice->>'discount')::numeric, 0),
    coalesce((p_invoice->>'total')::numeric, 0),
    coalesce(nullif(trim(p_invoice->>'payment_method'), ''), 'cash'),
    coalesce(p_invoice->>'customer_name', ''),
    v_cashier_id,
    v_cashier_name,
    p_pharmacy_id,
    coalesce((p_invoice->>'total_cost')::numeric, 0),
    coalesce((p_invoice->>'total_profit')::numeric, 0),
    coalesce((p_invoice->>'created_at')::timestamptz, now()),
    v_shift_id
  );

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_qty := floor(coalesce((v_item->>'quantity')::numeric, 0))::integer;

    select qty_remaining
    into v_running_qty
    from _sale_med_state
    where medicine_id = v_medicine_id
    for update;

    v_qty_before := v_running_qty;
    v_qty_after := v_running_qty - v_qty;

    update _sale_med_state
    set qty_remaining = v_qty_after
    where medicine_id = v_medicine_id;

    v_line_id := coalesce((v_item->>'id')::bigint, public.next_table_row_id('public.invoice_items'::regclass));

    v_display_name := coalesce(
      nullif(trim(v_item->>'name_ar'), ''),
      nullif(trim(v_item->>'name_en'), ''),
      ''
    );

    insert into public.invoice_items (
      id,
      invoice_id,
      medicine_id,
      name_ar,
      name_en,
      barcode,
      quantity,
      unit_price,
      line_total,
      buy_price,
      cost_total,
      profit,
      medicine_name,
      pharmacy_id
    )
    values (
      v_line_id,
      v_invoice_id,
      v_medicine_id,
      coalesce(v_item->>'name_ar', ''),
      coalesce(v_item->>'name_en', ''),
      coalesce(v_item->>'barcode', ''),
      v_qty,
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'line_total')::numeric, 0),
      coalesce((v_item->>'buy_price')::numeric, 0),
      coalesce((v_item->>'cost_total')::numeric, 0),
      coalesce((v_item->>'profit')::numeric, 0),
      v_display_name,
      p_pharmacy_id
    );

    v_movement_id := public.next_table_row_id('public.stock_movements'::regclass);

    insert into public.stock_movements (
      id,
      type,
      movement_type,
      medicine_id,
      medicine_name_ar,
      medicine_name_en,
      medicine_name,
      barcode,
      quantity_change,
      qty_before,
      qty_after,
      invoice_number,
      notes,
      pharmacy_id,
      user_id,
      user_name
    )
    values (
      v_movement_id,
      'sale',
      'sale',
      v_medicine_id,
      coalesce(v_item->>'name_ar', ''),
      coalesce(v_item->>'name_en', ''),
      v_display_name,
      coalesce(v_item->>'barcode', ''),
      -v_qty,
      v_qty_before,
      v_qty_after,
      v_invoice_number,
      format('Sale %s', v_invoice_number),
      p_pharmacy_id,
      v_cashier_id,
      v_cashier_name
    );
  end loop;

  update public.medicines m
  set qty = s.qty_remaining
  from _sale_med_state s
  where m.id = s.medicine_id
    and m.pharmacy_id = p_pharmacy_id;

  return (
    select to_jsonb(i)
    from public.invoices i
    where i.id = v_invoice_id
  );
end;
$$;

revoke all on function public.complete_sale_with_stock_deduction(text, jsonb, jsonb) from public;
grant execute on function public.complete_sale_with_stock_deduction(text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
