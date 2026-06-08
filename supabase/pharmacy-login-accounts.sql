-- Pharmacy login account catalog (email / password / role — assign to employees)
-- Run in Supabase SQL Editor after login-account-requests.sql

create table if not exists pharmacy_login_accounts (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references pharmacies(id),
  email text not null,
  password text,
  role text not null,
  employee_id text references employees(id) on delete set null,
  is_active boolean not null default true,
  status text not null default 'pending',
  requested_by text,
  requested_by_name text,
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint pharmacy_login_accounts_role_check
    check (role in ('super_admin', 'pharmacy_admin', 'cashier', 'inventory', 'accountant')),
  constraint pharmacy_login_accounts_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint pharmacy_login_accounts_email_unique unique (pharmacy_id, email)
);

create index if not exists idx_pharmacy_login_accounts_pharmacy
  on pharmacy_login_accounts (pharmacy_id);

create index if not exists idx_pharmacy_login_accounts_employee
  on pharmacy_login_accounts (employee_id);

create index if not exists idx_pharmacy_login_accounts_status
  on pharmacy_login_accounts (status);

alter table pharmacy_login_accounts enable row level security;

drop policy if exists "pharmacy_login_accounts_select" on pharmacy_login_accounts;
drop policy if exists "pharmacy_login_accounts_insert" on pharmacy_login_accounts;
drop policy if exists "pharmacy_login_accounts_update" on pharmacy_login_accounts;
drop policy if exists "pharmacy_login_accounts_delete" on pharmacy_login_accounts;

create policy "pharmacy_login_accounts_select" on pharmacy_login_accounts
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and pharmacy_id = public.current_user_pharmacy_id()
    )
  );

create policy "pharmacy_login_accounts_insert" on pharmacy_login_accounts
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

create policy "pharmacy_login_accounts_update" on pharmacy_login_accounts
  for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_admin()
        and pharmacy_id = public.current_user_pharmacy_id()
      )
    )
  )
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

create policy "pharmacy_login_accounts_delete" on pharmacy_login_accounts
  for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_admin()
        and pharmacy_id = public.current_user_pharmacy_id()
      )
    )
  );

-- Optional: allow login requests without employee (new account slot)
alter table login_account_requests alter column employee_id drop not null;
alter table login_account_requests alter column employee_name drop not null;

notify pgrst, 'reload schema';
