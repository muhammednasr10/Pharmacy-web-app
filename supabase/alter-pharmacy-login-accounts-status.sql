-- Approval workflow for pharmacy login accounts
alter table pharmacy_login_accounts
  add column if not exists status text not null default 'approved';

alter table pharmacy_login_accounts
  add column if not exists requested_by text;

alter table pharmacy_login_accounts
  add column if not exists requested_by_name text;

alter table pharmacy_login_accounts
  add column if not exists reviewed_by text;

alter table pharmacy_login_accounts
  add column if not exists reviewed_by_name text;

alter table pharmacy_login_accounts
  add column if not exists review_note text;

alter table pharmacy_login_accounts
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pharmacy_login_accounts_status_check'
  ) then
    alter table pharmacy_login_accounts
      add constraint pharmacy_login_accounts_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_pharmacy_login_accounts_status
  on pharmacy_login_accounts (status);

notify pgrst, 'reload schema';
