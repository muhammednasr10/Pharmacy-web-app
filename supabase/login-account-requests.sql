-- Login account creation requests (pharmacy admin → super admin approval)
-- Run in Supabase SQL Editor

create table if not exists login_account_requests (
  id bigserial primary key,
  request_number text not null,
  pharmacy_id text not null references pharmacies(id),
  pharmacy_name text,
  employee_id text references employees(id) on delete cascade,
  employee_name text,
  email text not null,
  username text not null,
  password text,
  role text not null,
  status text not null default 'pending',
  requested_by text,
  requested_by_name text,
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  reviewed_at timestamptz,
  constraint login_account_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint login_account_requests_role_check
    check (role in ('super_admin', 'pharmacy_admin', 'cashier', 'inventory', 'accountant'))
);

create index if not exists idx_login_account_requests_pharmacy
  on login_account_requests (pharmacy_id);

create index if not exists idx_login_account_requests_status
  on login_account_requests (status);

create index if not exists idx_login_account_requests_employee
  on login_account_requests (employee_id);

alter table login_account_requests enable row level security;

drop policy if exists "login_account_requests_select" on login_account_requests;
drop policy if exists "login_account_requests_insert" on login_account_requests;
drop policy if exists "login_account_requests_update" on login_account_requests;

create policy "login_account_requests_select" on login_account_requests
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and pharmacy_id = public.current_user_pharmacy_id()
    )
  );

create policy "login_account_requests_insert" on login_account_requests
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_admin()
        and pharmacy_id = public.current_user_pharmacy_id()
      )
    )
  );

create policy "login_account_requests_update" on login_account_requests
  for update to authenticated
  using (
    public.is_active_user()
    and public.is_super_admin()
  )
  with check (
    public.is_active_user()
    and public.is_super_admin()
  );

notify pgrst, 'reload schema';
