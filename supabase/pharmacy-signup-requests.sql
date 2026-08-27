-- =============================================================================
-- Public pharmacy signup → pending request (Super Admin approves in «طلبات العملاء»)
-- Run AFTER fix-trial-registration.sql / trial-professional-tier.sql / custom-app-auth.sql
-- =============================================================================

create table if not exists public.pharmacy_signup_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null,
  pharmacy_name text not null,
  admin_name text not null,
  email text not null,
  password_hash text not null,
  phone text not null default '',
  address text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  pharmacy_id text,
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.pharmacy_signup_requests
  add column if not exists phone text not null default '';
alter table public.pharmacy_signup_requests
  add column if not exists address text not null default '';

create unique index if not exists pharmacy_signup_requests_request_number_uidx
  on public.pharmacy_signup_requests (request_number);

create unique index if not exists pharmacy_signup_requests_pending_email_uidx
  on public.pharmacy_signup_requests (lower(email))
  where status = 'pending';

create index if not exists pharmacy_signup_requests_status_created_idx
  on public.pharmacy_signup_requests (status, created_at desc);

alter table public.pharmacy_signup_requests enable row level security;

drop policy if exists "pharmacy_signup_requests_super_admin_select" on public.pharmacy_signup_requests;
create policy "pharmacy_signup_requests_super_admin_select"
  on public.pharmacy_signup_requests
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "pharmacy_signup_requests_super_admin_update" on public.pharmacy_signup_requests;
create policy "pharmacy_signup_requests_super_admin_update"
  on public.pharmacy_signup_requests
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

revoke all on table public.pharmacy_signup_requests from anon;
grant select, update on table public.pharmacy_signup_requests to authenticated;

-- Public signup: store pending request only (no pharmacy / user yet)
drop function if exists public.register_trial_app_user(text, text, text, text);
drop function if exists public.register_trial_app_user(text, text, text, text, text, text);

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
  v_id uuid := gen_random_uuid();
  v_request_number text;
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

  v_request_number := 'SIG-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_id::text, '-', ''), 1, 6));

  insert into public.pharmacy_signup_requests (
    id,
    request_number,
    pharmacy_name,
    admin_name,
    email,
    password_hash,
    phone,
    address,
    status
  ) values (
    v_id,
    v_request_number,
    v_pharmacy_name,
    v_name,
    v_email,
    public.hash_app_password(p_password),
    v_phone,
    v_address,
    'pending'
  );

  return jsonb_build_object(
    'pending_approval', true,
    'request_id', v_id,
    'request_number', v_request_number
  );
end;
$$;

revoke all on function public.register_trial_app_user(text, text, text, text, text, text) from public;
grant execute on function public.register_trial_app_user(text, text, text, text, text, text) to anon, authenticated;

-- Super Admin: approve → provision trial pharmacy + create pharmacy_admin user
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

  update public.pharmacy_signup_requests
  set
    status = 'rejected',
    reviewed_by = v_reviewer_uid,
    reviewed_by_name = coalesce(v_reviewer_name, 'super_admin'),
    review_note = nullif(trim(coalesce(p_review_note, '')), ''),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'status', 'rejected'
  );
end;
$$;

revoke all on function public.reject_pharmacy_signup_request(uuid, text) from public;
grant execute on function public.reject_pharmacy_signup_request(uuid, text) to authenticated;

-- Public login screen: show approval status when typing email (no secrets)
create or replace function public.get_pharmacy_signup_status_by_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.pharmacy_signup_requests%rowtype;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  select *
  into v_row
  from public.pharmacy_signup_requests
  where lower(email) = v_email
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'status', v_row.status,
    'request_number', v_row.request_number,
    'pharmacy_name', v_row.pharmacy_name,
    'review_note', v_row.review_note,
    'reviewed_at', v_row.reviewed_at
  );
end;
$$;

revoke all on function public.get_pharmacy_signup_status_by_email(text) from public;
grant execute on function public.get_pharmacy_signup_status_by_email(text) to anon, authenticated;

notify pgrst, 'reload schema';
