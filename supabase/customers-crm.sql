-- CRM: customer profiles + activities (notes & follow-ups)
-- Run in Supabase SQL Editor

create table if not exists customers (
  id bigint primary key,
  pharmacy_id text not null,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  birth_date date,
  gender text default '',
  segment text not null default 'regular',
  tags text[] not null default '{}',
  notes text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists customers_pharmacy_id_idx on customers (pharmacy_id);
create index if not exists customers_phone_idx on customers (pharmacy_id, phone);

create table if not exists customer_activities (
  id bigint primary key,
  pharmacy_id text not null,
  customer_id bigint references customers(id) on delete cascade,
  customer_name text default '',
  activity_type text not null default 'note',
  title text default '',
  body text default '',
  due_date date,
  status text not null default 'open',
  created_by_uid text default '',
  created_by_name text default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists customer_activities_pharmacy_id_idx on customer_activities (pharmacy_id);
create index if not exists customer_activities_customer_id_idx on customer_activities (customer_id);
create index if not exists customer_activities_status_idx on customer_activities (pharmacy_id, status);

alter table customers enable row level security;
alter table customer_activities enable row level security;

create policy "Allow read/write for testing" on customers
  for all using (true) with check (true);

create policy "Allow read/write for testing" on customer_activities
  for all using (true) with check (true);
