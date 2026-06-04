-- =============================================================================
-- Pharmacy Web App — Supabase setup (SQL Editor)
-- Project: https://supabase.com/dashboard/project/uvvnsnkyebujeeusrkqt
--
-- Run sections in order. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) TABLES (skip any block that already exists without error)
-- -----------------------------------------------------------------------------

create table if not exists medicines (
  id bigint primary key,
  name_ar text not null,
  name_en text not null,
  barcode text unique not null,
  qty integer not null,
  price numeric not null,
  buy_price numeric,
  expiry date not null,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id bigint primary key,
  invoice_number text not null,
  date text not null,
  created_at timestamptz default now(),
  subtotal numeric not null,
  discount numeric not null,
  total numeric not null,
  payment_method text not null,
  customer_name text default '',
  cashier_id text,
  cashier_name text,
  pharmacy_id text
);

create table if not exists invoice_items (
  id bigint primary key,
  invoice_id bigint references invoices(id) on delete cascade,
  medicine_id bigint references medicines(id),
  name_ar text not null,
  name_en text not null,
  barcode text not null,
  quantity integer not null,
  unit_price numeric not null,
  line_total numeric not null
);

create table if not exists pharmacies (
  id text primary key,
  name text,
  name_en text,
  phone text,
  address text,
  currency text default 'ج.م',
  is_active boolean default true,
  invoice_footer text,
  subscription_plan text default 'monthly',
  subscription_end_date text,
  logo_base64 text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists users (
  uid text primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'cashier', 'inventory', 'manager')),
  pharmacy_id text not null references pharmacies(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists customer_payments (
  id bigint primary key,
  payment_number text,
  customer_name text,
  amount numeric,
  payment_method text,
  notes text,
  pharmacy_id text,
  user_id text,
  user_name text,
  date text,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id bigint primary key,
  purchase_number text,
  medicine_id bigint,
  medicine_name_ar text,
  medicine_name_en text,
  barcode text,
  quantity integer,
  buy_price numeric,
  sell_price numeric,
  total_cost numeric,
  supplier_name text,
  notes text,
  pharmacy_id text,
  user_id text,
  user_name text,
  date text,
  created_at timestamptz default now()
);

create table if not exists returns (
  id bigint primary key,
  return_number text,
  invoice_number text,
  original_invoice_id bigint,
  pharmacy_id text,
  user_id text,
  user_name text,
  date text,
  created_at timestamptz default now(),
  items jsonb,
  total numeric
);

create table if not exists stock_movements (
  id bigint primary key,
  type text,
  medicine_id bigint,
  medicine_name_ar text,
  medicine_name_en text,
  barcode text,
  quantity_change integer,
  qty_before integer,
  qty_after integer,
  invoice_number text,
  return_number text,
  purchase_number text,
  supplier_name text,
  notes text,
  pharmacy_id text,
  user_id text,
  user_name text,
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id bigint primary key,
  type text,
  title text,
  description text,
  reference_type text,
  reference_id text,
  pharmacy_id text,
  user_id text,
  user_name text,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 1b) MIGRATE — add missing columns to EXISTING tables (fixes "column does not exist")
-- -----------------------------------------------------------------------------

alter table pharmacies add column if not exists name text;
alter table pharmacies add column if not exists name_en text;
alter table pharmacies add column if not exists phone text;
alter table pharmacies add column if not exists address text;
alter table pharmacies add column if not exists currency text default 'ج.م';
alter table pharmacies add column if not exists is_active boolean default true;
alter table pharmacies add column if not exists invoice_footer text;
alter table pharmacies add column if not exists subscription_plan text default 'monthly';
alter table pharmacies add column if not exists subscription_end_date text;
alter table pharmacies add column if not exists logo_base64 text;
alter table pharmacies add column if not exists created_at timestamptz default now();
alter table pharmacies add column if not exists updated_at timestamptz default now();

alter table users add column if not exists name text;
alter table users add column if not exists email text;
alter table users add column if not exists role text;
alter table users add column if not exists pharmacy_id text;
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists created_at timestamptz default now();
alter table users add column if not exists updated_at timestamptz default now();

alter table medicines add column if not exists name_ar text;
alter table medicines add column if not exists name_en text;
alter table medicines add column if not exists barcode text;
alter table medicines add column if not exists qty integer default 0;
alter table medicines add column if not exists price numeric default 0;
alter table medicines add column if not exists buy_price numeric;
alter table medicines add column if not exists expiry date;
alter table medicines add column if not exists created_at timestamptz default now();

-- إذا الجدول القديم فيه quantity بدل qty
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medicines' and column_name = 'quantity'
  ) then
    update medicines set qty = coalesce(qty, quantity::integer, 0) where qty is null or qty = 0;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) ROW LEVEL SECURITY (testing — open access for anon/authenticated)
--    Replace with secure policies before production.
-- -----------------------------------------------------------------------------

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

-- Drop old policies if re-running
do $$
declare
  t text;
  tables text[] := array[
    'medicines','invoices','invoice_items','pharmacies','users',
    'customer_payments','purchases','returns','stock_movements','activity_logs'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "app_allow_all" on %I', t);
    execute format(
      'create policy "app_allow_all" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3) SEED — pharmacy + link admin user
-- -----------------------------------------------------------------------------

insert into pharmacies (
  id, name, name_en, phone, address, currency, is_active,
  invoice_footer, subscription_plan, subscription_end_date
) values (
  'main',
  'صيدلية Focus',
  'Focus Pharmacy',
  '01000000000',
  'القاهرة',
  'ج.م',
  true,
  'شكراً لزيارتكم',
  'monthly',
  '2099-12-31'
)
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  phone = excluded.phone,
  address = excluded.address,
  currency = excluded.currency,
  is_active = excluded.is_active,
  updated_at = now();

-- IMPORTANT: Replace ADMIN_AUTH_UID with UUID from:
-- Dashboard → Authentication → Users → admin user → copy User UID

-- Example (your current admin from DB check):
-- uid: 01616d9c-1b2d-4f8c-a31e-149bcb73dd2e

insert into users (uid, name, email, role, pharmacy_id, is_active)
values (
  '01616d9c-1b2d-4f8c-a31e-149bcb73dd2e',  -- ← غيّر هذا إذا UID مختلف
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
  is_active = excluded.is_active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 4) OPTIONAL — sample cashier row (Auth user must exist first!)
--    Step A: Authentication → Add user → cashier@focus-pharmacy.eg + password
--    Step B: Copy UID, paste below instead of YOUR_CASHIER_UID
-- -----------------------------------------------------------------------------

/*
insert into users (uid, name, email, role, pharmacy_id, is_active)
values (
  'YOUR_CASHIER_UID',
  'محمد نصر',
  'cashier@focus-pharmacy.eg',
  'cashier',
  'main',
  true
)
on conflict (uid) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
*/

-- -----------------------------------------------------------------------------
-- 5) OPTIONAL — demo medicine
-- -----------------------------------------------------------------------------

insert into medicines (id, name_ar, name_en, barcode, qty, price, buy_price, expiry)
values (
  1001,
  'باراسيتامول 500',
  'Paracetamol 500',
  '6281000001001',
  50,
  25,
  18,
  '2027-12-31'
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6) VERIFY
-- -----------------------------------------------------------------------------

select 'pharmacies' as tbl, count(*) as rows from pharmacies
union all select 'users', count(*) from users
union all select 'medicines', count(*) from medicines;
