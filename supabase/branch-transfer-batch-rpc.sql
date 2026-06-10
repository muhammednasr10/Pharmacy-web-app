-- =============================================================================
-- Atomic branch stock transfer batch — نقل مخزون بين الفروع في معاملة واحدة
-- Run AFTER branch-transfer-approval.sql and accountant-org-read.sql
-- =============================================================================

alter table stock_movements
  add column if not exists transfer_number text;

create index if not exists idx_stock_movements_transfer_number
  on stock_movements (transfer_number)
  where transfer_number is not null;

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

create or replace function public.assert_branch_transfer_write_access(
  p_from_pharmacy_id text,
  p_to_pharmacy_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_from_pharmacy_id), '') = '' or coalesce(trim(p_to_pharmacy_id), '') = '' then
    raise exception 'branch_required';
  end if;

  if p_from_pharmacy_id = p_to_pharmacy_id then
    raise exception 'same_branch';
  end if;

  if not public.is_super_admin() then
    if not public.is_org_pharmacy_admin() then
      raise exception 'not_authorized';
    end if;
    if not public.can_write_pharmacy_row(p_from_pharmacy_id)
      or not public.can_write_pharmacy_row(p_to_pharmacy_id) then
      raise exception 'not_authorized';
    end if;
  end if;
end;
$$;

create or replace function public.assert_branch_transfer_approve_access(
  p_to_pharmacy_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin() then
    return;
  end if;

  if public.is_org_pharmacy_admin() then
    return;
  end if;

  if public.is_branch_manager()
    and p_to_pharmacy_id = public.current_user_pharmacy_id() then
    return;
  end if;

  raise exception 'not_authorized';
end;
$$;

create or replace function public.apply_branch_stock_transfer_line(
  p_from_pharmacy_id text,
  p_to_pharmacy_id text,
  p_medicine_id bigint,
  p_quantity integer,
  p_transfer_number text,
  p_notes text default null,
  p_user_id text default null,
  p_user_name text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.medicines%rowtype;
  v_target public.medicines%rowtype;
  v_target_id bigint;
  v_source_qty_after integer;
  v_target_qty_before integer;
  v_target_qty_after integer;
  v_movement_out_id bigint;
  v_movement_in_id bigint;
  v_movement_notes text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  select *
  into v_source
  from public.medicines
  where id = p_medicine_id
    and pharmacy_id = p_from_pharmacy_id
  for update;

  if not found then
    raise exception 'medicine_not_found';
  end if;

  if v_source.qty < p_quantity then
    raise exception 'insufficient_stock';
  end if;

  v_target_id := null;

  if coalesce(trim(v_source.barcode), '') <> '' then
    select id
    into v_target_id
    from public.medicines
    where pharmacy_id = p_to_pharmacy_id
      and barcode = trim(v_source.barcode)
    order by id
    limit 1
    for update;
  end if;

  if v_target_id is null then
    select id
    into v_target_id
    from public.medicines
    where pharmacy_id = p_to_pharmacy_id
      and trim(coalesce(name_ar, '')) = trim(coalesce(v_source.name_ar, ''))
      and trim(coalesce(name_en, '')) = trim(coalesce(v_source.name_en, ''))
    order by id
    limit 1
    for update;
  end if;

  if v_target_id is null then
    v_target_id := public.next_table_row_id('public.medicines'::regclass);
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
      v_target_id,
      v_source.name_ar,
      v_source.name_en,
      v_source.barcode,
      0,
      v_source.price,
      v_source.buy_price,
      v_source.expiry,
      p_to_pharmacy_id
    );
    select * into v_target from public.medicines where id = v_target_id;
  else
    select * into v_target from public.medicines where id = v_target_id;
  end if;

  v_source_qty_after := v_source.qty - p_quantity;
  v_target_qty_before := coalesce(v_target.qty, 0);
  v_target_qty_after := v_target_qty_before + p_quantity;

  update public.medicines
  set qty = v_source_qty_after
  where id = v_source.id
    and pharmacy_id = p_from_pharmacy_id;

  update public.medicines
  set qty = v_target_qty_after
  where id = v_target_id
    and pharmacy_id = p_to_pharmacy_id;

  v_movement_notes := coalesce(
    nullif(trim(p_notes), ''),
    format('Transfer %s: %s → %s', p_transfer_number, p_from_pharmacy_id, p_to_pharmacy_id)
  );

  v_movement_out_id := public.next_table_row_id('public.stock_movements'::regclass);
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
    transfer_number,
    notes,
    pharmacy_id,
    user_id,
    user_name
  )
  values (
    v_movement_out_id,
    'branch_transfer_out',
    'branch_transfer_out',
    v_source.id,
    v_source.name_ar,
    v_source.name_en,
    v_source.name_ar,
    v_source.barcode,
    -p_quantity,
    v_source.qty,
    v_source_qty_after,
    p_transfer_number,
    v_movement_notes,
    p_from_pharmacy_id,
    p_user_id,
    p_user_name
  );

  v_movement_in_id := public.next_table_row_id('public.stock_movements'::regclass);
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
    transfer_number,
    notes,
    pharmacy_id,
    user_id,
    user_name
  )
  values (
    v_movement_in_id,
    'branch_transfer_in',
    'branch_transfer_in',
    v_target_id,
    v_target.name_ar,
    v_target.name_en,
    v_target.name_ar,
    v_target.barcode,
    p_quantity,
    v_target_qty_before,
    v_target_qty_after,
    p_transfer_number,
    v_movement_notes,
    p_to_pharmacy_id,
    p_user_id,
    p_user_name
  );

  return v_target_id;
end;
$$;

create or replace function public.execute_branch_stock_transfer_batch(
  p_from_pharmacy_id text,
  p_to_pharmacy_id text,
  p_items jsonb,
  p_transfer_number text,
  p_notes text default null,
  p_user_id text default null,
  p_user_name text default null,
  p_require_approval boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_medicine_id bigint;
  v_quantity integer;
  v_source public.medicines%rowtype;
  v_target_medicine_id bigint;
  v_org_id text;
  v_transfer_id text;
  v_results jsonb := '[]'::jsonb;
  v_row jsonb;
  v_lock_id bigint;
  v_available_qty integer;
begin
  perform public.assert_branch_transfer_write_access(p_from_pharmacy_id, p_to_pharmacy_id);

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;

  if coalesce(trim(p_transfer_number), '') = '' then
    raise exception 'transfer_number_required';
  end if;

  select organization_id
  into v_org_id
  from public.pharmacies
  where id = p_from_pharmacy_id;

  -- Lock and validate all source rows before applying any stock change.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by (value->>'medicine_id')::bigint
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_quantity := floor(coalesce((v_item->>'quantity')::numeric, 0));

    if v_medicine_id is null or v_medicine_id <= 0 or v_quantity <= 0 then
      raise exception 'empty_items';
    end if;

    select id
    into v_lock_id
    from public.medicines
    where id = v_medicine_id
      and pharmacy_id = p_from_pharmacy_id
    for update;

    if not found then
      raise exception 'medicine_not_found';
    end if;

    if not p_require_approval then
      select qty
      into v_available_qty
      from public.medicines
      where id = v_medicine_id
        and pharmacy_id = p_from_pharmacy_id;

      if v_available_qty < v_quantity then
        raise exception 'insufficient_stock';
      end if;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_quantity := floor(coalesce((v_item->>'quantity')::numeric, 0));

    v_transfer_id := gen_random_uuid()::text;
    v_target_medicine_id := null;

    if p_require_approval then
      insert into public.branch_stock_transfers (
        id,
        organization_id,
        transfer_number,
        from_pharmacy_id,
        to_pharmacy_id,
        medicine_id,
        target_medicine_id,
        barcode,
        medicine_name_ar,
        medicine_name_en,
        quantity,
        status,
        notes,
        user_id,
        user_name
      )
      values (
        v_transfer_id,
        v_org_id,
        p_transfer_number,
        p_from_pharmacy_id,
        p_to_pharmacy_id,
        v_source.id,
        null,
        v_source.barcode,
        v_source.name_ar,
        v_source.name_en,
        v_quantity,
        'pending',
        nullif(trim(p_notes), ''),
        p_user_id,
        p_user_name
      );
    else
      v_target_medicine_id := public.apply_branch_stock_transfer_line(
        p_from_pharmacy_id,
        p_to_pharmacy_id,
        v_source.id,
        v_quantity,
        p_transfer_number,
        p_notes,
        p_user_id,
        p_user_name
      );

      insert into public.branch_stock_transfers (
        id,
        organization_id,
        transfer_number,
        from_pharmacy_id,
        to_pharmacy_id,
        medicine_id,
        target_medicine_id,
        barcode,
        medicine_name_ar,
        medicine_name_en,
        quantity,
        status,
        notes,
        user_id,
        user_name
      )
      values (
        v_transfer_id,
        v_org_id,
        p_transfer_number,
        p_from_pharmacy_id,
        p_to_pharmacy_id,
        v_source.id,
        v_target_medicine_id,
        v_source.barcode,
        v_source.name_ar,
        v_source.name_en,
        v_quantity,
        'completed',
        nullif(trim(p_notes), ''),
        p_user_id,
        p_user_name
      );
    end if;

    select to_jsonb(t)
    into v_row
    from public.branch_stock_transfers t
    where t.id = v_transfer_id;

    v_results := v_results || jsonb_build_array(v_row);
  end loop;

  return v_results;
end;
$$;

create or replace function public.approve_branch_stock_transfer_batch(
  p_transfer_number text,
  p_user_id text default null,
  p_user_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.branch_stock_transfers%rowtype;
  v_target_medicine_id bigint;
  v_results jsonb := '[]'::jsonb;
  v_updated jsonb;
begin
  if coalesce(trim(p_transfer_number), '') = '' then
    raise exception 'transfer_not_found';
  end if;

  if not exists (
    select 1
    from public.branch_stock_transfers
    where transfer_number = p_transfer_number
  ) then
    raise exception 'transfer_not_found';
  end if;

  if exists (
    select 1
    from public.branch_stock_transfers
    where transfer_number = p_transfer_number
      and status <> 'pending'
  ) then
    raise exception 'not_pending';
  end if;

  for v_row in
    select *
    from public.branch_stock_transfers
    where transfer_number = p_transfer_number
    order by created_at asc
    for update
  loop
    perform public.assert_branch_transfer_approve_access(v_row.to_pharmacy_id);

    v_target_medicine_id := public.apply_branch_stock_transfer_line(
      v_row.from_pharmacy_id,
      v_row.to_pharmacy_id,
      v_row.medicine_id,
      v_row.quantity,
      v_row.transfer_number,
      v_row.notes,
      coalesce(p_user_id, v_row.user_id),
      coalesce(p_user_name, v_row.user_name)
    );

    update public.branch_stock_transfers
    set
      status = 'completed',
      target_medicine_id = v_target_medicine_id,
      reviewed_by = p_user_id,
      reviewed_by_name = p_user_name,
      reviewed_at = now(),
      rejection_reason = null
    where id = v_row.id
      and status = 'pending';

    select to_jsonb(t)
    into v_updated
    from public.branch_stock_transfers t
    where t.id = v_row.id;

    v_results := v_results || jsonb_build_array(v_updated);
  end loop;

  return v_results;
end;
$$;

revoke all on function public.next_table_row_id(regclass) from public;
revoke all on function public.assert_branch_transfer_write_access(text, text) from public;
revoke all on function public.assert_branch_transfer_approve_access(text) from public;
revoke all on function public.apply_branch_stock_transfer_line(text, text, bigint, integer, text, text, text, text) from public;
revoke all on function public.execute_branch_stock_transfer_batch(text, text, jsonb, text, text, text, text, boolean) from public;
revoke all on function public.approve_branch_stock_transfer_batch(text, text, text) from public;

grant execute on function public.execute_branch_stock_transfer_batch(text, text, jsonb, text, text, text, text, boolean) to authenticated;
grant execute on function public.approve_branch_stock_transfer_batch(text, text, text) to authenticated;

notify pgrst, 'reload schema';
