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

create policy "tenant_select" on pharmacy_costs for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));
create policy "tenant_insert" on pharmacy_costs for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_update" on pharmacy_costs for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_delete" on pharmacy_costs for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );
