-- =============================================================================
-- Subscription tiers — باقات الاشتراك (أساسي / احترافي / فاخر)
-- Run AFTER organization-branch-limit.sql
-- =============================================================================

alter table pharmacies
  add column if not exists subscription_tier text;

alter table organizations
  add column if not exists subscription_tier text;

update pharmacies
set subscription_tier = case
  when coalesce(subscription_plan, '') in ('professional', 'pro') then 'professional'
  when coalesce(subscription_plan, '') in ('premium', 'luxury', 'deluxe') then 'premium'
  else 'basic'
end
where subscription_tier is null;

update organizations o
set subscription_tier = p.subscription_tier
from pharmacies p
where p.organization_id = o.id
  and o.subscription_tier is null
  and p.subscription_tier is not null;

update pharmacies set subscription_tier = 'basic' where subscription_tier is null;
update organizations set subscription_tier = 'basic' where subscription_tier is null;

alter table pharmacies
  drop constraint if exists pharmacies_subscription_tier_check;

alter table pharmacies
  add constraint pharmacies_subscription_tier_check
  check (subscription_tier in ('basic', 'professional', 'premium'));

alter table organizations
  drop constraint if exists organizations_subscription_tier_check;

alter table organizations
  add constraint organizations_subscription_tier_check
  check (subscription_tier in ('basic', 'professional', 'premium'));

-- مزامنة حد الفروع مع الباقة
update organizations o
set max_branches = case o.subscription_tier
  when 'professional' then greatest(coalesce(o.max_branches, 1), 3)
  when 'premium' then greatest(coalesce(o.max_branches, 1), 10)
  else 1
end;

update pharmacies p
set max_branches = o.max_branches,
    subscription_tier = o.subscription_tier
from organizations o
where p.organization_id = o.id;

notify pgrst, 'reload schema';
