-- =============================================================================
-- إصلاح اعتماد طلبات الاشتراك لـ Super Admin
-- شغّل في Supabase → SQL Editor
-- =============================================================================

-- دوال مساعدة (إن لم تكن موجودة من multi-tenant-saas.sql)
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role = 'super_admin'
      and is_active = true
  );
$$;

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
      and role in ('admin', 'super_admin')
      and is_active = true
  );
$$;

grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_pharmacy_admin() to anon, authenticated;

-- pharmacies: Super Admin يعدّل أي صيدلية
alter table pharmacies enable row level security;

drop policy if exists "app_allow_all" on pharmacies;
drop policy if exists "pharmacies_select" on pharmacies;
drop policy if exists "pharmacies_write" on pharmacies;
drop policy if exists "pharmacies_insert" on pharmacies;
drop policy if exists "pharmacies_update" on pharmacies;
drop policy if exists "pharmacies_delete" on pharmacies;

create policy "pharmacies_select" on pharmacies
  for select to authenticated
  using (
    public.is_super_admin()
    or id = (
      select pharmacy_id from public.users
      where uid = auth.uid()::text and is_active = true
      limit 1
    )
  );

create policy "pharmacies_insert" on pharmacies
  for insert to authenticated
  with check (public.is_super_admin());

create policy "pharmacies_update" on pharmacies
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_pharmacy_admin()
      and id = (
        select pharmacy_id from public.users
        where uid = auth.uid()::text and is_active = true
        limit 1
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_admin()
      and id = (
        select pharmacy_id from public.users
        where uid = auth.uid()::text and is_active = true
        limit 1
      )
    )
  );

create policy "pharmacies_delete" on pharmacies
  for delete to authenticated
  using (public.is_super_admin());

-- subscription_requests: قراءة/تحديث للمستخدم النشط + Super Admin
alter table subscription_requests enable row level security;

drop policy if exists "subscription_requests_authenticated" on subscription_requests;
drop policy if exists "subscription_requests_select" on subscription_requests;
drop policy if exists "subscription_requests_insert" on subscription_requests;
drop policy if exists "subscription_requests_update" on subscription_requests;

create policy "subscription_requests_select" on subscription_requests
  for select to authenticated
  using (
    public.is_super_admin()
    or pharmacy_id = (
      select pharmacy_id from public.users
      where uid = auth.uid()::text and is_active = true
      limit 1
    )
  );

create policy "subscription_requests_insert" on subscription_requests
  for insert to authenticated
  with check (
    public.is_pharmacy_admin()
    and pharmacy_id = (
      select pharmacy_id from public.users
      where uid = auth.uid()::text and is_active = true
      limit 1
    )
  );

create policy "subscription_requests_update" on subscription_requests
  for update to authenticated
  using (public.is_super_admin() or public.is_pharmacy_admin())
  with check (public.is_super_admin() or public.is_pharmacy_admin());
