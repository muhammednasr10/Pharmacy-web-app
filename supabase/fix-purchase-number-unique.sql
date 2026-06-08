-- إصلاح سريع: السماح بعدة أصناف لنفس رقم التوريد
-- يصلح: duplicate key "purchases_purchase_number_key"

alter table purchases drop constraint if exists purchases_purchase_number_key;
drop index if exists purchases_purchase_number_key;

create index if not exists idx_purchases_number on purchases (purchase_number);
