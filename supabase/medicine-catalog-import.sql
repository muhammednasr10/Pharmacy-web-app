-- =============================================================================
-- استيراد كatalog الأدوية — Medicine catalog import (replace + batch insert)
-- شغّل في Supabase → SQL Editor
-- =============================================================================

-- السماح بفك ارتباط الفواتير القديمة عند حذف الأدوية
alter table invoice_items drop constraint if exists invoice_items_medicine_id_fkey;
alter table invoice_items
  add constraint invoice_items_medicine_id_fkey
  foreign key (medicine_id) references medicines(id) on delete set null;

alter table purchases drop constraint if exists purchases_medicine_id_fkey;

do $$
begin
  alter table purchases
    add constraint purchases_medicine_id_fkey
    foreign key (medicine_id) references medicines(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- إصلاح توليد المعرفات عندما يكون id نصاً أو bigint
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

create or replace function public.clear_pharmacy_medicine_catalog(p_pharmacy_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'forbidden';
  end if;

  if coalesce(trim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  update invoice_items ii
  set medicine_id = null
  where medicine_id in (
    select id from medicines where pharmacy_id = p_pharmacy_id
  );

  update purchases p
  set medicine_id = null
  where medicine_id in (
    select id from medicines where pharmacy_id = p_pharmacy_id
  );

  delete from stock_movements sm
  where sm.medicine_id in (
    select id from medicines where pharmacy_id = p_pharmacy_id
  );

  delete from medicines where pharmacy_id = p_pharmacy_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.import_medicine_catalog_batch(
  p_pharmacy_id text,
  p_rows jsonb
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
  v_barcode text;
  v_name_ar text;
  v_name_en text;
  v_price numeric;
  v_buy_price numeric;
  v_expiry date;
  v_qty integer;
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
    v_id := v_next_id;
    v_next_id := v_next_id + 1;

    v_barcode := coalesce(
      case jsonb_typeof(v_row -> 'barcode')
        when 'string' then nullif(btrim(v_row ->> 'barcode'), '')
        when 'number' then v_row ->> 'barcode'
        else null
      end,
      'EG' || lpad(v_id::text, 10, '0')
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

    insert into medicines (
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
      v_id,
      v_name_ar,
      v_name_en,
      v_barcode,
      v_qty,
      v_price,
      v_buy_price,
      v_expiry,
      p_pharmacy_id
    );

    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_inserted);
end;
$$;

revoke all on function public.clear_pharmacy_medicine_catalog(text) from public;
grant execute on function public.clear_pharmacy_medicine_catalog(text) to authenticated;

revoke all on function public.import_medicine_catalog_batch(text, jsonb) from public;
grant execute on function public.import_medicine_catalog_batch(text, jsonb) to authenticated;
