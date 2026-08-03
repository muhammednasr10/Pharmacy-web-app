-- Stats + admin batch import for medicine_catalog_reference
-- Run after medicine-catalog-reference.sql

create or replace function public.get_medicine_catalog_reference_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_updated_at timestamptz;
begin
  if not public.is_active_user() then
    raise exception 'forbidden';
  end if;

  select count(*), max(created_at)
    into v_total, v_updated_at
  from public.medicine_catalog_reference;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'updated_at', v_updated_at
  );
end;
$$;

create or replace function public.import_medicine_catalog_reference_batch(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted integer;
begin
  if not (
    public.is_super_admin()
    or current_user in ('postgres', 'supabase_admin', 'authenticator')
  ) then
    raise exception 'forbidden';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('upserted', 0);
  end if;

  insert into public.medicine_catalog_reference (
    name_ar,
    name_en,
    active_ingredient,
    barcode,
    qty,
    price,
    buy_price,
    expiry
  )
  select
    btrim(r.name_ar),
    btrim(r.name_en),
    nullif(btrim(r.active_ingredient), ''),
    btrim(r.barcode),
    coalesce(r.qty, 0),
    coalesce(r.price, 0),
    r.buy_price,
    coalesce(r.expiry, date '2099-12-31')
  from jsonb_to_recordset(p_rows) as r(
    name_ar text,
    name_en text,
    active_ingredient text,
    barcode text,
    qty integer,
    price numeric,
    buy_price numeric,
    expiry date
  )
  where coalesce(btrim(r.barcode), '') <> ''
    and (coalesce(btrim(r.name_ar), '') <> '' or coalesce(btrim(r.name_en), '') <> '')
  on conflict (barcode) do update set
    name_ar = excluded.name_ar,
    name_en = excluded.name_en,
    active_ingredient = excluded.active_ingredient,
    price = excluded.price,
    buy_price = excluded.buy_price;

  get diagnostics v_upserted = row_count;

  return jsonb_build_object('upserted', coalesce(v_upserted, 0));
end;
$$;

revoke all on function public.get_medicine_catalog_reference_stats() from public;
grant execute on function public.get_medicine_catalog_reference_stats() to authenticated;

revoke all on function public.import_medicine_catalog_reference_batch(jsonb) from public;
grant execute on function public.import_medicine_catalog_reference_batch(jsonb) to authenticated;
grant execute on function public.import_medicine_catalog_reference_batch(jsonb) to service_role;

notify pgrst, 'reload schema';
