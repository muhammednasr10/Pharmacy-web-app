-- =============================================================================
-- إعدادات باقات الاشتراك — Subscription tier configs (Super Admin editable)
-- شغّل في Supabase → SQL Editor
-- =============================================================================

create table if not exists subscription_tier_configs (
  tier_id text primary key,
  label_ar text not null,
  label_en text not null,
  max_branches integer not null check (max_branches >= 1),
  max_users integer not null check (max_users >= 1),
  summary_ar text not null default '',
  summary_en text not null default '',
  features_ar jsonb not null default '[]'::jsonb,
  features_en jsonb not null default '[]'::jsonb,
  upgrade_amount numeric not null default 0,
  updated_at timestamptz default now(),
  updated_by text
);

alter table subscription_tier_configs
  drop constraint if exists subscription_tier_configs_tier_id_check;

alter table subscription_tier_configs
  add constraint subscription_tier_configs_tier_id_check
  check (tier_id in ('basic', 'professional', 'premium'));

create index if not exists idx_subscription_tier_configs_updated
  on subscription_tier_configs (updated_at desc);

alter table subscription_tier_configs enable row level security;

drop policy if exists "subscription_tier_configs_select" on subscription_tier_configs;
drop policy if exists "subscription_tier_configs_write" on subscription_tier_configs;

create policy "subscription_tier_configs_select" on subscription_tier_configs
  for select to authenticated
  using (public.is_active_user());

create policy "subscription_tier_configs_write" on subscription_tier_configs
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

insert into subscription_tier_configs (
  tier_id,
  label_ar,
  label_en,
  max_branches,
  max_users,
  summary_ar,
  summary_en,
  features_ar,
  features_en,
  upgrade_amount
)
values
  (
    'basic',
    'أساسي',
    'Basic',
    1,
    5,
    'فرع واحد — حتى 5 مستخدمين',
    '1 branch — up to 5 users',
    '["فرع واحد","حتى 5 مستخدمين","نقطة بيع ومخزون","فواتير ومرتجعات"]'::jsonb,
    '["1 branch","Up to 5 users","POS and inventory","Invoices and returns"]'::jsonb,
    0
  ),
  (
    'professional',
    'احترافي',
    'Professional',
    3,
    15,
    'حتى 3 فروع — حتى 15 مستخدماً',
    'Up to 3 branches — up to 15 users',
    '["حتى 3 فروع","حتى 15 مستخدماً","تقارير حسب الفرع","نقل مخزون بين الفروع","اعتماد طلبات النقل"]'::jsonb,
    '["Up to 3 branches","Up to 15 users","Branch breakdown reports","Inter-branch stock transfers","Transfer approvals"]'::jsonb,
    800
  ),
  (
    'premium',
    'فاخر',
    'Premium',
    10,
    50,
    'حتى 10 فروع — حتى 50 مستخدماً',
    'Up to 10 branches — up to 50 users',
    '["حتى 10 فروع","حتى 50 مستخدماً","كل مميزات الاحترافي","HR مركزي لكل الفروع","تنبيهات مخزون على مستوى المجموعة"]'::jsonb,
    '["Up to 10 branches","Up to 50 users","All Professional features","Central HR across branches","Organization-wide inventory alerts"]'::jsonb,
    1500
  )
on conflict (tier_id) do nothing;
