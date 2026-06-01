-- Supabase schema for Pharmacy Web App
-- The following tables are created for project migration and testing only.
-- Remove or tighten row level security policies before using in production.

create table if not exists medicines (
  id bigint primary key,
  name_ar text not null,
  name_en text not null,
  barcode text unique not null,
  qty integer not null,
  price numeric not null,
  buy_price numeric,
  expiry date not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists invoices (
  id bigint primary key,
  invoice_number text not null,
  date text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
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

alter table medicines enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;

-- Temporary policy rules for initial testing only. Replace with secure policies in production.
create policy "Allow read/write for testing" on medicines
  for all
  using (true)
  with check (true);

create policy "Allow read/write for testing" on invoices
  for all
  using (true)
  with check (true);

create policy "Allow read/write for testing" on invoice_items
  for all
  using (true)
  with check (true);

-- Additional support tables used by the app but not part of the main requested schema.
create table if not exists pharmacies (
  id text primary key,
  name text,
  name_en text,
  phone text,
  address text,
  currency text,
  is_active boolean,
  invoice_footer text,
  subscription_plan text,
  subscription_end_date text,
  logo_base64 text
);

create table if not exists users (
  uid text primary key,
  name text,
  email text,
  role text,
  pharmacy_id text,
  is_active boolean
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
  created_at timestamp with time zone default timezone('utc'::text, now())
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
  created_at timestamp with time zone default timezone('utc'::text, now())
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
  created_at timestamp with time zone default timezone('utc'::text, now()),
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
  created_at timestamp with time zone default timezone('utc'::text, now())
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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table users enable row level security;
create policy "Allow read/write for testing" on users
  for all
  using (true)
  with check (true);

alter table customer_payments enable row level security;
create policy "Allow read/write for testing" on customer_payments
  for all
  using (true)
  with check (true);

alter table purchases enable row level security;
create policy "Allow read/write for testing" on purchases
  for all
  using (true)
  with check (true);

alter table returns enable row level security;
create policy "Allow read/write for testing" on returns
  for all
  using (true)
  with check (true);

alter table stock_movements enable row level security;
create policy "Allow read/write for testing" on stock_movements
  for all
  using (true)
  with check (true);

alter table activity_logs enable row level security;
create policy "Allow read/write for testing" on activity_logs
  for all
  using (true)
  with check (true);
