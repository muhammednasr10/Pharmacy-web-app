-- =============================================================================
-- Super Admin: إنشاء صيدلية SaaS + صلاحية INSERT على organizations
-- Run in Supabase SQL Editor AFTER multi-branch-organizations.sql
-- =============================================================================

drop policy if exists "organizations_insert" on organizations;

create policy "organizations_insert" on organizations
  for insert to authenticated
  with check (public.is_super_admin());

-- إنشاء صيدلية جديدة (مجموعة + فرع رئيسي) — يتجاوز RLS
create or replace function public.create_saas_pharmacy(
  p_id text,
  p_name text,
  p_name_en text default null,
  p_phone text default '',
  p_address text default '',
  p_subscription_tier text default 'basic',
  p_subscription_plan text default 'monthly',
  p_subscription_status text default 'active',
  p_max_branches integer default null,
  p_max_users integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_org_id text;
  v_tier text;
  v_max_branches integer;
  v_max_users integer;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  v_id := lower(trim(p_id));
  if v_id = '' then
    raise exception 'pharmacy_id_required';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'pharmacy_name_required';
  end if;

  if exists (select 1 from public.pharmacies where id = v_id) then
    raise exception 'pharmacy_id_exists';
  end if;

  v_org_id := 'org-' || v_id;
  v_tier := coalesce(nullif(trim(p_subscription_tier), ''), 'basic');
  if v_tier not in ('basic', 'professional', 'premium') then
    v_tier := 'basic';
  end if;

  v_max_branches := greatest(
    1,
    coalesce(
      p_max_branches,
      case v_tier
        when 'professional' then 3
        when 'premium' then 10
        else 1
      end
    )
  );

  v_max_users := greatest(
    1,
    coalesce(
      p_max_users,
      case v_tier
        when 'professional' then 15
        when 'premium' then 50
        else 5
      end
    )
  );

  insert into public.organizations (id, name, max_branches, max_users, subscription_tier)
  values (v_org_id, trim(p_name), v_max_branches, v_max_users, v_tier)
  on conflict (id) do update set
    name = excluded.name,
    max_branches = excluded.max_branches,
    max_users = excluded.max_users,
    subscription_tier = excluded.subscription_tier,
    updated_at = now();

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
    subscription_status
  ) values (
    v_id,
    trim(p_name),
    coalesce(nullif(trim(p_name_en), ''), trim(p_name)),
    coalesce(p_phone, ''),
    coalesce(p_address, ''),
    'ج.م',
    true,
    v_org_id,
    v_max_branches,
    v_max_users,
    v_tier,
    coalesce(nullif(trim(p_subscription_plan), ''), 'monthly'),
    coalesce(nullif(trim(p_subscription_status), ''), 'active')
  );

  return jsonb_build_object(
    'id', v_id,
    'organization_id', v_org_id,
    'max_branches', v_max_branches,
    'max_users', v_max_users,
    'subscription_tier', v_tier
  );
end;
$$;

revoke all on function public.create_saas_pharmacy(
  text, text, text, text, text, text, text, text, integer, integer
) from public;

grant execute on function public.create_saas_pharmacy(
  text, text, text, text, text, text, text, text, integer, integer
) to authenticated;

notify pgrst, 'reload schema';
