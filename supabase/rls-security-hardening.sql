-- =============================================================================
-- Security hardening — lock down anon grants, token forging, session revocation
-- Run AFTER rls-remove-dev-policies.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) JWT signing — internal only; validate user before issuing token
-- -----------------------------------------------------------------------------

create or replace function public.sign_app_access_token(p_uid text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_header text;
  v_payload text;
  v_signing_input text;
  v_sig bytea;
  v_uid text := nullif(trim(p_uid), '');
begin
  if v_uid is null then
    raise exception 'uid_required';
  end if;

  if exists (select 1 from public.user_session_revocations r where r.uid = v_uid) then
    raise exception 'session_revoked';
  end if;

  if not exists (
    select 1 from public.users u
    where u.uid = v_uid
      and u.is_active = true
  ) then
    raise exception 'user_not_active';
  end if;

  select value into v_secret
  from public.app_auth_settings
  where key = 'jwt_secret'
  limit 1;

  if v_secret is null or v_secret = '' or v_secret = 'YOUR_JWT_SECRET_HERE' then
    raise exception 'jwt_secret_not_configured';
  end if;

  v_header := public.base64url_encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'));
  v_payload := public.base64url_encode(
    convert_to(
      (
        json_build_object(
          'sub', v_uid,
          'role', 'authenticated',
          'aud', 'authenticated',
          'iat', extract(epoch from now())::bigint,
          'exp', (extract(epoch from now()) + 172800)::bigint
        )
      )::text,
      'utf8'
    )
  );

  v_signing_input := v_header || '.' || v_payload;
  v_sig := extensions.hmac(v_signing_input, v_secret, 'sha256');

  return v_signing_input || '.' || public.base64url_encode(v_sig);
end;
$$;

revoke all on function public.sign_app_access_token(text) from public;
revoke all on function public.sign_app_access_token(text) from anon;
revoke all on function public.sign_app_access_token(text) from authenticated;

revoke all on function public.hash_app_password(text) from public;
revoke all on function public.hash_app_password(text) from anon;
revoke all on function public.hash_app_password(text) from authenticated;

revoke all on function public.verify_app_password(text, text) from public;
revoke all on function public.verify_app_password(text, text) from anon;
revoke all on function public.verify_app_password(text, text) from authenticated;

revoke all on function public.verify_app_login(text, text) from public;
revoke all on function public.verify_app_login(text, text) from anon;
revoke all on function public.verify_app_login(text, text) from authenticated;
grant execute on function public.verify_app_login(text, text) to service_role;

revoke all on function public.base64url_encode(bytea) from public;
revoke all on function public.base64url_encode(bytea) from anon;
revoke all on function public.base64url_encode(bytea) from authenticated;

-- Login + public signup only (no session required)
revoke all on function public.app_client_login(text, text) from public;
grant execute on function public.app_client_login(text, text) to anon, authenticated;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

revoke all on function public.register_trial_app_user(text, text, text, text) from public;
grant execute on function public.register_trial_app_user(text, text, text, text) to anon, authenticated;

revoke all on function public.provision_trial_pharmacy(text) from public;
grant execute on function public.provision_trial_pharmacy(text) to anon, authenticated;

do $$
begin
  if to_regprocedure('public.provision_trial_tenant_only(text)') is not null then
    execute 'revoke all on function public.provision_trial_tenant_only(text) from public';
    execute 'grant execute on function public.provision_trial_tenant_only(text) to anon, authenticated';
  end if;
end $$;

-- Block direct RPC calls to token/password helpers for all other public functions (anon)
do $$
declare
  r record;
  anon_whitelist text[] := array[
    'app_client_login',
    'resolve_login_email',
    'register_trial_app_user',
    'provision_trial_pharmacy',
    'provision_trial_tenant_only'
  ];
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    if r.proname = any(anon_whitelist) then
      continue;
    end if;
    execute format('revoke all on function public.%I(%s) from anon', r.proname, r.args);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2) is_active_user — honor session revocations
-- -----------------------------------------------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and not exists (
      select 1
      from public.user_session_revocations r
      where r.uid = auth.uid()::text
    )
    and (
      public.is_super_admin()
      or exists (
        select 1
        from public.users u
        join public.pharmacies p on p.id = u.pharmacy_id
        where u.uid = auth.uid()::text
          and u.is_active = true
          and p.is_active = true
          and coalesce(p.subscription_status, 'active') in ('active', 'trial')
      )
    );
$$;

grant execute on function public.is_active_user() to authenticated;

-- -----------------------------------------------------------------------------
-- 3) users INSERT — remove cashier self-registration loophole
-- -----------------------------------------------------------------------------

drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(pharmacy_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 4) Table privileges — anon gets nothing; no TRUNCATE for clients
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke truncate on all tables in schema public from authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Keep secrets table service-only (if grants were re-applied above)
revoke all on table public.app_auth_settings from authenticated;
revoke all on table public.app_auth_settings from anon;

-- -----------------------------------------------------------------------------
-- 5) FORCE RLS on tenant-facing tables (table owner cannot bypass)
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
  tenant_tables text[] := array[
    'users', 'pharmacies', 'organizations',
    'medicines', 'invoices', 'invoice_items', 'returns', 'purchases',
    'customer_payments', 'stock_movements', 'activity_logs',
    'customers', 'customer_activities', 'pharmacy_costs',
    'employees', 'employee_profiles', 'employee_requests',
    'attendance_records', 'payroll_records',
    'pharmacy_login_accounts', 'login_account_requests',
    'pharmacy_role_configs', 'pharmacy_custom_roles',
    'held_invoices', 'cashier_shifts', 'branch_stock_transfers',
    'subscription_requests', 'user_session_revocations'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I force row level security', t);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6) Medicine catalog — active users only (not open read)
-- -----------------------------------------------------------------------------

drop policy if exists "medicine_catalog_reference_read" on public.medicine_catalog_reference;
create policy "medicine_catalog_reference_read" on public.medicine_catalog_reference
  for select to authenticated
  using (public.is_active_user());

notify pgrst, 'reload schema';
