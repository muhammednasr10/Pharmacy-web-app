-- =============================================================================
-- Atomic purchase — توريد + إضافة مخزون + حركات في معاملة واحدة
-- Run AFTER complete-sale-rpc.sql (reuses next_table_row_id)
-- =============================================================================

alter table stock_movements
  add column if not exists movement_type text,
  add column if not exists medicine_name text,
  add column if not exists medicine_name_ar text,
  add column if not exists medicine_name_en text,
  add column if not exists purchase_number text,
  add column if not exists supplier_name text;

alter table purchases
  add column if not exists medicine_name text,
  add column if not exists medicine_name_ar text,
  add column if not exists medicine_name_en text,
  add column if not exists barcode text;

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
  v_medicine_id bigint;
  v_med public.medicines%rowtype;
  v_qty_before integer;
  v_qty_after integer;
  v_purchase_id bigint;
  v_movement_id bigint;
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
      v_medicine_id := public.next_table_row_id('public.medicines'::regclass);
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

    v_purchase_id := public.next_table_row_id('public.purchases'::regclass);
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

revoke all on function public.complete_purchase_with_stock_addition(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.complete_purchase_with_stock_addition(text, text, text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
