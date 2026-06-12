-- =============================================================================
-- مزامنة دور حسابات الدخول تلقائياً (بدون تعديل يدوي في Supabase)
-- Run in Supabase SQL Editor
--
-- يحل: إنشاء مستخدم في Auth فيصبح cashier دائماً، أو دور مخصص (مثل دليفرى) لا يُقبل.
--
-- شغّل أولاً إن لم يكن منفّذاً:
--   1) supabase/pharmacy-custom-roles.sql
--   2) supabase/fix-branch-manager-sync.sql (اختياري لمدير الفرع)
-- ثم هذا الملف.
-- =============================================================================

-- 1) السماح بالأدوار المدمجة + custom_* في users و pharmacy_login_accounts
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (
  role in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  )
  or role ~ '^custom_[a-z0-9_]+$'
);

alter table pharmacy_login_accounts drop constraint if exists pharmacy_login_accounts_role_check;
alter table pharmacy_login_accounts add constraint pharmacy_login_accounts_role_check check (
  role in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  )
  or role ~ '^custom_[a-z0-9_]+$'
);

create or replace function public.is_valid_login_account_role(p_role text, p_pharmacy_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when trim(p_role) in (
      'super_admin',
      'pharmacy_admin',
      'branch_manager',
      'cashier',
      'inventory',
      'accountant'
    ) then true
    when trim(p_role) ~ '^custom_[a-z0-9_]+$' then exists (
      select 1
      from public.pharmacy_custom_roles cr
      where cr.pharmacy_id = p_pharmacy_id
        and cr.role_key = trim(p_role)
        and cr.is_active = true
    )
    else false
  end;
$$;

-- 2) RPC الربط: يحدّث public.users + بيانات Auth (raw_user_meta_data)
create or replace function public.sync_auth_user_for_login_account(
  p_email text,
  p_role text,
  p_pharmacy_id text,
  p_employee_id text default null,
  p_name text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid text;
  v_email text := lower(trim(p_email));
  v_role text := trim(p_role);
  v_name text;
  v_username text;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'not_authorized';
  end if;

  if not public.can_write_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  if v_email = '' then
    raise exception 'email_required';
  end if;

  if v_role = 'admin' then
    v_role := 'pharmacy_admin';
  end if;

  if not public.is_valid_login_account_role(v_role, p_pharmacy_id) then
    raise exception 'invalid_role';
  end if;

  select id::text
  into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'auth_user_not_found';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  v_username := split_part(v_email, '@', 1);

  insert into public.users (uid, name, email, role, pharmacy_id, employee_id, username, is_active)
  values (
    v_uid,
    v_name,
    v_email,
    v_role,
    p_pharmacy_id,
    nullif(trim(p_employee_id), ''),
    v_username,
    true
  )
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pharmacy_id = excluded.pharmacy_id,
    employee_id = coalesce(excluded.employee_id, public.users.employee_id),
    username = coalesce(public.users.username, excluded.username),
    is_active = true,
    updated_at = now();

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'role', v_role,
      'pharmacy_id', p_pharmacy_id,
      'name', v_name
    )
  where id::text = v_uid;

  return v_uid;
end;
$$;

revoke all on function public.is_valid_login_account_role(text, text) from public;
grant execute on function public.is_valid_login_account_role(text, text) to authenticated;

revoke all on function public.sync_auth_user_for_login_account(text, text, text, text, text) from public;
grant execute on function public.sync_auth_user_for_login_account(text, text, text, text, text) to authenticated;

-- 3) عند إنشاء مستخدم Auth: إن وُجد حساب معتمد في الكتالوج بنفس الإيميل، خذ دوره تلقائياً
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
  v_pharmacy_id text;
  v_employee_id text;
  v_from_catalog boolean := false;
  v_catalog record;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  select pla.role, pla.pharmacy_id, pla.employee_id
  into v_catalog
  from public.pharmacy_login_accounts pla
  where lower(pla.email) = lower(new.email)
    and pla.status = 'approved'
  order by pla.updated_at desc nulls last, pla.created_at desc nulls last
  limit 1;

  if found then
    v_from_catalog := true;
    v_role := trim(v_catalog.role);
    v_pharmacy_id := v_catalog.pharmacy_id;
    v_employee_id := nullif(trim(v_catalog.employee_id), '');
  else
    v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'cashier');
    v_pharmacy_id := coalesce(nullif(trim(new.raw_user_meta_data->>'pharmacy_id'), ''), 'main');
    v_employee_id := null;
  end if;

  if v_role = 'admin' then
    v_role := 'pharmacy_admin';
  elsif v_role = 'manager' then
    v_role := 'accountant';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, employee_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, v_employee_id, true)
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pharmacy_id = excluded.pharmacy_id,
    employee_id = coalesce(excluded.employee_id, public.users.employee_id),
    is_active = true,
    updated_at = now()
  where v_from_catalog;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

notify pgrst, 'reload schema';
