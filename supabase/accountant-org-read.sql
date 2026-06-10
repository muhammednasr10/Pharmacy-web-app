-- =============================================================================
-- Accountant org-wide read-only — المحاسب يرى بيانات كل فروع المجموعة (قراءة فقط)
-- Run AFTER branch-manager-role.sql
-- =============================================================================

-- 1) Helper
create or replace function public.is_accountant()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role = 'accountant'
      and is_active = true
  );
$$;

grant execute on function public.is_accountant() to anon, authenticated;

-- 2) Write access (unchanged from branch-manager-role)
create or replace function public.can_write_pharmacy_row(row_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_super_admin()
    or row_pharmacy_id = public.current_user_pharmacy_id()
    or (
      public.is_org_pharmacy_admin()
      and public.user_shares_organization(row_pharmacy_id)
    );
$$;

grant execute on function public.can_write_pharmacy_row(text) to anon, authenticated;

-- 3) Read access — includes accountant across organization
create or replace function public.can_read_pharmacy_row(row_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.can_write_pharmacy_row(row_pharmacy_id)
    or (
      public.is_accountant()
      and public.user_shares_organization(row_pharmacy_id)
    );
$$;

grant execute on function public.can_read_pharmacy_row(text) to anon, authenticated;

-- Backward-compatible alias used by INSERT/UPDATE policies
create or replace function public.can_access_pharmacy_row(row_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.can_write_pharmacy_row(row_pharmacy_id);
$$;

-- 4) Tenant tables — SELECT uses can_read; writes stay on can_access (write-only)
do $$
declare
  t text;
  tenant_tables text[] := array[
    'medicines','invoices','invoice_items','returns','purchases',
    'customer_payments','stock_movements','activity_logs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('drop policy if exists "tenant_select" on %I', t);
    execute format(
      'create policy "tenant_select" on %I for select to authenticated
         using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id))',
      t
    );
  end loop;
end $$;

-- 5) pharmacies — accountant lists all org branches
drop policy if exists "pharmacies_select" on pharmacies;

create policy "pharmacies_select" on pharmacies
  for select to authenticated
  using (
    public.is_super_admin()
    or id = public.current_user_pharmacy_id()
    or (
      public.is_org_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
    or (
      public.is_accountant()
      and organization_id = public.current_user_organization_id()
    )
  );

-- 6) branch transfers — accountant can view history across org
drop policy if exists "branch_stock_transfers_select" on branch_stock_transfers;

create policy "branch_stock_transfers_select" on branch_stock_transfers
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and (
        public.can_read_pharmacy_row(from_pharmacy_id)
        or public.can_read_pharmacy_row(to_pharmacy_id)
      )
    )
  );

notify pgrst, 'reload schema';
