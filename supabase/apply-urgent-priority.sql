-- =============================================================================
-- الأولويات العاجلة — شغّل في Supabase → SQL Editor
--
-- يطبّق: إصلاح موظفين + التجربة المجانية (is_active_user + employees RLS)
--
-- بعد هذا الملف شغّل بالترتيب (كل ملف من supabase/ منفصل):
--   1. custom-app-auth.sql
--   2. fix-jwt-encoding.sql
--   3. reset-owner-login.sql  (ضع JWT Secret أولاً)
--   4. fix-trial-registration.sql
--   5. medicine-catalog-import.sql
--   6. medicine-catalog-reference.sql
--   7. customers-crm.sql
--   8. subscription-feature-gating.sql
--   9. clear-all-medicines.sql  (قبل استيراد داتا جديدة)
--
-- Edge Functions:
--   supabase functions deploy app-auth
--   supabase functions deploy process-secure-attendance
-- =============================================================================

-- ── إصلاح موظفين + trial (نفس fix-employees-rls-pharmacy-admin.sql) ─────────

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
      and role in ('pharmacy_admin', 'admin', 'super_admin')
      and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    join public.pharmacies p on p.id = u.pharmacy_id
    where u.uid = auth.uid()::text
      and u.is_active = true
      and p.is_active = true
      and coalesce(p.subscription_status, 'active') in ('active', 'trial')
  ) or public.is_super_admin();
$$;

alter table public.employees enable row level security;

drop policy if exists "employees_select" on public.employees;
drop policy if exists "employees_insert" on public.employees;
drop policy if exists "employees_update" on public.employees;
drop policy if exists "employees_delete" on public.employees;

create policy "employees_select" on public.employees for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id())
  );

create policy "employees_insert" on public.employees for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  );

create policy "employees_update" on public.employees for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  );

create policy "employees_delete" on public.employees for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  );

grant execute on function public.is_pharmacy_admin() to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;

notify pgrst, 'reload schema';
