-- =============================================================================
-- إصلاح المشتريات والتوريد (شغّل مرة واحدة في Supabase → SQL Editor)
-- يصلح:
--   • الباركود المكرر بين الفروع
--   • أعمدة purchases الناقصة (barcode, medicine_name, ...)
-- =============================================================================

-- 1) medicines: باركود فريد لكل فرع (مش على كل النظام)
alter table medicines add column if not exists pharmacy_id text;

update medicines
set pharmacy_id = coalesce(nullif(trim(pharmacy_id), ''), 'main')
where pharmacy_id is null or trim(pharmacy_id) = '';

alter table medicines drop constraint if exists medicines_barcode_key;
alter table medicines drop constraint if exists medicines_barcode_unique;

drop index if exists medicines_barcode_key;
drop index if exists medicines_barcode_unique;
drop index if exists medicines_pharmacy_barcode_unique;

-- إزالة أي unique index قديم على barcode فقط
do $$
declare
  idx record;
begin
  for idx in
    select c.relname as index_name, pg_get_indexdef(i.indexrelid) as index_def
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_class t on t.oid = i.indrelid
    where t.relname = 'medicines'
      and i.indisunique
  loop
    if idx.index_def ilike '%barcode%'
       and idx.index_def not ilike '%pharmacy_id%' then
      execute format('drop index if exists %I', idx.index_name);
    end if;
  end loop;
end $$;

create unique index if not exists medicines_pharmacy_barcode_unique
  on medicines (pharmacy_id, barcode);

-- 2) purchases: كل الأعمدة المطلوبة
alter table purchases add column if not exists purchase_number text;
alter table purchases add column if not exists medicine_id bigint;
alter table purchases add column if not exists medicine_name text;
alter table purchases add column if not exists medicine_name_ar text;
alter table purchases add column if not exists medicine_name_en text;
alter table purchases add column if not exists barcode text;
alter table purchases add column if not exists quantity integer default 0;
alter table purchases add column if not exists buy_price numeric default 0;
alter table purchases add column if not exists sell_price numeric default 0;
alter table purchases add column if not exists total_cost numeric default 0;
alter table purchases add column if not exists supplier_name text;
alter table purchases add column if not exists notes text;
alter table purchases add column if not exists pharmacy_id text default 'main';
alter table purchases add column if not exists user_id text;
alter table purchases add column if not exists user_name text;
alter table purchases add column if not exists date text;
alter table purchases add column if not exists created_at timestamptz default now();

update purchases
set medicine_name = coalesce(nullif(trim(medicine_name), ''), medicine_name_ar, medicine_name_en, '—')
where medicine_name is null or trim(medicine_name) = '';

update purchases set pharmacy_id = 'main' where pharmacy_id is null;

-- 3) السماح بعدة أصناف تحت نفس رقم التوريد (إزالة unique على purchase_number)
alter table purchases drop constraint if exists purchases_purchase_number_key;
drop index if exists purchases_purchase_number_key;

create index if not exists idx_purchases_pharmacy on purchases (pharmacy_id);
create index if not exists idx_purchases_number on purchases (purchase_number);
