-- إصلاح سريع لأعمدة pharmacies + medicines (شغّل هذا لو ظهر خطأ column does not exist)

alter table pharmacies add column if not exists name_en text;
alter table pharmacies add column if not exists phone text;
alter table pharmacies add column if not exists address text;
alter table pharmacies add column if not exists currency text default 'ج.م';
alter table pharmacies add column if not exists is_active boolean default true;
alter table pharmacies add column if not exists invoice_footer text;
alter table pharmacies add column if not exists subscription_plan text default 'monthly';
alter table pharmacies add column if not exists subscription_end_date text;
alter table pharmacies add column if not exists logo_base64 text;

alter table medicines add column if not exists name_ar text;
alter table medicines add column if not exists name_en text;
alter table medicines add column if not exists barcode text;
alter table medicines add column if not exists qty integer default 0;
alter table medicines add column if not exists price numeric default 0;
alter table medicines add column if not exists buy_price numeric;
alter table medicines add column if not exists expiry date;
alter table medicines add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medicines' and column_name = 'quantity'
  ) then
    update medicines set qty = coalesce(qty, quantity::integer, 0);
  end if;
end $$;

-- activity_logs: أعمدة ناقصة (تصلح خطأ "type column not found")
alter table activity_logs add column if not exists type text;
alter table activity_logs add column if not exists title text;
alter table activity_logs add column if not exists description text;
alter table activity_logs add column if not exists reference_type text;
alter table activity_logs add column if not exists reference_id text;
alter table activity_logs add column if not exists pharmacy_id text;
alter table activity_logs add column if not exists user_id text;
alter table activity_logs add column if not exists user_name text;
alter table activity_logs add column if not exists created_at timestamptz default now();
