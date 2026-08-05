-- Fix text vs bigint ID mismatches for POS sale + purchase RPCs.
-- Run in Supabase SQL Editor when errors like "operator does not exist: text = bigint" appear.

create or replace function public.next_table_row_id(p_table regclass)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  execute format(
    'select coalesce((select max(id::bigint) from %1$s), 0::bigint)',
    p_table
  )
    into v_max;
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
  v_medicine_id text;
  v_qty integer;
  v_required integer;
  v_med public.medicines%rowtype;
  v_running_qty integer;
  v_qty_before integer;
  v_qty_after integer;
  v_invoice_id text;
  v_line_id text;
  v_movement_id text;
  v_invoice_number text;
  v_cashier_id text;
  v_cashier_name text;
  v_display_name text;
  v_shift_id text;
  v_cashier_shift_id bigint;
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

  v_invoice_id := nullif(trim(p_invoice->>'id'), '');
  if v_invoice_id is null then
    raise exception 'invoice_required';
  end if;

  v_invoice_number := coalesce(nullif(trim(p_invoice->>'invoice_number'), ''), 'INV-' || v_invoice_id);
  v_cashier_id := nullif(trim(p_invoice->>'cashier_id'), '');
  v_cashier_name := nullif(trim(p_invoice->>'cashier_name'), '');
  v_shift_id := nullif(trim(p_invoice->>'shift_id'), '');
  v_cashier_shift_id := nullif((p_invoice->>'cashier_shift_id')::bigint, 0);

  if v_cashier_shift_id is not null then
    if not exists (
      select 1
      from public.cashier_shifts cs
      where cs.id = v_cashier_shift_id
        and cs.pharmacy_id = p_pharmacy_id
        and cs.status = 'open'
        and (cs.cashier_id = coalesce(v_cashier_id, auth.uid()::text) or public.can_write_pharmacy_row(p_pharmacy_id))
    ) then
      raise exception 'cashier_shift_invalid';
    end if;
  end if;

  create temp table _sale_qty_required (
    medicine_id text primary key,
    required_qty integer not null check (required_qty > 0)
  ) on commit drop;

  create temp table _sale_med_state (
    medicine_id text primary key,
    qty_remaining integer not null
  ) on commit drop;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_medicine_id := nullif(trim(v_item->>'medicine_id'), '');
    v_qty := floor(coalesce((v_item->>'quantity')::numeric, 0))::integer;

    if v_medicine_id is null or v_qty <= 0 then
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
    shift_id,
    cashier_shift_id
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
    v_shift_id,
    v_cashier_shift_id
  );

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_medicine_id := nullif(trim(v_item->>'medicine_id'), '');
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

    v_line_id := coalesce(
      nullif(trim(v_item->>'id'), ''),
      public.next_table_row_id('public.invoice_items'::regclass)::text
    );

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

    v_movement_id := public.next_table_row_id('public.stock_movements'::regclass)::text;
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

-- Purchase RPC (same text-id fix)
create or replace function public.complete_purchase_with_stock_addition(
  p_pharmacy_id text,
  p_purchase_number text,
  p_supplier_name text default null,
  p_notes text default null,
  p_user_id text default null,
  p_user_name text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_barcode text;
  v_name_ar text;
  v_name_en text;
  v_expiry text;
  v_qty integer;
  v_buy_price numeric;
  v_sell_price numeric;
  v_medicine_id text;
  v_med public.medicines%rowtype;
  v_qty_before integer;
  v_qty_after integer;
  v_purchase_id text;
  v_movement_id text;
  v_display_name text;
  v_purchase_date text;
  v_saved_count integer := 0;
begin
  if coalesce(trim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if coalesce(trim(p_purchase_number), '') = '' then
    raise exception 'purchase_number_required';
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
    raise exception 'empty_items';
  end if;

  v_purchase_date := to_char(now(), 'DD/MM/YYYY, HH24:MI');

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_barcode := trim(coalesce(v_item->>'barcode', ''));
    v_name_ar := trim(coalesce(v_item->>'name_ar', ''));
    v_name_en := trim(coalesce(v_item->>'name_en', ''));
    v_expiry := trim(coalesce(v_item->>'expiry', ''));
    v_qty := floor(coalesce((v_item->>'qty')::numeric, 0))::integer;
    v_buy_price := coalesce((v_item->>'buy_price')::numeric, 0);
    v_sell_price := coalesce((v_item->>'sell_price')::numeric, 0);

    if v_barcode = ''
      or v_name_ar = ''
      or v_name_en = ''
      or v_expiry = ''
      or v_qty <= 0 then
      raise exception 'invalid_item';
    end if;

    if exists (
      select 1
      from public.purchases p
      where p.purchase_number = p_purchase_number
        and p.barcode = v_barcode
        and p.pharmacy_id = p_pharmacy_id
    ) then
      continue;
    end if;

    v_medicine_id := null;

    select *
    into v_med
    from public.medicines
    where pharmacy_id = p_pharmacy_id
      and barcode = v_barcode
    order by id
    limit 1
    for update;

    if not found then
      v_medicine_id := public.next_table_row_id('public.medicines'::regclass)::text;
      insert into public.medicines (
        id,
        name_ar,
        name_en,
        barcode,
        qty,
        price,
        buy_price,
        expiry,
        pharmacy_id
      )
      values (
        v_medicine_id,
        v_name_ar,
        v_name_en,
        v_barcode,
        0,
        v_sell_price,
        v_buy_price,
        v_expiry,
        p_pharmacy_id
      );

      select * into v_med from public.medicines where id = v_medicine_id;
    else
      v_medicine_id := v_med.id;
    end if;

    v_qty_before := coalesce(v_med.qty, 0);
    v_qty_after := v_qty_before + v_qty;
    v_display_name := coalesce(nullif(v_name_ar, ''), nullif(v_name_en, ''), '—');

    update public.medicines
    set
      name_ar = v_name_ar,
      name_en = v_name_en,
      qty = v_qty_after,
      buy_price = v_buy_price,
      price = v_sell_price,
      expiry = v_expiry
    where id = v_medicine_id
      and pharmacy_id = p_pharmacy_id;

    v_purchase_id := public.next_table_row_id('public.purchases'::regclass)::text;
    insert into public.purchases (
      id,
      purchase_number,
      medicine_id,
      medicine_name,
      medicine_name_ar,
      medicine_name_en,
      barcode,
      quantity,
      buy_price,
      sell_price,
      total_cost,
      supplier_name,
      notes,
      pharmacy_id,
      user_id,
      user_name,
      date,
      created_at
    )
    values (
      v_purchase_id,
      p_purchase_number,
      v_medicine_id,
      v_display_name,
      v_name_ar,
      v_name_en,
      v_barcode,
      v_qty,
      v_buy_price,
      v_sell_price,
      v_qty * v_buy_price,
      coalesce(p_supplier_name, ''),
      coalesce(p_notes, ''),
      p_pharmacy_id,
      coalesce(p_user_id, ''),
      coalesce(p_user_name, ''),
      v_purchase_date,
      now()
    );

    v_movement_id := public.next_table_row_id('public.stock_movements'::regclass)::text;
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
      purchase_number,
      supplier_name,
      notes,
      pharmacy_id,
      user_id,
      user_name,
      created_at
    )
    values (
      v_movement_id,
      'purchase',
      'purchase',
      v_medicine_id,
      v_name_ar,
      v_name_en,
      v_display_name,
      v_barcode,
      v_qty,
      v_qty_before,
      v_qty_after,
      p_purchase_number,
      coalesce(p_supplier_name, ''),
      coalesce(p_notes, ''),
      p_pharmacy_id,
      coalesce(p_user_id, ''),
      coalesce(p_user_name, ''),
      now()
    );

    v_saved_count := v_saved_count + 1;
  end loop;

  if v_saved_count = 0 then
    raise exception 'already_saved';
  end if;

  return jsonb_build_object(
    'purchase_number', p_purchase_number,
    'saved_count', v_saved_count
  );
end;
$$;

revoke all on function public.complete_sale_with_stock_deduction(text, jsonb, jsonb) from public;
grant execute on function public.complete_sale_with_stock_deduction(text, jsonb, jsonb) to authenticated;

revoke all on function public.complete_purchase_with_stock_addition(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.complete_purchase_with_stock_addition(text, text, text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
