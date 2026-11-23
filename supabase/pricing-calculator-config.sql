-- Public pricing calculator config + quote fields on signup requests.
-- Owner edits prices in Packages tab; landing calculator uses them.

create table if not exists public.pricing_calculator_config (
  id text primary key default 'default',
  price_per_branch numeric not null default 200,
  price_per_user numeric not null default 50,
  staff_addon_enabled boolean not null default true,
  staff_addon_price numeric not null default 150,
  staff_addon_title_ar text not null default 'الموظفين',
  staff_addon_title_en text not null default 'Staff',
  staff_addon_desc_ar text not null default 'إدارة الموظفين والحسابات والصلاحيات داخل الصيدلية',
  staff_addon_desc_en text not null default 'Manage staff accounts and permissions inside the pharmacy',
  customers_addon_enabled boolean not null default true,
  customers_addon_price numeric not null default 100,
  customers_addon_title_ar text not null default 'العملاء',
  customers_addon_title_en text not null default 'Customers',
  customers_addon_desc_ar text not null default 'دفتر العملاء والمديونية والتحصيل داخل الصيدلية',
  customers_addon_desc_en text not null default 'Customer book, credit balances, and collections inside the pharmacy',
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.pricing_calculator_config (id)
values ('default')
on conflict (id) do nothing;

alter table public.pricing_calculator_config enable row level security;

drop policy if exists "pricing_calculator_config_public_select" on public.pricing_calculator_config;
create policy "pricing_calculator_config_public_select"
  on public.pricing_calculator_config
  for select
  to anon, authenticated
  using (true);

drop policy if exists "pricing_calculator_config_super_admin_write" on public.pricing_calculator_config;
create policy "pricing_calculator_config_super_admin_write"
  on public.pricing_calculator_config
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on table public.pricing_calculator_config to anon, authenticated;
grant insert, update on table public.pricing_calculator_config to authenticated;

alter table public.pharmacy_signup_requests
  add column if not exists quoted_branches integer;
alter table public.pharmacy_signup_requests
  add column if not exists quoted_users integer;
alter table public.pharmacy_signup_requests
  add column if not exists quoted_staff_addon boolean not null default false;
alter table public.pharmacy_signup_requests
  add column if not exists quoted_customers_addon boolean not null default false;
alter table public.pharmacy_signup_requests
  add column if not exists quoted_monthly_price numeric;
alter table public.pharmacy_signup_requests
  add column if not exists quote_snapshot jsonb;

-- Register with optional calculator quote (branches / users / staff addon).
create or replace function public.register_trial_app_user(
  p_email text,
  p_password text,
  p_name text,
  p_pharmacy_name text,
  p_phone text default '',
  p_address text default '',
  p_branches integer default 1,
  p_users integer default 1,
  p_staff_addon boolean default false
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
  v_branches integer := greatest(1, least(coalesce(p_branches, 1), 50));
  v_users integer := greatest(1, least(coalesce(p_users, 1), 200));
  v_staff boolean := coalesce(p_staff_addon, false);
  v_cfg public.pricing_calculator_config%rowtype;
  v_monthly numeric := 0;
  v_snapshot jsonb;
  v_pharmacy_id text;
  v_org_id text;
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

  select * into v_cfg
  from public.pricing_calculator_config
  where id = 'default';

  if not found then
    v_monthly := (v_branches * 200) + (v_users * 50) + (case when v_staff then 150 else 0 end);
    v_snapshot := jsonb_build_object(
      'price_per_branch', 200,
      'price_per_user', 50,
      'staff_addon_price', 150,
      'branches', v_branches,
      'users', v_users,
      'staff_addon', v_staff,
      'monthly_price', v_monthly
    );
  else
    if not coalesce(v_cfg.staff_addon_enabled, true) then
      v_staff := false;
    end if;
    v_monthly :=
      (v_branches * coalesce(v_cfg.price_per_branch, 0))
      + (v_users * coalesce(v_cfg.price_per_user, 0))
      + (case when v_staff then coalesce(v_cfg.staff_addon_price, 0) else 0 end);
    v_snapshot := jsonb_build_object(
      'price_per_branch', v_cfg.price_per_branch,
      'price_per_user', v_cfg.price_per_user,
      'staff_addon_price', v_cfg.staff_addon_price,
      'staff_addon_title_ar', v_cfg.staff_addon_title_ar,
      'staff_addon_title_en', v_cfg.staff_addon_title_en,
      'branches', v_branches,
      'users', v_users,
      'staff_addon', v_staff,
      'monthly_price', v_monthly
    );
  end if;

  v_trial := public.provision_trial_tenant_only(v_pharmacy_name);
  v_pharmacy_id := v_trial->>'pharmacy_id';
  v_org_id := v_trial->>'organization_id';

  update public.pharmacies
  set
    phone = coalesce(nullif(v_phone, ''), phone),
    address = coalesce(nullif(v_address, ''), address),
    max_branches = v_branches,
    max_users = v_users,
    subscription_tier = 'professional'
  where id = v_pharmacy_id;

  begin
    update public.organizations
    set
      max_branches = v_branches,
      max_users = v_users,
      subscription_tier = 'professional'
    where id = v_org_id;
  exception
    when undefined_column then
      update public.organizations
      set
        max_branches = v_branches,
        subscription_tier = 'professional'
      where id = v_org_id;
  end;

  insert into public.users (
    uid, name, email, role, pharmacy_id, is_active, password_hash
  )
  values (
    v_uid,
    v_name,
    v_email,
    'pharmacy_admin',
    v_pharmacy_id,
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
    pharmacy_id,
    quoted_branches,
    quoted_users,
    quoted_staff_addon,
    quoted_monthly_price,
    quote_snapshot
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
    v_pharmacy_id,
    v_branches,
    v_users,
    v_staff,
    v_monthly,
    v_snapshot
  );

  return jsonb_build_object(
    'uid', v_uid,
    'pharmacy_id', v_pharmacy_id,
    'organization_id', v_org_id,
    'subscription_end_date', v_trial->>'subscription_end_date',
    'trial_days', v_trial->>'trial_days',
    'pending_approval', false,
    'awaiting_review', true,
    'can_sign_in', true,
    'request_id', v_request_id,
    'request_number', v_request_number,
    'quoted_branches', v_branches,
    'quoted_users', v_users,
    'quoted_staff_addon', v_staff,
    'quoted_monthly_price', v_monthly
  );
end;
$$;

revoke all on function public.register_trial_app_user(text, text, text, text, text, text) from public;
revoke all on function public.register_trial_app_user(text, text, text, text, text, text, integer, integer, boolean) from public;
drop function if exists public.register_trial_app_user(text, text, text, text, text, text);

grant execute on function public.register_trial_app_user(text, text, text, text, text, text, integer, integer, boolean)
  to anon, authenticated;
