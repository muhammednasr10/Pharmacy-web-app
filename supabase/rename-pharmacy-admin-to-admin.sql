-- Run once in Supabase SQL Editor
-- Renames pharmacy_admin -> admin (simpler role name)
-- IMPORTANT: drop constraint FIRST, then update rows, then re-add constraint

alter table users drop constraint if exists users_role_check;

update users set role = 'admin' where role = 'pharmacy_admin';

alter table users add constraint users_role_check check (
  role in ('super_admin', 'admin', 'cashier', 'inventory', 'accountant')
);

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
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'cashier');
  v_pharmacy_id := coalesce(nullif(trim(new.raw_user_meta_data->>'pharmacy_id'), ''), 'main');

  if v_role = 'pharmacy_admin' then v_role := 'admin'; end if;
  if v_role = 'manager' then v_role := 'accountant'; end if;
  if v_role not in ('super_admin', 'admin', 'cashier', 'inventory', 'accountant') then
    v_role := 'cashier';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, true)
  on conflict (uid) do nothing;

  return new;
end;
$$;

select uid, email, role, pharmacy_id from users order by email;
