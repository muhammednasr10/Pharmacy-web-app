-- =============================================================================
-- Restore main pharmacy row after accidental wipe
-- Needed for: cashier_shifts.pharmacy_id FK, subscription write checks, stats RLS
-- Safe to re-run. Does NOT touch medicines / purchases on main.
-- =============================================================================

insert into public.organizations (id, name, max_branches, max_users, subscription_tier)
values ('org-main', 'Victory / النصر', 10, 50, 'professional')
on conflict (id) do update set
  name = excluded.name,
  max_branches = coalesce(organizations.max_branches, excluded.max_branches),
  max_users = coalesce(organizations.max_users, excluded.max_users),
  subscription_tier = coalesce(organizations.subscription_tier, excluded.subscription_tier),
  updated_at = now();

insert into public.pharmacies (
  id,
  name,
  name_en,
  currency,
  is_active,
  organization_id,
  subscription_status,
  subscription_tier,
  subscription_plan,
  subscription_end_date,
  max_branches,
  max_users
) values (
  'main',
  'Victory',
  'Victory',
  'ج.م',
  true,
  'org-main',
  'active',
  'professional',
  'monthly',
  '2099-12-31',
  10,
  50
)
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  is_active = true,
  organization_id = coalesce(pharmacies.organization_id, excluded.organization_id),
  subscription_status = 'active',
  subscription_tier = coalesce(pharmacies.subscription_tier, excluded.subscription_tier),
  subscription_plan = coalesce(pharmacies.subscription_plan, excluded.subscription_plan),
  subscription_end_date = coalesce(nullif(trim(pharmacies.subscription_end_date), ''), excluded.subscription_end_date),
  max_branches = coalesce(pharmacies.max_branches, excluded.max_branches),
  max_users = coalesce(pharmacies.max_users, excluded.max_users),
  updated_at = now();

-- Separate empty branch for destructive import / delete QA
insert into public.pharmacies (
  id,
  name,
  name_en,
  currency,
  is_active,
  organization_id,
  subscription_status,
  subscription_tier,
  subscription_plan,
  subscription_end_date,
  max_branches,
  max_users
) values (
  'qa-test',
  'QA Test Branch',
  'QA Test Branch',
  'ج.م',
  true,
  'org-main',
  'active',
  'professional',
  'monthly',
  '2099-12-31',
  10,
  50
)
on conflict (id) do update set
  is_active = true,
  organization_id = 'org-main',
  subscription_status = 'active',
  updated_at = now();
