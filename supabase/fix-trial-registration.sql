-- =============================================================================
-- Fix public trial signup (register_trial_app_user)
-- Run AFTER custom-app-auth.sql and organization-user-limit.sql (if max_users exists)
--
-- Problem: register_trial_app_user called provision_trial_pharmacy which requires
-- auth.uid() — public signup has no session yet → "forbidden" / غير مصرح بهذا الإجراء
-- =============================================================================

create or replace function public.provision_trial_tenant_only(p_pharmacy_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pharmacy_id text;
  v_org_id text;
  v_slug text;
  v_end_date text;
  v_started_at timestamptz := now();
  v_trial_days integer := 14;
  v_attempt integer := 0;
  v_max_users integer := 5;
  v_name text := trim(p_pharmacy_name);
begin
  if v_name is null or length(v_name) < 2 then
    raise exception 'pharmacy_name_required';
  end if;

  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'pharmacy';
  end if;
  v_slug := left(v_slug, 24);

  loop
    v_attempt := v_attempt + 1;
    v_pharmacy_id := v_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
    exit when not exists (select 1 from public.pharmacies where id = v_pharmacy_id);
    if v_attempt > 20 then
      raise exception 'pharmacy_id_generation_failed';
    end if;
  end loop;

  v_org_id := 'org-' || v_pharmacy_id;
  v_end_date := to_char((current_date + v_trial_days), 'YYYY-MM-DD');

  begin
    insert into public.organizations (id, name, max_branches, max_users, subscription_tier)
    values (v_org_id, v_name, 1, v_max_users, 'basic');
  exception
    when undefined_column then
      insert into public.organizations (id, name, max_branches, subscription_tier)
      values (v_org_id, v_name, 1, 'basic');
  end;

  begin
    insert into public.pharmacies (
      id,
      name,
      name_en,
      phone,
      address,
      currency,
      is_active,
      organization_id,
      max_branches,
      max_users,
      subscription_tier,
      subscription_plan,
      subscription_status,
      subscription_started_at,
      subscription_end_date
    ) values (
      v_pharmacy_id,
      v_name,
      v_name,
      '',
      '',
      'ج.م',
      true,
      v_org_id,
      1,
      v_max_users,
      'basic',
      'trial',
      'trial',
      v_started_at,
      v_end_date
    );
  exception
    when undefined_column then
      insert into public.pharmacies (
        id,
        name,
        name_en,
        phone,
        address,
        currency,
        is_active,
        organization_id,
        max_branches,
        subscription_tier,
        subscription_plan,
        subscription_status,
        subscription_started_at,
        subscription_end_date
      ) values (
        v_pharmacy_id,
        v_name,
        v_name,
        '',
        '',
        'ج.م',
        true,
        v_org_id,
        1,
        'basic',
        'trial',
        'trial',
        v_started_at,
        v_end_date
      );
  end;

  return jsonb_build_object(
    'pharmacy_id', v_pharmacy_id,
    'organization_id', v_org_id,
    'subscription_end_date', v_end_date,
    'trial_days', v_trial_days,
    'max_users', v_max_users
  );
end;
$$;

revoke all on function public.provision_trial_tenant_only(text) from public;
grant execute on function public.provision_trial_tenant_only(text) to service_role;

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

-- Keep auth-based provisioning for legacy Supabase Auth signup flows
create or replace function public.provision_trial_pharmacy(p_pharmacy_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text;
  v_email text;
  v_name text;
  v_trial jsonb;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  v_uid := auth.uid()::text;

  select
    u.email,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      split_part(u.email, '@', 1)
    )
  into v_email, v_name
  from auth.users u
  where u.id = auth.uid();

  if v_email is null then
    raise exception 'auth_user_not_found';
  end if;

  if exists (
    select 1
    from public.users u
    where u.uid = v_uid
      and u.pharmacy_id <> 'main'
      and u.role in ('pharmacy_admin', 'admin', 'super_admin')
  ) then
    raise exception 'trial_already_provisioned';
  end if;

  v_trial := public.provision_trial_tenant_only(p_pharmacy_name);

  delete from public.users
  where uid = v_uid
    and pharmacy_id = 'main'
    and role in ('cashier', 'admin');

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (v_uid, v_name, lower(v_email), 'pharmacy_admin', v_trial->>'pharmacy_id', true)
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = 'pharmacy_admin',
    pharmacy_id = excluded.pharmacy_id,
    is_active = true;

  return v_trial;
end;
$$;

grant execute on function public.provision_trial_pharmacy(text) to authenticated;

notify pgrst, 'reload schema';
