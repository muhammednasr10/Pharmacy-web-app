-- Ignore non-numeric medicine ids (e.g. demo-med-6010) when allocating next bigint ids.
-- Fixes: invalid input syntax for type bigint: "demo-med-6010" during catalog import.

create or replace function public.max_numeric_text_id(p_table regclass)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  execute format(
    'select coalesce(max(id::bigint), 0::bigint) from %1$s where id ~ ''^[0-9]+$''',
    p_table
  )
    into v_max;
  return coalesce(v_max, 0);
end;
$$;

revoke all on function public.max_numeric_text_id(regclass) from public;
grant execute on function public.max_numeric_text_id(regclass) to authenticated;

create or replace function public.next_table_row_id(p_table regclass)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.max_numeric_text_id(p_table) + 1 + floor(random() * 17)::bigint;
end;
$$;

create or replace function public.seed_pharmacy_from_catalog_reference_page(
  p_pharmacy_id text,
  p_after_id bigint default 0,
  p_limit integer default 400
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_inserted integer := 0;
  v_next_id bigint;
  v_last_id bigint := coalesce(p_after_id, 0);
  v_done boolean := false;
  v_ids bigint[];
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 400), 800));

  select array_agg(page.id order by page.id)
    into v_ids
  from (
    select ref.id
    from public.medicine_catalog_reference ref
    where ref.id > coalesce(p_after_id, 0)
    order by ref.id
    limit v_limit
  ) page;

  if v_ids is null or coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object(
      'inserted', 0,
      'last_id', coalesce(p_after_id, 0),
      'done', true
    );
  end if;

  v_last_id := v_ids[array_upper(v_ids, 1)];
  v_next_id := public.max_numeric_text_id('public.medicines'::regclass) + 1;

  insert into public.medicines (
    id,
    name_ar,
    name_en,
    active_ingredient,
    barcode,
    qty,
    price,
    buy_price,
    expiry,
    pharmacy_id
  )
  select
    v_next_id + row_number() over (order by ref.id) - 1,
    ref.name_ar,
    ref.name_en,
    ref.active_ingredient,
    ref.barcode,
    ref.qty,
    ref.price,
    ref.buy_price,
    ref.expiry,
    p_pharmacy_id
  from public.medicine_catalog_reference ref
  where ref.id = any (v_ids);

  get diagnostics v_inserted = row_count;

  v_done := not exists (
    select 1
    from public.medicine_catalog_reference ref
    where ref.id > v_last_id
    limit 1
  );

  return jsonb_build_object(
    'inserted', v_inserted,
    'last_id', v_last_id,
    'done', v_done
  );
end;
$$;

create or replace function public.sync_pharmacy_from_catalog_reference_page(
  p_pharmacy_id text,
  p_after_id bigint default 0,
  p_limit integer default 400
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_next_id bigint;
  v_last_id bigint := coalesce(p_after_id, 0);
  v_done boolean := false;
  v_ids bigint[];
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 400), 800));

  select array_agg(page.id order by page.id)
    into v_ids
  from (
    select ref.id
    from public.medicine_catalog_reference ref
    where ref.id > coalesce(p_after_id, 0)
    order by ref.id
    limit v_limit
  ) page;

  if v_ids is null or coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object(
      'inserted', 0,
      'updated', 0,
      'last_id', coalesce(p_after_id, 0),
      'done', true
    );
  end if;

  v_last_id := v_ids[array_upper(v_ids, 1)];

  update public.medicines m
  set
    name_ar = ref.name_ar,
    name_en = ref.name_en,
    active_ingredient = ref.active_ingredient,
    price = ref.price
  from public.medicine_catalog_reference ref
  where m.pharmacy_id = p_pharmacy_id
    and m.barcode = ref.barcode
    and ref.id = any (v_ids);

  get diagnostics v_updated = row_count;

  v_next_id := public.max_numeric_text_id('public.medicines'::regclass) + 1;

  insert into public.medicines (
    id,
    name_ar,
    name_en,
    active_ingredient,
    barcode,
    qty,
    price,
    buy_price,
    expiry,
    pharmacy_id
  )
  select
    v_next_id + row_number() over (order by ref.id) - 1,
    ref.name_ar,
    ref.name_en,
    ref.active_ingredient,
    ref.barcode,
    ref.qty,
    ref.price,
    ref.buy_price,
    ref.expiry,
    p_pharmacy_id
  from public.medicine_catalog_reference ref
  where ref.id = any (v_ids)
    and not exists (
      select 1
      from public.medicines m
      where m.pharmacy_id = p_pharmacy_id
        and m.barcode = ref.barcode
    );

  get diagnostics v_inserted = row_count;

  v_done := not exists (
    select 1
    from public.medicine_catalog_reference ref
    where ref.id > v_last_id
    limit 1
  );

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'last_id', v_last_id,
    'done', v_done
  );
end;
$$;
