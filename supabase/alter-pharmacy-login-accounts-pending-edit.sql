-- Pending edit requests on approved login accounts (status stays approved until you approve the edit)

alter table pharmacy_login_accounts
  add column if not exists pending_email text,
  add column if not exists pending_password text,
  add column if not exists pending_role text,
  add column if not exists edit_pending boolean not null default false,
  add column if not exists edit_requested_by text,
  add column if not exists edit_requested_by_name text,
  add column if not exists edit_requested_at timestamptz;

create index if not exists idx_pharmacy_login_accounts_edit_pending
  on pharmacy_login_accounts (edit_pending)
  where edit_pending = true;

notify pgrst, 'reload schema';
