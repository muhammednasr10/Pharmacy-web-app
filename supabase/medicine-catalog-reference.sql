-- =============================================================================
-- الكتالوج المركزي للأدوية — Central medicine catalog (import CSV once)
-- 1) Run this file in SQL Editor
-- 2) Table Editor → medicine_catalog_reference → Import CSV → egyptian-medicine-catalog.csv
-- 3) From the app: "تحديث الكتالوج" (يحافظ على الكميات) أو "استيراد من الصفر"
-- =============================================================================

create table if not exists public.medicine_catalog_reference (
  id bigserial primary key,
  name_ar text not null,
  name_en text not null,
  active_ingredient text,
  barcode text not null,
  qty integer not null default 0,
  price numeric not null default 0,
  buy_price numeric,
  expiry date not null default date '2099-12-31',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists medicine_catalog_reference_barcode_key
  on public.medicine_catalog_reference (barcode);

alter table public.medicine_catalog_reference enable row level security;

drop policy if exists medicine_catalog_reference_read on public.medicine_catalog_reference;
create policy medicine_catalog_reference_read
  on public.medicine_catalog_reference
  for select
  to authenticated
  using (true);

-- Managers import CSV via dashboard (service role) — no client insert policy needed.

create or replace function public.seed_pharmacy_from_catalog_reference(p_pharmacy_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
  v_inserted integer;
  v_next_id bigint;
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

  v_deleted := public.clear_pharmacy_medicine_catalog(p_pharmacy_id);

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
  from public.medicine_catalog_reference ref;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object('deleted', v_deleted, 'inserted', v_inserted);
end;
$$;

-- تحديث الكتالوج مع الحفاظ على الكميات (مطابقة بالباركود)
create or replace function public.sync_pharmacy_from_catalog_reference(p_pharmacy_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
  v_inserted integer;
  v_next_id bigint;
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

  update public.medicines m
  set
    name_ar = ref.name_ar,
    name_en = ref.name_en,
    active_ingredient = ref.active_ingredient,
    price = ref.price
  from public.medicine_catalog_reference ref
  where m.pharmacy_id = p_pharmacy_id
    and m.barcode = ref.barcode;

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
  where not exists (
    select 1
    from public.medicines m
    where m.pharmacy_id = p_pharmacy_id
      and m.barcode = ref.barcode
  );

  get diagnostics v_inserted = row_count;

  return jsonb_build_object('updated', v_updated, 'inserted', v_inserted);
end;
$$;

revoke all on function public.seed_pharmacy_from_catalog_reference(text) from public;
grant execute on function public.seed_pharmacy_from_catalog_reference(text) to authenticated;

revoke all on function public.sync_pharmacy_from_catalog_reference(text) from public;
grant execute on function public.sync_pharmacy_from_catalog_reference(text) to authenticated;
