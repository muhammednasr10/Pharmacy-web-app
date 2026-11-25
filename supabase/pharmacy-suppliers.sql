-- Pharmacy suppliers registry (موردين الصيدلية)
-- Run in Supabase SQL Editor after customers-crm.sql

create table if not exists public.pharmacy_suppliers (
  id bigint primary key,
  pharmacy_id text not null,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  company text default '',
  notes text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists pharmacy_suppliers_pharmacy_id_idx
  on public.pharmacy_suppliers (pharmacy_id);

create index if not exists pharmacy_suppliers_name_idx
  on public.pharmacy_suppliers (pharmacy_id, name);

alter table public.pharmacy_suppliers enable row level security;

drop policy if exists "tenant_select" on public.pharmacy_suppliers;
drop policy if exists "tenant_insert" on public.pharmacy_suppliers;
drop policy if exists "tenant_update" on public.pharmacy_suppliers;
drop policy if exists "tenant_delete" on public.pharmacy_suppliers;

create policy "tenant_select" on public.pharmacy_suppliers for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));
create policy "tenant_insert" on public.pharmacy_suppliers for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_update" on public.pharmacy_suppliers for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
create policy "tenant_delete" on public.pharmacy_suppliers for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );
