-- =============================================================================
-- Org-wide login accounts — المدير العام يدير حسابات دخول كل فروع المجموعة
-- Run AFTER accountant-org-read.sql (uses can_read_pharmacy_row / can_write_pharmacy_row)
-- =============================================================================

-- pharmacy_login_accounts — write across organization branches
drop policy if exists "pharmacy_login_accounts_insert" on pharmacy_login_accounts;
drop policy if exists "pharmacy_login_accounts_update" on pharmacy_login_accounts;
drop policy if exists "pharmacy_login_accounts_delete" on pharmacy_login_accounts;

create policy "pharmacy_login_accounts_insert" on pharmacy_login_accounts
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
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
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
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
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

-- users — org managers read/link accounts for every branch in the organization
drop policy if exists "users_select" on users;
drop policy if exists "users_insert" on users;
drop policy if exists "users_update" on users;
drop policy if exists "users_delete" on users;

create policy "users_select" on users
  for select to authenticated
  using (
    uid = auth.uid()::text
    or public.is_super_admin()
    or public.can_read_pharmacy_row(pharmacy_id)
  );

create policy "users_insert" on users
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(pharmacy_id)
    )
    or (uid = auth.uid()::text and role = 'cashier' and is_active = true)
  );

create policy "users_update" on users
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(pharmacy_id)
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(pharmacy_id)
    )
  );

create policy "users_delete" on users
  for delete to authenticated
  using (
    (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
    and uid <> auth.uid()::text
  );

-- login account requests — org visibility
drop policy if exists "login_account_requests_select" on login_account_requests;
drop policy if exists "login_account_requests_insert" on login_account_requests;
drop policy if exists "login_account_requests_update" on login_account_requests;

create policy "login_account_requests_select" on login_account_requests
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and public.can_read_pharmacy_row(pharmacy_id)
    )
  );

create policy "login_account_requests_insert" on login_account_requests
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

create policy "login_account_requests_update" on login_account_requests
  for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

-- sync RPC — validate branch access and support branch_manager role
create or replace function public.sync_auth_user_for_login_account(
  p_email text,
  p_role text,
  p_pharmacy_id text,
  p_employee_id text default null,
  p_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text;
  v_email text := lower(trim(p_email));
  v_role text := trim(p_role);
  v_name text;
  v_username text;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'not_authorized';
  end if;

  if not public.can_write_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  if v_email = '' then
    raise exception 'email_required';
  end if;

  if v_role = 'admin' then
    v_role := 'pharmacy_admin';
  end if;

  if v_role not in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  ) then
    raise exception 'invalid_role';
  end if;

  select id::text
  into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'auth_user_not_found';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  v_username := split_part(v_email, '@', 1);

  insert into public.users (uid, name, email, role, pharmacy_id, employee_id, username, is_active)
  values (
    v_uid,
    v_name,
    v_email,
    v_role,
    p_pharmacy_id,
    nullif(trim(p_employee_id), ''),
    v_username,
    true
  )
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pharmacy_id = excluded.pharmacy_id,
    employee_id = coalesce(excluded.employee_id, public.users.employee_id),
    username = coalesce(public.users.username, excluded.username),
    is_active = true,
    updated_at = now();

  return v_uid;
end;
$$;

revoke all on function public.sync_auth_user_for_login_account(text, text, text, text, text) from public;
grant execute on function public.sync_auth_user_for_login_account(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
