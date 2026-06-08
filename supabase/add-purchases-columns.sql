-- أعمدة جدول purchases الناقصة (شغّل في Supabase SQL Editor)
-- يصلح: Could not find the 'barcode' column of 'purchases' in the schema cache

alter table purchases add column if not exists purchase_number text;
alter table purchases add column if not exists medicine_id bigint;
alter table purchases add column if not exists medicine_name text;
alter table purchases add column if not exists medicine_name_ar text;
alter table purchases add column if not exists medicine_name_en text;

update purchases
set medicine_name = coalesce(nullif(trim(medicine_name), ''), medicine_name_ar, medicine_name_en, '—')
where medicine_name is null or trim(medicine_name) = '';
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

update purchases set pharmacy_id = 'main' where pharmacy_id is null;

alter table purchases drop constraint if exists purchases_purchase_number_key;
drop index if exists purchases_purchase_number_key;

create index if not exists idx_purchases_pharmacy on purchases (pharmacy_id);
create index if not exists idx_purchases_number on purchases (purchase_number);
