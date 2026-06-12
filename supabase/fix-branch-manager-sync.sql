-- Fix: branch_manager login accounts sync as cashier
-- Run in Supabase SQL Editor if branch@pharmacy.com (or similar) shows role = cashier
--
-- Causes:
-- 1) sync_auth_user_for_login_account rejected branch_manager (old RPC)
-- 2) users_role_check did not allow branch_manager
-- 3) Auth trigger defaulted new users to cashier

-- 1) Allow branch_manager in users table
alter table users drop constraint if exists users_role_check;

alter table users add constraint users_role_check check (
  role in ('super_admin', 'pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant')
);

alter table pharmacy_login_accounts drop constraint if exists pharmacy_login_accounts_role_check;
alter table pharmacy_login_accounts add constraint pharmacy_login_accounts_role_check
  check (role in ('super_admin', 'pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant'));

-- 2) RPC: accept branch_manager when linking catalog → users
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
set search_path = public
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

  if v_role not in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  ) then
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

  return v_uid;
end;
$$;

revoke all on function public.sync_auth_user_for_login_account(text, text, text, text, text) from public;
grant execute on function public.sync_auth_user_for_login_account(text, text, text, text, text) to authenticated;

-- 3) Fix catalog + app user rows for branch manager slot
update pharmacy_login_accounts
set role = 'branch_manager', updated_at = now()
where lower(email) = 'branch@pharmacy.com'
  and role is distinct from 'branch_manager';

update users
set role = 'branch_manager', updated_at = now()
where lower(email) = 'branch@pharmacy.com'
  and role is distinct from 'branch_manager';

notify pgrst, 'reload schema';
