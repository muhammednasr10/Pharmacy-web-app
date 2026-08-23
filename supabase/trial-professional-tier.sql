-- Trial pharmacies use Professional tier (features + limits).
-- Run after fix-trial-registration.sql / organization-user-limit.sql

-- 1) Upgrade existing active trial tenants to professional limits
update public.organizations o
set
  subscription_tier = 'professional',
  max_branches = greatest(coalesce(o.max_branches, 1), 3),
  max_users = greatest(coalesce(o.max_users, 1), 15)
where exists (
  select 1
  from public.pharmacies p
  where p.organization_id = o.id
    and coalesce(p.subscription_status, '') = 'trial'
);

update public.pharmacies p
set
  subscription_tier = 'professional',
  max_branches = greatest(coalesce(p.max_branches, 1), 3),
  max_users = greatest(coalesce(p.max_users, 1), 15)
where coalesce(p.subscription_status, '') = 'trial';

-- 2) New public trial signup provisions professional tier
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
  v_max_users integer := 15;
  v_max_branches integer := 3;
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
    values (v_org_id, v_name, v_max_branches, v_max_users, 'professional');
  exception
    when undefined_column then
      insert into public.organizations (id, name, max_branches, subscription_tier)
      values (v_org_id, v_name, v_max_branches, 'professional');
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
      v_max_branches,
      v_max_users,
      'professional',
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
        v_max_branches,
        'professional',
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
    'max_users', v_max_users,
    'max_branches', v_max_branches,
    'subscription_tier', 'professional'
  );
end;
$$;

revoke all on function public.provision_trial_tenant_only(text) from public;
grant execute on function public.provision_trial_tenant_only(text) to service_role;
