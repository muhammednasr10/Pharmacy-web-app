-- =============================================================================
-- إصلاح إضافة موظفين لمدير التجربة (pharmacy_admin)
-- شغّل في Supabase → SQL Editor
--
-- المشكلة: is_active_user() كان يقبل subscription_status = 'active' فقط
--          بينما التجربة المجانية تُسجّل بـ status = 'trial' → RLS يرفض INSERT
-- =============================================================================

-- 1) is_pharmacy_admin — يشمل pharmacy_admin (ليس admin فقط)
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

-- 2) is_active_user — يقبل trial + active (مطابق للتطبيق)
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

-- 3) employees RLS — مدير الصيدلية + نفس الفرع
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
