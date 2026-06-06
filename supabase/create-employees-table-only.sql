-- Minimal fix: create employees table if migration was not run yet
-- Run in Supabase → SQL Editor → Run

create table if not exists public.employees (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references public.pharmacies(id),
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

create index if not exists idx_employees_pharmacy on public.employees (pharmacy_id);
create unique index if not exists employees_pharmacy_code_unique
  on public.employees (pharmacy_id, lower(employee_code))
  where employee_code is not null and employee_code <> '';

alter table public.users add column if not exists employee_id text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists last_login_at timestamptz;

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

-- Refresh API schema cache so the app sees the new table immediately
notify pgrst, 'reload schema';
