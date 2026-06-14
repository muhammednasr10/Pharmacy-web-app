-- =============================================================================
-- Organization user limit — حد أقصى لمستخدمي كل صيدلية/مجموعة (بغض النظر عن الدور)
-- Run AFTER subscription-tiers.sql and pharmacy-custom-roles.sql
-- =============================================================================

alter table organizations
  add column if not exists max_users integer not null default 5;

alter table pharmacies
  add column if not exists max_users integer;

alter table organizations
  drop constraint if exists organizations_max_users_check;

alter table organizations
  add constraint organizations_max_users_check
  check (max_users >= 1);

update organizations
set max_users = case coalesce(subscription_tier, 'basic')
  when 'professional' then greatest(coalesce(max_users, 5), 15)
  when 'premium' then greatest(coalesce(max_users, 5), 50)
  else greatest(coalesce(max_users, 5), 5)
end
where max_users is null or max_users < 1;

update pharmacies p
set max_users = o.max_users
from organizations o
where p.organization_id = o.id
  and p.max_users is null;

create or replace function public.resolve_organization_id_for_pharmacy(p_pharmacy_id text)
returns text
language sql
stable
as $$
  select coalesce(
    (select p.organization_id from public.pharmacies p where p.id = p_pharmacy_id limit 1),
    'org-' || p_pharmacy_id
  );
$$;

create or replace function public.resolve_organization_max_users(p_organization_id text)
returns integer
language sql
stable
as $$
  select greatest(
    1,
    coalesce(
      nullif(o.max_users, 0),
      case coalesce(o.subscription_tier, 'basic')
        when 'professional' then 15
        when 'premium' then 50
        else 5
      end
    )
  )
  from public.organizations o
  where o.id = p_organization_id
  union all
  select 5
  limit 1;
$$;

create or replace function public.count_organization_users(p_organization_id text)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.users u
  inner join public.pharmacies p on p.id = u.pharmacy_id
  where coalesce(p.organization_id, 'org-' || p.id) = p_organization_id
    and coalesce(u.is_active, true) = true
    and coalesce(u.role, '') <> 'super_admin';
$$;

create or replace function public.assert_organization_user_capacity(
  p_pharmacy_id text,
  p_uid text default null
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id text;
  v_existing_org_id text;
  v_max integer;
  v_count integer;
begin
  v_org_id := public.resolve_organization_id_for_pharmacy(p_pharmacy_id);

  if p_uid is not null and trim(p_uid) <> '' then
    select coalesce(p.organization_id, 'org-' || p.id)
    into v_existing_org_id
    from public.users u
    left join public.pharmacies p on p.id = u.pharmacy_id
    where u.uid = trim(p_uid)
    limit 1;

    if v_existing_org_id = v_org_id then
      return;
    end if;
  end if;

  v_max := public.resolve_organization_max_users(v_org_id);
  v_count := public.count_organization_users(v_org_id);

  if v_count >= v_max then
    raise exception 'user_limit_reached';
  end if;
end;
$$;

create or replace function public.set_organization_max_users(
  target_organization_id text,
  new_max_users integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.users
    where uid = auth.uid()::text
      and role = 'super_admin'
      and coalesce(is_active, true) = true
  ) then
    raise exception 'forbidden';
  end if;

  if new_max_users is null or new_max_users < 1 then
    raise exception 'invalid_max_users';
  end if;

  if not exists (
    select 1 from public.organizations where id = target_organization_id
  ) then
    raise exception 'organization_not_found';
  end if;

  select public.count_organization_users(target_organization_id)
  into current_count;

  if new_max_users < current_count then
    raise exception 'below_current_users';
  end if;

  update public.organizations
  set max_users = new_max_users,
      updated_at = now()
  where id = target_organization_id;

  update public.pharmacies
  set max_users = new_max_users
  where organization_id = target_organization_id;
end;
$$;

grant execute on function public.set_organization_max_users(text, integer) to authenticated;
grant execute on function public.assert_organization_user_capacity(text, text) to authenticated;

-- مزامنة حد المستخدمين مع الباقة
update organizations o
set max_users = case coalesce(o.subscription_tier, 'basic')
  when 'professional' then greatest(coalesce(o.max_users, 5), 15)
  when 'premium' then greatest(coalesce(o.max_users, 5), 50)
  else greatest(coalesce(o.max_users, 5), 5)
end;

update pharmacies p
set max_users = o.max_users
from organizations o
where p.organization_id = o.id;

-- تحديث sync_auth_user_for_login_account مع فحص الحد
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

  if not public.is_valid_login_account_role(v_role, p_pharmacy_id) then
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

  perform public.assert_organization_user_capacity(p_pharmacy_id, v_uid);

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

-- تحديث التسجيل التجريبي لضبط max_users
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
  v_pharmacy_id text;
  v_org_id text;
  v_slug text;
  v_end_date text;
  v_started_at timestamptz := now();
  v_trial_days integer := 14;
  v_attempt integer := 0;
  v_max_users integer := 5;
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

  if p_pharmacy_name is null or length(trim(p_pharmacy_name)) < 2 then
    raise exception 'pharmacy_name_required';
  end if;

  v_slug := lower(regexp_replace(trim(p_pharmacy_name), '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
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

  insert into public.organizations (id, name, max_branches, max_users, subscription_tier)
  values (v_org_id, trim(p_pharmacy_name), 1, v_max_users, 'basic');

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
    trim(p_pharmacy_name),
    trim(p_pharmacy_name),
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

  delete from public.users
  where uid = v_uid
    and pharmacy_id = 'main'
    and role in ('cashier', 'admin');

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (v_uid, v_name, lower(v_email), 'pharmacy_admin', v_pharmacy_id, true)
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = 'pharmacy_admin',
    pharmacy_id = excluded.pharmacy_id,
    is_active = true;

  return jsonb_build_object(
    'pharmacy_id', v_pharmacy_id,
    'organization_id', v_org_id,
    'subscription_end_date', v_end_date,
    'trial_days', v_trial_days,
    'max_users', v_max_users
  );
end;
$$;

grant execute on function public.provision_trial_pharmacy(text) to authenticated;

notify pgrst, 'reload schema';
