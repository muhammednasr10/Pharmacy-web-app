-- Employee leave & permission requests
-- Run in Supabase SQL Editor

create table if not exists employee_requests (
  id bigserial primary key,
  request_number text not null,
  pharmacy_id text not null references pharmacies(id),
  employee_id text not null references employees(id) on delete cascade,
  user_id text,
  employee_name text not null,
  request_type text not null,
  work_date text not null,
  end_date text,
  requested_time text,
  reason text,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint employee_requests_type_check check (request_type in ('leave', 'permission')),
  constraint employee_requests_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists idx_employee_requests_pharmacy on employee_requests (pharmacy_id);
create index if not exists idx_employee_requests_employee on employee_requests (employee_id);
create index if not exists idx_employee_requests_status on employee_requests (pharmacy_id, status);
create index if not exists idx_employee_requests_work_date on employee_requests (pharmacy_id, work_date);

alter table employee_requests enable row level security;

drop policy if exists "employee_requests_select" on employee_requests;
drop policy if exists "employee_requests_insert" on employee_requests;
drop policy if exists "employee_requests_update" on employee_requests;

create policy "employee_requests_select" on employee_requests
  for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id())
  );

create policy "employee_requests_insert" on employee_requests
  for insert to authenticated
  with check (
    public.is_active_user()
    and pharmacy_id = public.current_user_pharmacy_id()
  );

create policy "employee_requests_update" on employee_requests
  for update to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or pharmacy_id = public.current_user_pharmacy_id())
  )
  with check (
    public.is_active_user()
    and pharmacy_id = public.current_user_pharmacy_id()
  );

notify pgrst, 'reload schema';
