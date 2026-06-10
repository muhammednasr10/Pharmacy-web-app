-- =============================================================================
-- Multi-branch organizations — مدير الصيدلية يرى كل فروع مجموعته
-- Run in Supabase SQL Editor AFTER multi-tenant-saas.sql
-- Safe to re-run
-- =============================================================================
-- يربط عدة صفوف في pharmacies تحت organization واحدة.
-- المدير (pharmacy_admin) يصل لكل الفروع في نفس المجموعة.
-- الكاشير/المخزن: فرعهم فقط (كما هو).
-- =============================================================================

-- 1) جدول المجموعات / السلاسل
create table if not exists organizations (
  id text primary key,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table organizations enable row level security;

-- 2) ربط الفروع بالمجموعة
alter table pharmacies add column if not exists organization_id text references organizations(id);

create index if not exists idx_pharmacies_organization on pharmacies (organization_id);

-- 3) ترحيل: كل فرع حالياً → مجموعة خاصة به (org-{id})
insert into organizations (id, name)
select 'org-' || p.id, coalesce(nullif(trim(p.name), ''), p.id)
from pharmacies p
where not exists (select 1 from organizations o where o.id = 'org-' || p.id)
on conflict (id) do nothing;

update pharmacies
set organization_id = 'org-' || id
where organization_id is null;

alter table pharmacies alter column organization_id set default 'org-main';

-- لربط فروع موجودة تحت مجموعة واحدة (عدّل المعرفات):
-- update pharmacies set organization_id = 'org-main' where id in ('main', 'maadi', 'nasr-city');

-- 4) دوال مساعدة
create or replace function public.current_user_organization_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.organization_id
  from public.users u
  join public.pharmacies p on p.id = u.pharmacy_id
  where u.uid = auth.uid()::text
    and u.is_active = true
  limit 1;
$$;

create or replace function public.user_shares_organization(target_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.pharmacies home
    join public.pharmacies target on target.id = target_pharmacy_id
    where home.id = public.current_user_pharmacy_id()
      and home.organization_id is not null
      and home.organization_id = target.organization_id
  );
$$;

-- تحديث: المدير يرى كل فروع مجموعته
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
      public.is_pharmacy_admin()
      and public.user_shares_organization(row_pharmacy_id)
    );
$$;

grant execute on function public.current_user_organization_id() to anon, authenticated;
grant execute on function public.user_shares_organization(text) to anon, authenticated;

-- is_pharmacy_admin: يشمل pharmacy_admin و admin
create or replace function public.is_pharmacy_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role in ('admin', 'pharmacy_admin', 'super_admin')
      and is_active = true
  );
$$;

-- 5) RLS — pharmacies
drop policy if exists "pharmacies_select" on pharmacies;
drop policy if exists "pharmacies_insert" on pharmacies;
drop policy if exists "pharmacies_update" on pharmacies;

create policy "pharmacies_select" on pharmacies
  for select to authenticated
  using (
    public.is_super_admin()
    or id = public.current_user_pharmacy_id()
    or (
      public.is_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
  );

create policy "pharmacies_insert" on pharmacies
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
  );

create policy "pharmacies_update" on pharmacies
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_pharmacy_admin()
      and (
        id = public.current_user_pharmacy_id()
        or organization_id = public.current_user_organization_id()
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_admin()
      and organization_id = public.current_user_organization_id()
    )
  );

-- organizations RLS
drop policy if exists "organizations_select" on organizations;
create policy "organizations_select" on organizations
  for select to authenticated
  using (
    public.is_super_admin()
    or id = public.current_user_organization_id()
  );

-- login accounts: مدير المجموعة يرى حسابات كل الفروع
drop policy if exists "pharmacy_login_accounts_select" on pharmacy_login_accounts;
create policy "pharmacy_login_accounts_select" on pharmacy_login_accounts
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and public.can_access_pharmacy_row(pharmacy_id)
    )
  );

notify pgrst, 'reload schema';
