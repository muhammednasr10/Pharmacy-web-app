-- =============================================================================
-- انسخ هذا الملف كاملاً → Supabase SQL Editor → Run
-- آمن للتكرار (لن يحذف بياناتك)
-- =============================================================================

-- 1) أعمدة ناقصة
alter table pharmacies add column if not exists name_en text;
alter table pharmacies add column if not exists phone text;
alter table pharmacies add column if not exists address text;
alter table pharmacies add column if not exists currency text default 'ج.م';
alter table pharmacies add column if not exists is_active boolean default true;
alter table pharmacies add column if not exists invoice_footer text;
alter table pharmacies add column if not exists subscription_plan text default 'monthly';
alter table pharmacies add column if not exists subscription_end_date text;
alter table pharmacies add column if not exists logo_base64 text;

alter table users add column if not exists is_active boolean default true;

alter table medicines add column if not exists name_ar text;
alter table medicines add column if not exists name_en text;
alter table medicines add column if not exists barcode text;
alter table medicines add column if not exists qty integer default 0;
alter table medicines add column if not exists price numeric default 0;
alter table medicines add column if not exists buy_price numeric;
alter table medicines add column if not exists expiry date;
alter table medicines add column if not exists created_at timestamptz default now();
alter table medicines add column if not exists pharmacy_id text default 'main';
update medicines set pharmacy_id = 'main' where pharmacy_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medicines' and column_name = 'quantity'
  ) then
    update medicines set qty = coalesce(qty, quantity::integer, 0);
  end if;
end $$;

alter table activity_logs add column if not exists type text;
alter table activity_logs add column if not exists title text;
alter table activity_logs add column if not exists description text;
alter table activity_logs add column if not exists reference_type text;
alter table activity_logs add column if not exists reference_id text;
alter table activity_logs add column if not exists pharmacy_id text;
alter table activity_logs add column if not exists user_id text;
alter table activity_logs add column if not exists user_name text;
alter table activity_logs add column if not exists created_at timestamptz default now();

-- 2) صلاحيات (RLS) للتجربة
alter table medicines enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table pharmacies enable row level security;
alter table users enable row level security;
alter table customer_payments enable row level security;
alter table purchases enable row level security;
alter table returns enable row level security;
alter table stock_movements enable row level security;
alter table activity_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'medicines','invoices','invoice_items','pharmacies','users',
    'customer_payments','purchases','returns','stock_movements','activity_logs'
  ] loop
    execute format('drop policy if exists "app_allow_all" on %I', t);
    execute format(
      'create policy "app_allow_all" on %I for all using (true) with check (true)', t
    );
  end loop;
end $$;

-- 3) بيانات أساسية
insert into pharmacies (id, name, name_en, phone, address, currency, is_active)
values ('main', 'صيدلية Focus', 'Focus Pharmacy', '01000000000', 'القاهرة', 'ج.م', true)
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  phone = excluded.phone,
  address = excluded.address,
  currency = excluded.currency,
  is_active = excluded.is_active;

-- غيّر UID من: Authentication → Users → admin → Copy UUID
insert into users (uid, name, email, role, pharmacy_id, is_active)
values (
  '01616d9c-1b2d-4f8c-a31e-149bcb73dd2e',
  'Admin',
  'admin@pharmacy.com',
  'admin',
  'main',
  true
)
on conflict (uid) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  pharmacy_id = excluded.pharmacy_id,
  is_active = excluded.is_active;

-- 4) دواء تجريبي
insert into medicines (id, name_ar, name_en, barcode, qty, price, buy_price, expiry)
values (1001, 'باراسيتامول 500', 'Paracetamol 500', '6281000001001', 50, 25, 18, '2027-12-31')
on conflict (id) do nothing;

-- 5) تحقق
select 'pharmacies' as tbl, count(*) as rows from pharmacies
union all select 'users', count(*) from users
union all select 'medicines', count(*) from medicines;
