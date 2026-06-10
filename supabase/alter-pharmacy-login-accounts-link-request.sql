-- Link requests from pharmacy admin (super admin performs the actual sync)

alter table pharmacy_login_accounts
  add column if not exists link_request_pending boolean not null default false,
  add column if not exists link_requested_by text,
  add column if not exists link_requested_by_name text,
  add column if not exists link_requested_at timestamptz;

create index if not exists idx_pharmacy_login_accounts_link_request_pending
  on pharmacy_login_accounts (link_request_pending)
  where link_request_pending = true;

notify pgrst, 'reload schema';
