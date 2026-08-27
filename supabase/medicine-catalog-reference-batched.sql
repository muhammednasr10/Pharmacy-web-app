-- =============================================================================
-- Batched catalog seed/sync — avoids statement timeout on ~25k+ medicines
-- Run after medicine-catalog-reference.sql
-- =============================================================================

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

  select coalesce(max(id::bigint), 0::bigint) + 1
    into v_next_id
  from public.medicines;

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

create or replace function public.seed_pharmacy_from_catalog_reference(p_pharmacy_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
  v_inserted integer := 0;
  v_after_id bigint := 0;
  v_page jsonb;
  v_guard integer := 0;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not exists (select 1 from public.medicine_catalog_reference limit 1) then
    raise exception 'catalog_reference_empty';
  end if;

  perform set_config('statement_timeout', '120s', true);

  v_deleted := public.clear_pharmacy_medicine_catalog(p_pharmacy_id);

  loop
    v_guard := v_guard + 1;
    if v_guard > 500 then
      raise exception 'catalog_seed_too_large_use_batched';
    end if;

    v_page := public.seed_pharmacy_from_catalog_reference_page(p_pharmacy_id, v_after_id, 400);
    v_inserted := v_inserted + coalesce((v_page->>'inserted')::integer, 0);
    v_after_id := coalesce((v_page->>'last_id')::bigint, v_after_id);

    exit when coalesce((v_page->>'done')::boolean, true);
  end loop;

  return jsonb_build_object('deleted', v_deleted, 'inserted', v_inserted);
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
  v_updated integer := 0;
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
      'updated', 0,
      'inserted', 0,
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

  select coalesce(max(id::bigint), 0::bigint) + 1
    into v_next_id
  from public.medicines;

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
    'updated', v_updated,
    'inserted', v_inserted,
    'last_id', v_last_id,
    'done', v_done
  );
end;
$$;

create or replace function public.sync_pharmacy_from_catalog_reference(p_pharmacy_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
  v_inserted integer := 0;
  v_after_id bigint := 0;
  v_page jsonb;
  v_guard integer := 0;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not exists (select 1 from public.medicine_catalog_reference limit 1) then
    raise exception 'catalog_reference_empty';
  end if;

  perform set_config('statement_timeout', '120s', true);

  loop
    v_guard := v_guard + 1;
    if v_guard > 500 then
      raise exception 'catalog_sync_too_large_use_batched';
    end if;

    v_page := public.sync_pharmacy_from_catalog_reference_page(p_pharmacy_id, v_after_id, 400);
    v_updated := v_updated + coalesce((v_page->>'updated')::integer, 0);
    v_inserted := v_inserted + coalesce((v_page->>'inserted')::integer, 0);
    v_after_id := coalesce((v_page->>'last_id')::bigint, v_after_id);

    exit when coalesce((v_page->>'done')::boolean, true);
  end loop;

  return jsonb_build_object('updated', v_updated, 'inserted', v_inserted);
end;
$$;

revoke all on function public.seed_pharmacy_from_catalog_reference_page(text, bigint, integer) from public;
grant execute on function public.seed_pharmacy_from_catalog_reference_page(text, bigint, integer) to authenticated;

revoke all on function public.sync_pharmacy_from_catalog_reference_page(text, bigint, integer) from public;
grant execute on function public.sync_pharmacy_from_catalog_reference_page(text, bigint, integer) to authenticated;

revoke all on function public.seed_pharmacy_from_catalog_reference(text) from public;
grant execute on function public.seed_pharmacy_from_catalog_reference(text) to authenticated;

revoke all on function public.sync_pharmacy_from_catalog_reference(text) from public;
grant execute on function public.sync_pharmacy_from_catalog_reference(text) to authenticated;

notify pgrst, 'reload schema';
