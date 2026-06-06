-- Employees vs login accounts separation
-- Run in Supabase SQL Editor after multi-tenant-saas.sql

-- -----------------------------------------------------------------------------
-- 1) employees table
-- -----------------------------------------------------------------------------

create table if not exists employees (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references pharmacies(id),
  name text not null,
  phone text,
  job_title text,
  employee_code text,
  salary numeric(12,2) default 0,
  commission_rate numeric(5,2) default 0,
  required_work_hours numeric(4,2) not null default 8,
  hire_date date,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_employees_pharmacy on employees (pharmacy_id);
create index if not exists idx_employees_active on employees (pharmacy_id, is_active);
create unique index if not exists employees_pharmacy_code_unique
  on employees (pharmacy_id, lower(employee_code))
  where employee_code is not null and employee_code <> '';

-- -----------------------------------------------------------------------------
-- 2) extend users table
-- -----------------------------------------------------------------------------

alter table users add column if not exists employee_id text;
alter table users add column if not exists username text;
alter table users add column if not exists last_login_at timestamptz;

-- FK after employees exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_employee_id_fkey'
  ) then
    alter table users
      add constraint users_employee_id_fkey
      foreign key (employee_id) references employees(id) on delete set null;
  end if;
end $$;

create unique index if not exists users_username_pharmacy_unique
  on users (pharmacy_id, lower(username))
  where username is not null and username <> '';

-- Role rename: admin -> pharmacy_admin
-- IMPORTANT: drop the old check constraint BEFORE updating roles
alter table users drop constraint if exists users_role_check;

update users set role = 'pharmacy_admin' where role = 'admin';
update users set role = 'accountant' where role = 'manager';

alter table users add constraint users_role_check check (
  role in ('super_admin', 'pharmacy_admin', 'cashier', 'inventory', 'accountant')
);

-- -----------------------------------------------------------------------------
-- 3) migrate existing users into employees (one employee per user row)
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
  new_employee_id text;
begin
  for r in
    select uid, pharmacy_id, name, is_active, created_at, employee_id
    from public.users
    where employee_id is null
  loop
    new_employee_id := gen_random_uuid()::text;
    insert into public.employees (id, pharmacy_id, name, is_active, hire_date)
    values (
      new_employee_id,
      r.pharmacy_id,
      r.name,
      coalesce(r.is_active, true),
      coalesce(r.created_at::date, current_date)
    );
    update public.users set employee_id = new_employee_id where uid = r.uid;
  end loop;
end $$;

-- Sync salary from employee_profiles if present
update public.employees e
set salary = ep.base_salary
from public.employee_profiles ep
join public.users u on u.uid = ep.user_id
where u.employee_id = e.id
  and ep.base_salary > 0;

-- -----------------------------------------------------------------------------
-- 4) helper: is_pharmacy_admin includes pharmacy_admin
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 5) RLS — employees
-- -----------------------------------------------------------------------------

alter table employees enable row level security;

drop policy if exists "employees_select" on employees;
drop policy if exists "employees_insert" on employees;
drop policy if exists "employees_update" on employees;
drop policy if exists "employees_delete" on employees;

create policy "employees_select" on employees for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id())
  );

create policy "employees_insert" on employees for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  );

create policy "employees_update" on employees for update to authenticated
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

create policy "employees_delete" on employees for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    )
  );

-- -----------------------------------------------------------------------------
-- 6) update auth trigger role normalization
-- -----------------------------------------------------------------------------

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

  if v_role = 'pharmacy_admin' or v_role = 'admin' then
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
