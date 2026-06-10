-- =============================================================================
-- Branch manager role — مدير فرع (فرع واحد) vs مدير عام (pharmacy_admin)
-- Run AFTER multi-branch-organizations.sql
-- =============================================================================

-- 1) Role constraint
alter table users drop constraint if exists users_role_check;

alter table users add constraint users_role_check check (
  role in ('super_admin', 'pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant')
);

-- Legacy admin → pharmacy_admin (org admin)
update users set role = 'pharmacy_admin' where role = 'admin';

-- 2) Helpers
create or replace function public.is_org_pharmacy_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role in ('pharmacy_admin', 'admin', 'super_admin')
      and is_active = true
  );
$$;

create or replace function public.is_branch_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role = 'branch_manager'
      and is_active = true
  );
$$;

-- Any pharmacy manager (org or branch)
create or replace function public.is_pharmacy_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_pharmacy_admin() or public.is_branch_manager();
$$;

-- Keep is_pharmacy_admin = org admin only (for backward-compatible policy names)
create or replace function public.is_pharmacy_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_pharmacy_admin();
$$;

-- Org admin sees all org branches; branch manager only home branch
create or replace function public.can_access_pharmacy_row(row_pharmacy_id text)
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

grant execute on function public.is_org_pharmacy_admin() to anon, authenticated;
grant execute on function public.is_branch_manager() to anon, authenticated;
grant execute on function public.is_pharmacy_manager() to anon, authenticated;

-- 3) pharmacies RLS — org admin only for multi-branch listing / create
drop policy if exists "pharmacies_select" on pharmacies;
drop policy if exists "pharmacies_insert" on pharmacies;
drop policy if exists "pharmacies_update" on pharmacies;

create policy "pharmacies_select" on pharmacies
  for select to authenticated
  using (
    public.is_super_admin()
    or id = public.current_user_pharmacy_id()
    or (
      public.is_org_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
  );

create policy "pharmacies_insert" on pharmacies
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_org_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
  );

create policy "pharmacies_update" on pharmacies
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_org_pharmacy_admin()
      and (
        id = public.current_user_pharmacy_id()
        or organization_id = public.current_user_organization_id()
      )
    )
    or (
      public.is_branch_manager()
      and id = public.current_user_pharmacy_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_org_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
    or (
      public.is_branch_manager()
      and id = public.current_user_pharmacy_id()
    )
  );

-- branch transfers: org admin only
drop policy if exists "branch_stock_transfers_insert" on branch_stock_transfers;

create policy "branch_stock_transfers_insert" on branch_stock_transfers
  for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_org_pharmacy_admin()
    and public.can_access_pharmacy_row(from_pharmacy_id)
    and public.can_access_pharmacy_row(to_pharmacy_id)
    and from_pharmacy_id <> to_pharmacy_id
  );

-- login accounts catalog: allow branch_manager role slot
alter table pharmacy_login_accounts drop constraint if exists pharmacy_login_accounts_role_check;
alter table pharmacy_login_accounts add constraint pharmacy_login_accounts_role_check
  check (role in ('super_admin', 'pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant'));

notify pgrst, 'reload schema';
