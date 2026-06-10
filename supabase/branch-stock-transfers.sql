-- =============================================================================
-- Branch stock transfers — نقل مخزون بين فروع نفس المجموعة
-- Run AFTER multi-branch-organizations.sql
-- =============================================================================

create table if not exists branch_stock_transfers (
  id text primary key default gen_random_uuid()::text,
  organization_id text references organizations(id),
  transfer_number text not null,
  from_pharmacy_id text not null references pharmacies(id),
  to_pharmacy_id text not null references pharmacies(id),
  medicine_id integer not null,
  target_medicine_id integer,
  barcode text,
  medicine_name_ar text,
  medicine_name_en text,
  quantity integer not null check (quantity > 0),
  notes text,
  user_id text,
  user_name text,
  created_at timestamptz default now()
);

create index if not exists idx_branch_stock_transfers_org
  on branch_stock_transfers (organization_id, created_at desc);

create index if not exists idx_branch_stock_transfers_from
  on branch_stock_transfers (from_pharmacy_id, created_at desc);

create index if not exists idx_branch_stock_transfers_to
  on branch_stock_transfers (to_pharmacy_id, created_at desc);

alter table branch_stock_transfers enable row level security;

drop policy if exists "branch_stock_transfers_select" on branch_stock_transfers;
drop policy if exists "branch_stock_transfers_insert" on branch_stock_transfers;

create policy "branch_stock_transfers_select" on branch_stock_transfers
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and (
        public.can_access_pharmacy_row(from_pharmacy_id)
        or public.can_access_pharmacy_row(to_pharmacy_id)
      )
    )
  );

create policy "branch_stock_transfers_insert" on branch_stock_transfers
  for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_pharmacy_admin()
    and public.can_access_pharmacy_row(from_pharmacy_id)
    and public.can_access_pharmacy_row(to_pharmacy_id)
    and from_pharmacy_id <> to_pharmacy_id
  );

notify pgrst, 'reload schema';
