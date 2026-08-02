-- =============================================================================
-- Dynamic Feature Gating — allowed_features + plans_config view
-- Run AFTER subscription-tier-configs.sql (other tier migrations optional — this file adds missing columns)
--
-- Mapping to your schema:
--   plans_config.plan_id        = subscription_tier_configs.tier_id
--   plans_config.allowed_routes = subscription_tier_configs.enabled_pages
--   pharmacies.subscription_tier = plan_id for each pharmacy branch
-- =============================================================================

alter table public.subscription_tier_configs
  add column if not exists enabled_pages jsonb not null default '[]'::jsonb;

alter table public.subscription_tier_configs
  add column if not exists package_price numeric not null default 0;

alter table public.subscription_tier_configs
  add column if not exists allowed_features jsonb not null default '[]'::jsonb;

update public.subscription_tier_configs
set package_price = case tier_id
  when 'basic' then 500
  when 'professional' then 1000
  when 'premium' then 1800
  else package_price
end
where package_price is null or package_price = 0;

update public.subscription_tier_configs
set enabled_pages = '[
  "dashboard","inventory","pos","invoices","returns","purchases","costs","customers",
  "reports","stockMovements","activityLogs","users","employeePortal","settings","userGuide"
]'::jsonb
where tier_id = 'basic'
  and (enabled_pages is null or enabled_pages = '[]'::jsonb);

update public.subscription_tier_configs
set enabled_pages = '[
  "dashboard","inventory","pos","invoices","returns","purchases","costs","customers",
  "reports","stockMovements","activityLogs","users","branches","employeePortal","settings","userGuide"
]'::jsonb
where tier_id in ('professional', 'premium')
  and (enabled_pages is null or enabled_pages = '[]'::jsonb);

-- Basic: no premium/pro features
update public.subscription_tier_configs
set allowed_features = '[]'::jsonb
where tier_id = 'basic'
  and (allowed_features is null or allowed_features = '[]'::jsonb);

-- Professional: multi-branch + transfers + branch reports
update public.subscription_tier_configs
set allowed_features = '[
  "branchesPage",
  "multiBranchSwitch",
  "branchTransfers",
  "branchBreakdownReports"
]'::jsonb
where tier_id = 'professional'
  and (allowed_features is null or allowed_features = '[]'::jsonb);

-- Premium: all features
update public.subscription_tier_configs
set allowed_features = '[
  "branchesPage",
  "multiBranchSwitch",
  "branchTransfers",
  "branchBreakdownReports",
  "orgInventoryAlerts",
  "centralHr"
]'::jsonb
where tier_id = 'premium'
  and (allowed_features is null or allowed_features = '[]'::jsonb);

-- Readable alias for external tools / Supabase dashboard
create or replace view public.plans_config as
select
  tier_id as plan_id,
  label_en as plan_name,
  label_ar as plan_name_ar,
  max_branches,
  max_users,
  package_price,
  upgrade_amount,
  enabled_pages as allowed_routes,
  allowed_features,
  summary_ar,
  summary_en,
  features_ar,
  features_en,
  updated_at,
  updated_by
from public.subscription_tier_configs;

comment on view public.plans_config is
  'Subscription packages: allowed_routes (pages) and allowed_features per plan. pharmacies.subscription_tier links each pharmacy to plan_id.';

notify pgrst, 'reload schema';
