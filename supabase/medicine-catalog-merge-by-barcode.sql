-- =============================================================================
-- Merge CSV catalog by barcode — selective field updates + insert new rows
-- Run after medicine-catalog-import.sql
-- =============================================================================

create or replace function public.merge_medicine_catalog_batch(
  p_pharmacy_id text,
  p_rows jsonb,
  p_update_price boolean default true,
  p_update_buy_price boolean default true,
  p_update_qty boolean default true,
  p_update_expiry boolean default true,
  p_update_barcode boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_id bigint;
  v_next_id bigint;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_barcode text;
  v_name_ar text;
  v_name_en text;
  v_active_ingredient text;
  v_price numeric;
  v_buy_price numeric;
  v_expiry date;
  v_qty integer;
  v_existing_id bigint;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows';
  end if;

  select coalesce(max(id::bigint), 0::bigint) + 1
    into v_next_id
  from public.medicines;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_barcode := coalesce(
      case jsonb_typeof(v_row -> 'barcode')
        when 'string' then nullif(btrim(v_row ->> 'barcode'), '')
        when 'number' then v_row ->> 'barcode'
        else null
      end,
      ''
    );

    v_name_ar := left(
      coalesce(
        case jsonb_typeof(v_row -> 'name_ar')
          when 'string' then nullif(btrim(v_row ->> 'name_ar'), '')
          when 'number' then v_row ->> 'name_ar'
          else null
        end,
        '—'
      ),
      500
    );

    v_name_en := left(
      coalesce(
        case jsonb_typeof(v_row -> 'name_en')
          when 'string' then nullif(btrim(v_row ->> 'name_en'), '')
          when 'number' then v_row ->> 'name_en'
          else null
        end,
        v_name_ar
      ),
      500
    );

    v_active_ingredient := left(
      coalesce(
        case jsonb_typeof(v_row -> 'active_ingredient')
          when 'string' then nullif(btrim(v_row ->> 'active_ingredient'), '')
          when 'number' then v_row ->> 'active_ingredient'
          else null
        end,
        null
      ),
      500
    );

    v_price := greatest(
      0::numeric,
      coalesce(
        case jsonb_typeof(v_row -> 'price')
          when 'number' then (v_row ->> 'price')::numeric
          when 'string' then nullif(v_row ->> 'price', '')::numeric
          else null::numeric
        end,
        0::numeric
      )
    );

    v_buy_price := coalesce(
      case jsonb_typeof(v_row -> 'buy_price')
        when 'number' then (v_row ->> 'buy_price')::numeric
        when 'string' then nullif(v_row ->> 'buy_price', '')::numeric
        else null::numeric
      end,
      case when v_price > 0::numeric then round(v_price * 0.85, 2) else null::numeric end
    );

    v_qty := greatest(
      0,
      coalesce(
        case jsonb_typeof(v_row -> 'qty')
          when 'number' then (v_row ->> 'qty')::integer
          when 'string' then nullif(v_row ->> 'qty', '')::integer
          else null::integer
        end,
        0
      )
    );

    v_expiry := coalesce(
      case jsonb_typeof(v_row -> 'expiry')
        when 'string' then nullif(btrim(v_row ->> 'expiry'), '')::date
        else null::date
      end,
      date '2099-12-31'
    );

    v_existing_id := null;
    if v_barcode <> '' then
      select m.id::bigint
        into v_existing_id
      from public.medicines m
      where m.pharmacy_id = p_pharmacy_id
        and m.barcode = v_barcode
      order by m.id
      limit 1;
    end if;

    if v_existing_id is not null then
      if not (
        coalesce(p_update_price, false)
        or coalesce(p_update_buy_price, false)
        or coalesce(p_update_qty, false)
        or coalesce(p_update_expiry, false)
        or coalesce(p_update_barcode, false)
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      update public.medicines m
      set
        price = case when coalesce(p_update_price, false) then v_price else m.price end,
        buy_price = case when coalesce(p_update_buy_price, false) then v_buy_price else m.buy_price end,
        qty = case when coalesce(p_update_qty, false) then v_qty else m.qty end,
        expiry = case when coalesce(p_update_expiry, false) then v_expiry else m.expiry end,
        barcode = case
          when coalesce(p_update_barcode, false) and v_barcode <> '' then v_barcode
          else m.barcode
        end
      where m.id = v_existing_id
        and m.pharmacy_id = p_pharmacy_id;

      v_updated := v_updated + 1;
    else
      if v_barcode = '' then
        v_barcode := 'EG' || lpad(v_next_id::text, 10, '0');
      end if;

      v_id := v_next_id;
      v_next_id := v_next_id + 1;

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
      values (
        v_id,
        v_name_ar,
        v_name_en,
        v_active_ingredient,
        v_barcode,
        v_qty,
        v_price,
        v_buy_price,
        v_expiry,
        p_pharmacy_id
      );

      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped
  );
end;
$$;

create or replace function public.count_pharmacy_medicines_by_barcodes(
  p_pharmacy_id text,
  p_barcodes text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager() or public.is_active_user()) then
    raise exception 'forbidden';
  end if;

  if coalesce(btrim(p_pharmacy_id), '') = '' then
    return 0;
  end if;

  if p_barcodes is null or coalesce(cardinality(p_barcodes), 0) = 0 then
    return 0;
  end if;

  select count(*)::integer
    into v_count
  from public.medicines m
  where m.pharmacy_id = p_pharmacy_id
    and m.barcode = any (p_barcodes);

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.merge_medicine_catalog_batch(text, jsonb, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.merge_medicine_catalog_batch(text, jsonb, boolean, boolean, boolean, boolean, boolean) to authenticated;

revoke all on function public.count_pharmacy_medicines_by_barcodes(text, text[]) from public;
grant execute on function public.count_pharmacy_medicines_by_barcodes(text, text[]) to authenticated;

notify pgrst, 'reload schema';
