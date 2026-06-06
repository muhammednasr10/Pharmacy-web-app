-- Quick fix: users_role_check blocks pharmacy_admin
-- Run this in Supabase SQL Editor if migration failed with error 23514

alter table users drop constraint if exists users_role_check;

update users set role = 'pharmacy_admin' where role = 'admin';
update users set role = 'accountant' where role = 'manager';

alter table users add constraint users_role_check check (
  role in ('super_admin', 'pharmacy_admin', 'cashier', 'inventory', 'accountant')
);

-- Ensure trigger also writes pharmacy_admin (not admin)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_pharmacy_id text;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_role := coalesce(new.raw_user_meta_data->>'role', 'cashier');
  v_pharmacy_id := coalesce(new.raw_user_meta_data->>'pharmacy_id', 'main');

  if v_role in ('pharmacy_admin', 'admin') then
    v_role := 'pharmacy_admin';
  elsif v_role = 'manager' then
    v_role := 'accountant';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, true)
  on conflict (uid) do nothing;

  return new;
end;
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
      and role in ('pharmacy_admin', 'admin', 'super_admin')
      and is_active = true
  );
$$;
