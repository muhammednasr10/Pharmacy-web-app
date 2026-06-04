-- =============================================================================
-- Pharmacy Web App — Secure Row Level Security (PRODUCTION)
-- شغّل هذا في Supabase → SQL Editor بعد setup-complete.sql / run-in-sql-editor.sql
--
-- الفكرة:
--   • أي طلب لازم يكون من مستخدم مسجّل دخول (authenticated) وموجود في users ونشط.
--   • مفتاح anon وحده (من غير تسجيل دخول) لن يقدر يقرأ أو يكتب أي بيانات.
--   • إضافة/تعديل/حذف المستخدمين للمدير (admin) فقط.
--
-- آمن للتكرار. لا يحذف بيانات.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) دوال مساعدة (SECURITY DEFINER لتجنّب تكرار RLS على جدول users)
-- -----------------------------------------------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_active_user() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) جداول البيانات العامة: مسموح فقط للمستخدم المسجّل والنشط
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
  data_tables text[] := array[
    'medicines','invoices','invoice_items',
    'customer_payments','purchases','returns',
    'stock_movements','activity_logs'
  ];
begin
  foreach t in array data_tables loop
    execute format('alter table %I enable row level security', t);
    -- إزالة السياسة المفتوحة القديمة
    execute format('drop policy if exists "app_allow_all" on %I', t);
    execute format('drop policy if exists "authenticated_active" on %I', t);
    -- سياسة آمنة: مستخدم مسجّل ونشط فقط
    execute format(
      'create policy "authenticated_active" on %I
         for all
         to authenticated
         using (public.is_active_user())
         with check (public.is_active_user())',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3) جدول pharmacies: القراءة للمستخدم النشط، التعديل للمدير فقط
-- -----------------------------------------------------------------------------

alter table pharmacies enable row level security;

drop policy if exists "app_allow_all" on pharmacies;
drop policy if exists "pharmacies_select" on pharmacies;
drop policy if exists "pharmacies_write" on pharmacies;

create policy "pharmacies_select" on pharmacies
  for select
  to authenticated
  using (public.is_active_user());

create policy "pharmacies_write" on pharmacies
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4) جدول users: المستخدم يقرأ صفّه فقط، المدير يقرأ/يدير الكل
--    (إضافة أول admin تتم من SQL Editor لأنها تتجاوز RLS)
-- -----------------------------------------------------------------------------

alter table users enable row level security;

drop policy if exists "app_allow_all" on users;
drop policy if exists "users_select" on users;
drop policy if exists "users_insert" on users;
drop policy if exists "users_update" on users;
drop policy if exists "users_delete" on users;

-- قراءة: صفّك أنت، أو الكل لو مدير
create policy "users_select" on users
  for select
  to authenticated
  using ( uid = auth.uid()::text or public.is_admin() );

-- إضافة: للمدير فقط
create policy "users_insert" on users
  for insert
  to authenticated
  with check ( public.is_admin() );

-- تعديل: للمدير فقط
create policy "users_update" on users
  for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- حذف: للمدير فقط، ولا يحذف نفسه
create policy "users_delete" on users
  for delete
  to authenticated
  using ( public.is_admin() and uid <> auth.uid()::text );

-- -----------------------------------------------------------------------------
-- 5) تحقق سريع من السياسات المفعّلة
-- -----------------------------------------------------------------------------

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
