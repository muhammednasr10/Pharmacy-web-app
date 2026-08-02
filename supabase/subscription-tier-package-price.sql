-- =============================================================================
-- سعر الباقة الشهري — package_price per subscription tier
-- Run AFTER subscription-tier-configs.sql
-- =============================================================================

alter table public.subscription_tier_configs
  add column if not exists package_price numeric not null default 0;

update public.subscription_tier_configs
set package_price = case tier_id
  when 'basic' then 500
  when 'professional' then 1000
  when 'premium' then 1800
  else package_price
end
where package_price is null or package_price = 0;

notify pgrst, 'reload schema';
