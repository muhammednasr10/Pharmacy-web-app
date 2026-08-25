-- Ensure Basic package always includes Dashboard + core ops pages,
-- and upgrade trial pharmacies to Professional (as product policy).

-- 1) Fix Basic enabled_pages (unlock dashboard / inventory / settings for Basic)
update public.subscription_tier_configs
set enabled_pages = '[
  "dashboard",
  "inventory",
  "pos",
  "invoices",
  "returns",
  "purchases",
  "stockMovements",
  "settings",
  "userGuide"
]'::jsonb
where tier_id = 'basic';

-- 2) Professional / Premium keep full page set
update public.subscription_tier_configs
set enabled_pages = '[
  "dashboard","inventory","pos","invoices","returns","purchases","costs","customers",
  "reports","stockMovements","users","branches","employeePortal","settings","userGuide"
]'::jsonb
where tier_id in ('professional', 'premium');

-- 3) Trial tenants → Professional limits (matches trial-professional-tier.sql)
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

-- 4) Also upgrade صيدلية محروس if still on basic (active trial or mis-tagged)
update public.organizations o
set
  subscription_tier = 'professional',
  max_branches = greatest(coalesce(o.max_branches, 1), 3),
  max_users = greatest(coalesce(o.max_users, 1), 15)
where exists (
  select 1
  from public.pharmacies p
  where p.organization_id = o.id
    and (
      p.name ilike '%محروس%'
      or coalesce(p.name_en, '') ilike '%mahrous%'
    )
);

update public.pharmacies p
set
  subscription_tier = 'professional',
  max_branches = greatest(coalesce(p.max_branches, 1), 3),
  max_users = greatest(coalesce(p.max_users, 1), 15)
where p.name ilike '%محروس%'
   or coalesce(p.name_en, '') ilike '%mahrous%';

notify pgrst, 'reload schema';
