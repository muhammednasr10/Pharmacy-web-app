-- =============================================================================
-- Trial signup — 14-day trial when a new pharmacy registers from the login page
-- Run AFTER subscription-tiers.sql (and public-signup.sql if used)
-- =============================================================================

-- Skip auto-insert on auth.users for trial pharmacy signups (RPC provisions tenant)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
  v_pharmacy_id text;
  v_signup_type text;
begin
  v_signup_type := coalesce(nullif(trim(new.raw_user_meta_data->>'signup_type'), ''), '');
  if v_signup_type = 'trial_pharmacy' then
    return new;
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'cashier');
  v_pharmacy_id := coalesce(nullif(trim(new.raw_user_meta_data->>'pharmacy_id'), ''), 'main');

  if v_role not in ('admin', 'cashier', 'inventory', 'manager', 'pharmacy_admin') then
    v_role := 'cashier';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, true)
  on conflict (uid) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- Provision organization + pharmacy + pharmacy_admin user with 14-day trial
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

  insert into public.organizations (id, name, max_branches, subscription_tier)
  values (v_org_id, trim(p_pharmacy_name), 1, 'basic');

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
    trim(p_pharmacy_name),
    trim(p_pharmacy_name),
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
    'trial_days', v_trial_days
  );
end;
$$;

grant execute on function public.provision_trial_pharmacy(text) to authenticated;

notify pgrst, 'reload schema';
