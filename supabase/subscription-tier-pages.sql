-- =============================================================================
-- صفحات الباقة — enabled_pages per subscription tier
-- Run AFTER subscription-tier-configs.sql
-- =============================================================================

alter table public.subscription_tier_configs
  add column if not exists enabled_pages jsonb not null default '[]'::jsonb;

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

notify pgrst, 'reload schema';
