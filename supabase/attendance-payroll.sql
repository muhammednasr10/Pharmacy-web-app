-- Run in Supabase SQL Editor
-- Employee profiles, attendance, and payroll

create table if not exists employee_profiles (
  id bigint primary key,
  pharmacy_id text not null references pharmacies(id),
  user_id text not null,
  user_name text,
  base_salary numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (pharmacy_id, user_id)
);

create table if not exists attendance_records (
  id bigint primary key,
  pharmacy_id text not null references pharmacies(id),
  user_id text not null,
  user_name text,
  work_date text not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (pharmacy_id, user_id, work_date)
);

create table if not exists payroll_records (
  id bigint primary key,
  pharmacy_id text not null references pharmacies(id),
  user_id text not null,
  user_name text,
  period_start text not null,
  period_end text not null,
  working_days integer not null default 0,
  present_days integer not null default 0,
  absent_days integer not null default 0,
  base_salary numeric(12,2) not null default 0,
  calculated_salary numeric(12,2) not null default 0,
  bonuses numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0,
  status text not null default 'draft',
  notes text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_employee_profiles_pharmacy on employee_profiles (pharmacy_id);
create index if not exists idx_attendance_pharmacy_date on attendance_records (pharmacy_id, work_date);
create index if not exists idx_payroll_pharmacy_period on payroll_records (pharmacy_id, period_start, period_end);

alter table employee_profiles enable row level security;
alter table attendance_records enable row level security;
alter table payroll_records enable row level security;

-- employee_profiles
drop policy if exists "employee_profiles_select" on employee_profiles;
drop policy if exists "employee_profiles_insert" on employee_profiles;
drop policy if exists "employee_profiles_update" on employee_profiles;
drop policy if exists "employee_profiles_delete" on employee_profiles;

create policy "employee_profiles_select" on employee_profiles for select to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "employee_profiles_insert" on employee_profiles for insert to authenticated
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "employee_profiles_update" on employee_profiles for update to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()))
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "employee_profiles_delete" on employee_profiles for delete to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

-- attendance_records
drop policy if exists "attendance_records_select" on attendance_records;
drop policy if exists "attendance_records_insert" on attendance_records;
drop policy if exists "attendance_records_update" on attendance_records;
drop policy if exists "attendance_records_delete" on attendance_records;

create policy "attendance_records_select" on attendance_records for select to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "attendance_records_insert" on attendance_records for insert to authenticated
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "attendance_records_update" on attendance_records for update to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()))
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "attendance_records_delete" on attendance_records for delete to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

-- payroll_records
drop policy if exists "payroll_records_select" on payroll_records;
drop policy if exists "payroll_records_insert" on payroll_records;
drop policy if exists "payroll_records_update" on payroll_records;
drop policy if exists "payroll_records_delete" on payroll_records;

create policy "payroll_records_select" on payroll_records for select to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "payroll_records_insert" on payroll_records for insert to authenticated
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "payroll_records_update" on payroll_records for update to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()))
  with check (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));

create policy "payroll_records_delete" on payroll_records for delete to authenticated
  using (public.is_active_user() and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id()));
