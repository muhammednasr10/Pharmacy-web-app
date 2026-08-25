-- =============================================================================
-- Approve signup with chosen trial subscription tier
-- Run AFTER pharmacy-signup-requests.sql
-- =============================================================================

drop function if exists public.approve_pharmacy_signup_request(uuid, text);
drop function if exists public.approve_pharmacy_signup_request(uuid, text, text);

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
  v_uid text := gen_random_uuid()::text;
  v_reviewer_uid text;
  v_reviewer_name text;
  v_tier text := lower(trim(coalesce(p_subscription_tier, 'professional')));
  v_max_branches integer := 3;
  v_max_users integer := 15;
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

  if exists (select 1 from public.users where lower(email) = lower(v_req.email)) then
    raise exception 'email_already_registered';
  end if;

  v_trial := public.provision_trial_tenant_only(v_req.pharmacy_name);

  update public.pharmacies
  set
    phone = coalesce(nullif(trim(v_req.phone), ''), phone),
    address = coalesce(nullif(trim(v_req.address), ''), address),
    subscription_tier = v_tier,
    max_branches = v_max_branches,
    max_users = v_max_users
  where id = v_trial->>'pharmacy_id';

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
    v_trial->>'pharmacy_id',
    true,
    v_req.password_hash
  );

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

  update public.pharmacy_signup_requests
  set
    status = 'approved',
    pharmacy_id = v_trial->>'pharmacy_id',
    reviewed_by = v_reviewer_uid,
    reviewed_by_name = coalesce(v_reviewer_name, 'super_admin'),
    review_note = nullif(trim(coalesce(p_review_note, '')), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'uid', v_uid,
    'pharmacy_id', v_trial->>'pharmacy_id',
    'organization_id', v_trial->>'organization_id',
    'subscription_end_date', v_trial->>'subscription_end_date',
    'subscription_tier', v_tier
  );
end;
$$;

revoke all on function public.approve_pharmacy_signup_request(uuid, text, text) from public;
grant execute on function public.approve_pharmacy_signup_request(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
