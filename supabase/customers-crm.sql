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

-- Tenant policies — run rls-remove-dev-policies.sql or multi-tenant-saas pattern after this file.
drop policy if exists "Allow read/write for testing" on customers;
drop policy if exists "Allow read/write for testing" on customer_activities;

create policy "tenant_select" on customers for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));
create policy "tenant_insert" on customers for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_update" on customers for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_delete" on customers for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );

create policy "tenant_select" on customer_activities for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));
create policy "tenant_insert" on customer_activities for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_update" on customer_activities for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_delete" on customer_activities for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );
