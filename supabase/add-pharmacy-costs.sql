-- Pharmacy operational costs (التكاليف)
-- Run in Supabase SQL Editor

create table if not exists pharmacy_costs (
  id bigint primary key,
  cost_number text,
  title text not null,
  category text,
  amount numeric not null default 0,
  payment_method text,
  notes text,
  pharmacy_id text,
  user_id text,
  user_name text,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists pharmacy_costs_pharmacy_id_idx on pharmacy_costs (pharmacy_id);
create index if not exists pharmacy_costs_created_at_idx on pharmacy_costs (created_at desc);

alter table pharmacy_costs enable row level security;

drop policy if exists "Allow read/write for testing" on pharmacy_costs;
create policy "Allow read/write for testing" on pharmacy_costs
  for all
  using (true)
  with check (true);
