-- السماح بنفس الباركود في فروع مختلفة
-- (يفضّل تشغيل fix-purchases-complete.sql مرة واحدة — يشمل هذا الإصلاح)

alter table medicines add column if not exists pharmacy_id text;

update medicines
set pharmacy_id = coalesce(nullif(trim(pharmacy_id), ''), 'main')
where pharmacy_id is null or trim(pharmacy_id) = '';

alter table medicines drop constraint if exists medicines_barcode_key;
alter table medicines drop constraint if exists medicines_barcode_unique;

drop index if exists medicines_barcode_key;
drop index if exists medicines_barcode_unique;
drop index if exists medicines_pharmacy_barcode_unique;

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
