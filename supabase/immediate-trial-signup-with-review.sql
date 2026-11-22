-- Immediate 14-day trial on public signup + keep request for Super Admin review.
-- If not approved within the trial window, subscription_end_date naturally expires access.

create or replace function public.register_trial_app_user(
  p_email text,
  p_password text,
  p_name text,
  p_pharmacy_name text,
  p_phone text default '',
  p_address text default ''
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
  v_phone text := trim(coalesce(p_phone, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_uid text := gen_random_uuid()::text;
  v_request_id uuid := gen_random_uuid();
  v_request_number text;
  v_trial jsonb;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'email_address_invalid_format';
  end if;

  if right(v_email, length('@victory.com')) <> '@victory.com' then
    raise exception 'email_domain_rejected';
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

  if char_length(v_phone) < 8 then
    raise exception 'phone_required';
  end if;

  if char_length(v_address) < 3 then
    raise exception 'address_required';
  end if;

  if exists (select 1 from public.users where lower(email) = v_email) then
    raise exception 'email_already_registered';
  end if;

  if exists (
    select 1
    from public.pharmacy_signup_requests
    where lower(email) = v_email
      and status = 'pending'
  ) then
    raise exception 'signup_request_already_pending';
  end if;

  v_trial := public.provision_trial_tenant_only(v_pharmacy_name);

  update public.pharmacies
  set
    phone = coalesce(nullif(v_phone, ''), phone),
    address = coalesce(nullif(v_address, ''), address)
  where id = v_trial->>'pharmacy_id';

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

  v_request_number := 'SIG-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_request_id::text, '-', ''), 1, 6));

  insert into public.pharmacy_signup_requests (
    id,
    request_number,
    pharmacy_name,
    admin_name,
    email,
    password_hash,
    phone,
    address,
    status,
    pharmacy_id
  ) values (
    v_request_id,
    v_request_number,
    v_pharmacy_name,
    v_name,
    v_email,
    public.hash_app_password(p_password),
    v_phone,
    v_address,
    'pending',
    v_trial->>'pharmacy_id'
  );

  return jsonb_build_object(
    'uid', v_uid,
    'pharmacy_id', v_trial->>'pharmacy_id',
    'organization_id', v_trial->>'organization_id',
    'subscription_end_date', v_trial->>'subscription_end_date',
    'trial_days', v_trial->>'trial_days',
    'pending_approval', false,
    'awaiting_review', true,
    'can_sign_in', true,
    'request_id', v_request_id,
    'request_number', v_request_number
  );
end;
$$;

revoke all on function public.register_trial_app_user(text, text, text, text, text, text) from public;
grant execute on function public.register_trial_app_user(text, text, text, text, text, text) to anon, authenticated;

-- Approve: if already provisioned at signup, only mark reviewed (+ optional tier).
create or replace function public.approve_pharmacy_signup_request(
  p_request_id uuid,
  p_review_note text default null,
  p_subscription_tier text default 'professional'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pharmacy_signup_requests%rowtype;
  v_trial jsonb;
  v_uid text;
  v_reviewer_uid text;
  v_reviewer_name text;
  v_tier text := lower(trim(coalesce(p_subscription_tier, 'professional')));
  v_max_branches integer := 3;
  v_max_users integer := 15;
  v_pharmacy_id text;
  v_organization_id text;
  v_subscription_end text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  if v_tier not in ('basic', 'professional', 'premium') then
    raise exception 'invalid_subscription_tier';
  end if;

  if v_tier = 'basic' then
    v_max_branches := 1;
    v_max_users := 3;
  elsif v_tier = 'premium' then
    v_max_branches := 10;
    v_max_users := 50;
  else
    v_max_branches := 3;
    v_max_users := 15;
  end if;

  select * into v_req
  from public.pharmacy_signup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'signup_request_not_found';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'signup_request_not_pending';
  end if;

  begin
    v_reviewer_uid := auth.uid()::text;
  exception
    when others then
      v_reviewer_uid := null;
  end;

  select name into v_reviewer_name
  from public.users
  where uid = v_reviewer_uid
  limit 1;

  if coalesce(nullif(trim(v_req.pharmacy_id), ''), '') <> '' then
    v_pharmacy_id := v_req.pharmacy_id;
    select uid into v_uid
    from public.users
    where lower(email) = lower(v_req.email)
    limit 1;

    update public.pharmacies
    set
      subscription_tier = v_tier,
      subscription_plan = v_tier,
      subscription_status = 'active',
      subscription_end_date = to_char(
        greatest(coalesce(subscription_end_date::date, current_date), current_date) + 30,
        'YYYY-MM-DD'
      ),
      max_branches = v_max_branches,
      max_users = v_max_users,
      phone = coalesce(nullif(trim(v_req.phone), ''), phone),
      address = coalesce(nullif(trim(v_req.address), ''), address)
    where id = v_pharmacy_id;

    begin
      update public.organizations
      set
        subscription_tier = v_tier,
        max_branches = v_max_branches,
        max_users = v_max_users
      where id = (
        select organization_id from public.pharmacies where id = v_pharmacy_id limit 1
      );
    exception
      when undefined_column then
        update public.organizations
        set
          subscription_tier = v_tier,
          max_branches = v_max_branches
        where id = (
          select organization_id from public.pharmacies where id = v_pharmacy_id limit 1
        );
    end;

    select subscription_end_date::text, organization_id
      into v_subscription_end, v_organization_id
    from public.pharmacies
    where id = v_pharmacy_id;

    update public.pharmacy_signup_requests
    set
      status = 'approved',
      reviewed_by = v_reviewer_uid,
      reviewed_by_name = coalesce(v_reviewer_name, 'super_admin'),
      review_note = nullif(trim(coalesce(p_review_note, '')), ''),
      reviewed_at = now(),
      updated_at = now()
    where id = p_request_id;

    return jsonb_build_object(
      'request_id', p_request_id,
      'uid', v_uid,
      'pharmacy_id', v_pharmacy_id,
      'organization_id', v_organization_id,
      'subscription_end_date', v_subscription_end,
      'subscription_tier', v_tier,
      'already_provisioned', true
    );
  end if;

  if exists (select 1 from public.users where lower(email) = lower(v_req.email)) then
    raise exception 'email_already_registered';
  end if;

  v_trial := public.provision_trial_tenant_only(v_req.pharmacy_name);
  v_uid := gen_random_uuid()::text;
  v_pharmacy_id := v_trial->>'pharmacy_id';

  update public.pharmacies
  set
    phone = coalesce(nullif(trim(v_req.phone), ''), phone),
    address = coalesce(nullif(trim(v_req.address), ''), address),
    subscription_tier = v_tier,
    subscription_plan = v_tier,
    subscription_status = 'active',
    subscription_end_date = to_char(
      greatest(coalesce(subscription_end_date::date, current_date), current_date) + 30,
      'YYYY-MM-DD'
    ),
    max_branches = v_max_branches,
    max_users = v_max_users
  where id = v_pharmacy_id;

  begin
    update public.organizations
    set
      subscription_tier = v_tier,
      max_branches = v_max_branches,
      max_users = v_max_users
    where id = v_trial->>'organization_id';
  exception
    when undefined_column then
      update public.organizations
      set
        subscription_tier = v_tier,
        max_branches = v_max_branches
      where id = v_trial->>'organization_id';
  end;

  insert into public.users (
    uid, name, email, role, pharmacy_id, is_active, password_hash
  )
  values (
    v_uid,
    v_req.admin_name,
    lower(v_req.email),
    'pharmacy_admin',
    v_pharmacy_id,
    true,
    v_req.password_hash
  );

  update public.pharmacy_signup_requests
  set
    status = 'approved',
    pharmacy_id = v_pharmacy_id,
    reviewed_by = v_reviewer_uid,
    reviewed_by_name = coalesce(v_reviewer_name, 'super_admin'),
    review_note = nullif(trim(coalesce(p_review_note, '')), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'uid', v_uid,
    'pharmacy_id', v_pharmacy_id,
    'organization_id', v_trial->>'organization_id',
    'subscription_end_date', (
      select subscription_end_date::text from public.pharmacies where id = v_pharmacy_id limit 1
    ),
    'subscription_tier', v_tier,
    'already_provisioned', false
  );
end;
$$;

revoke all on function public.approve_pharmacy_signup_request(uuid, text, text) from public;
grant execute on function public.approve_pharmacy_signup_request(uuid, text, text) to authenticated;

-- Reject after immediate provision: end trial access now.
create or replace function public.reject_pharmacy_signup_request(
  p_request_id uuid,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pharmacy_signup_requests%rowtype;
  v_reviewer_uid text;
  v_reviewer_name text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_req
  from public.pharmacy_signup_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'signup_request_not_found';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'signup_request_not_pending';
  end if;

  begin
    v_reviewer_uid := auth.uid()::text;
  exception
    when others then
      v_reviewer_uid := null;
  end;

  select name into v_reviewer_name
  from public.users
  where uid = v_reviewer_uid
  limit 1;

  if coalesce(nullif(trim(v_req.pharmacy_id), ''), '') <> '' then
    update public.pharmacies
    set
      subscription_status = 'expired',
      subscription_end_date = (current_date - 1)::text
    where id = v_req.pharmacy_id;

    update public.users
    set is_active = false
    where lower(email) = lower(v_req.email);
  end if;

  update public.pharmacy_signup_requests
  set
    status = 'rejected',
    reviewed_by = v_reviewer_uid,
    reviewed_by_name = coalesce(v_reviewer_name, 'super_admin'),
    review_note = nullif(trim(coalesce(p_review_note, '')), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('request_id', p_request_id, 'status', 'rejected');
end;
$$;

revoke all on function public.reject_pharmacy_signup_request(uuid, text) from public;
grant execute on function public.reject_pharmacy_signup_request(uuid, text) to authenticated;
