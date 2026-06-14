-- =============================================================================
-- مزامنة حسابات Supabase Auth → كتالوج حسابات الدخول (يظهر فوراً في البرنامج)
-- Run in Supabase SQL Editor AFTER:
--   supabase/pharmacy-login-accounts.sql
--   supabase/fix-login-account-role-sync.sql (للتحقق من الأدوار المخصصة)
-- =============================================================================

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
  v_signup_type text;
  v_from_catalog boolean := false;
  v_catalog record;
begin
  v_signup_type := coalesce(nullif(trim(new.raw_user_meta_data->>'signup_type'), ''), '');
  if v_signup_type = 'trial_pharmacy' then
    return new;
  end if;

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

  if not public.is_valid_login_account_role(v_role, v_pharmacy_id) then
    v_role := 'cashier';
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

  if not v_from_catalog
    and v_role <> 'super_admin'
    and new.email is not null
    and trim(new.email) <> ''
  then
    insert into public.pharmacy_login_accounts (
      id,
      pharmacy_id,
      email,
      password,
      role,
      employee_id,
      is_active,
      status,
      review_note,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid()::text,
      v_pharmacy_id,
      lower(trim(new.email)),
      '',
      v_role,
      null,
      true,
      'approved',
      'auto_from_auth',
      now(),
      now()
    )
    on conflict (pharmacy_id, email) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ربط الحسابات القديمة في Auth التي ليس لها صف في الكتالوج
insert into public.pharmacy_login_accounts (
  id,
  pharmacy_id,
  email,
  password,
  role,
  employee_id,
  is_active,
  status,
  review_note,
  created_at,
  updated_at
)
select
  gen_random_uuid()::text,
  u.pharmacy_id,
  lower(trim(u.email)),
  '',
  u.role,
  nullif(trim(u.employee_id), ''),
  coalesce(u.is_active, true),
  'approved',
  'auto_from_auth',
  coalesce(u.created_at, now()),
  now()
from public.users u
where u.email is not null
  and trim(u.email) <> ''
  and u.role <> 'super_admin'
  and not exists (
    select 1
    from public.pharmacy_login_accounts pla
    where pla.pharmacy_id = u.pharmacy_id
      and lower(pla.email) = lower(trim(u.email))
  );

-- تحديث فوري في صفحة حسابات الدخول
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.pharmacy_login_accounts;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.users;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
