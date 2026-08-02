-- =============================================================================
-- مصادقة التطبيق (بدون Supabase Auth)
-- شغّل في Supabase → SQL Editor
-- بعد التشغيل: عيّن كلمة مرور لمالك النظام (انظر الأسفل)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

alter table public.users add column if not exists password_hash text;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.hash_app_password(p_password text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select extensions.crypt(p_password, extensions.gen_salt('bf'));
$$;

create or replace function public.verify_app_password(p_password text, p_hash text)
returns boolean
language sql
immutable
set search_path = public, extensions
as $$
  select p_hash is not null and p_hash <> '' and extensions.crypt(p_password, p_hash) = p_hash;
$$;

-- -----------------------------------------------------------------------------
-- Login verification (called from Edge Function — not exposed to anon directly)
-- -----------------------------------------------------------------------------

create or replace function public.verify_app_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.users%rowtype;
begin
  select * into v_row
  from public.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if not found then
    raise exception 'invalid_credentials';
  end if;

  if v_row.is_active is distinct from true then
    raise exception 'user_inactive';
  end if;

  if not public.verify_app_password(p_password, v_row.password_hash) then
    raise exception 'invalid_credentials';
  end if;

  return jsonb_build_object(
    'uid', v_row.uid,
    'email', v_row.email,
    'name', v_row.name,
    'role', v_row.role,
    'pharmacy_id', v_row.pharmacy_id,
    'is_active', v_row.is_active
  );
end;
$$;

revoke all on function public.verify_app_login(text, text) from public;
grant execute on function public.verify_app_login(text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Set / create passwords (super admin or pharmacy manager)
-- -----------------------------------------------------------------------------

create or replace function public.set_app_user_password(
  p_uid text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.users%rowtype;
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password_too_short';
  end if;

  select * into v_target from public.users where uid = p_uid limit 1;
  if not found then
    raise exception 'user_not_found';
  end if;

  if not (
    public.is_super_admin()
    or (
      public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(v_target.pharmacy_id)
    )
  ) then
    raise exception 'not_authorized';
  end if;

  if v_target.role = 'super_admin' and not public.is_super_admin() then
    raise exception 'not_authorized';
  end if;

  update public.users
  set
    password_hash = public.hash_app_password(p_password),
    updated_at = now()
  where uid = p_uid;
end;
$$;

revoke all on function public.set_app_user_password(text, text) from public;
grant execute on function public.set_app_user_password(text, text) to authenticated;

create or replace function public.create_app_user_with_password(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_pharmacy_id text,
  p_employee_id text default null,
  p_username text default null,
  p_uid text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := coalesce(nullif(trim(p_uid), ''), gen_random_uuid()::text);
  v_email text := lower(trim(p_email));
  v_role text := trim(p_role);
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

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password_too_short';
  end if;

  if v_role = 'admin' then
    v_role := 'pharmacy_admin';
  end if;

  perform public.assert_organization_user_capacity(p_pharmacy_id, v_uid);

  insert into public.users (
    uid, name, email, role, pharmacy_id, employee_id, username, is_active, password_hash
  )
  values (
    v_uid,
    coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
    v_email,
    v_role,
    p_pharmacy_id,
    nullif(trim(p_employee_id), ''),
    nullif(trim(p_username), ''),
    true,
    public.hash_app_password(p_password)
  )
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pharmacy_id = excluded.pharmacy_id,
    employee_id = coalesce(excluded.employee_id, public.users.employee_id),
    username = coalesce(public.users.username, excluded.username),
    is_active = true,
    password_hash = excluded.password_hash,
    updated_at = now();

  return v_uid;
end;
$$;

revoke all on function public.create_app_user_with_password(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_app_user_with_password(text, text, text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Trial registration (public — no Supabase Auth)
-- -----------------------------------------------------------------------------

create or replace function public.register_trial_app_user(
  p_email text,
  p_password text,
  p_name text,
  p_pharmacy_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := trim(p_name);
  v_pharmacy_name text := trim(p_pharmacy_name);
  v_uid text := gen_random_uuid()::text;
  v_trial jsonb;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'email_address_invalid_format';
  end if;

  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password_too_short';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'name_required';
  end if;

  if char_length(v_pharmacy_name) < 2 then
    raise exception 'pharmacy_name_required';
  end if;

  if exists (select 1 from public.users where lower(email) = v_email) then
    raise exception 'email_already_registered';
  end if;

  v_trial := public.provision_trial_tenant_only(v_pharmacy_name);

  insert into public.users (
    uid, name, email, role, pharmacy_id, is_active, password_hash
  )
  values (
    v_uid,
    v_name,
    v_email,
    'pharmacy_admin',
    v_trial->>'pharmacy_id',
    true,
    public.hash_app_password(p_password)
  );

  return jsonb_build_object(
    'uid', v_uid,
    'pharmacy_id', v_trial->>'pharmacy_id',
    'organization_id', v_trial->>'organization_id'
  );
end;
$$;

revoke all on function public.register_trial_app_user(text, text, text, text) from public;
grant execute on function public.register_trial_app_user(text, text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- sync login account → users (no auth.users)
-- -----------------------------------------------------------------------------

create or replace function public.sync_auth_user_for_login_account(
  p_email text,
  p_role text,
  p_pharmacy_id text,
  p_employee_id text default null,
  p_name text default null,
  p_password text default null
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
  v_password text := nullif(trim(p_password), '');
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

  select uid into v_uid from public.users where lower(email) = v_email limit 1;

  v_name := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  v_username := split_part(v_email, '@', 1);

  if v_uid is null then
    v_uid := gen_random_uuid()::text;
    insert into public.users (
      uid, name, email, role, pharmacy_id, employee_id, username, is_active, password_hash
    )
    values (
      v_uid,
      v_name,
      v_email,
      v_role,
      p_pharmacy_id,
      nullif(trim(p_employee_id), ''),
      v_username,
      true,
      case
        when v_password is not null then public.hash_app_password(v_password)
        else null
      end
    );
    return v_uid;
  end if;

  update public.users
  set
    name = v_name,
    email = v_email,
    role = v_role,
    pharmacy_id = p_pharmacy_id,
    employee_id = coalesce(nullif(trim(p_employee_id), ''), employee_id),
    username = coalesce(username, v_username),
    is_active = true,
    password_hash = case
      when v_password is not null then public.hash_app_password(v_password)
      else password_hash
    end,
    updated_at = now()
  where uid = v_uid;

  return v_uid;
end;
$$;

revoke all on function public.sync_auth_user_for_login_account(text, text, text, text, text, text) from public;
grant execute on function public.sync_auth_user_for_login_account(text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- تعيين كلمة مرور مالك النظام (شغّل مرة واحدة وغيّر القيم)
-- -----------------------------------------------------------------------------
-- update public.users
-- set password_hash = public.hash_app_password('YourStrongPassword123')
-- where lower(email) = 'admin@pharmacy.com';

notify pgrst, 'reload schema';
