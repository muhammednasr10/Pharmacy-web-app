import { supabase } from "../supabaseClient";
import {
  defaultSubscriptionTiers,
  subscriptionTierOrder,
  type SubscriptionTier,
  type SubscriptionTierConfig,
} from "../../config/subscriptionTiers";
import { normalizeTierAllowedFeatures } from "../../config/subscriptionTierFeatures";
import { normalizeTierEnabledPages } from "../../config/subscriptionTierPages";
import { setSubscriptionTierConfigs } from "../../config/subscriptionTierCache";
import { createManagedRealtimeChannel, disposeManagedRealtimeChannel } from "./dbHelpers";

type SubscriptionTierConfigRow = {
  tier_id: string;
  label_ar: string;
  label_en: string;
  max_branches: number;
  max_users: number;
  summary_ar: string;
  summary_en: string;
  features_ar: string[] | null;
  features_en: string[] | null;
  upgrade_amount: number;
  package_price?: number | null;
  enabled_pages?: string[] | null;
  allowed_features?: string[] | null;
};

function rowToConfig(row: SubscriptionTierConfigRow): SubscriptionTierConfig {
  const tierId = row.tier_id as SubscriptionTier;
  const defaults = defaultSubscriptionTiers[tierId];
  return {
    id: tierId,
    labelAr: row.label_ar || defaults.labelAr,
    labelEn: row.label_en || defaults.labelEn,
    maxBranches: Number(row.max_branches) || defaults.maxBranches,
    maxUsers: Number(row.max_users) || defaults.maxUsers,
    summaryAr: row.summary_ar || defaults.summaryAr,
    summaryEn: row.summary_en || defaults.summaryEn,
    featuresAr: Array.isArray(row.features_ar) ? row.features_ar.map(String) : defaults.featuresAr,
    featuresEn: Array.isArray(row.features_en) ? row.features_en.map(String) : defaults.featuresEn,
    upgradeAmount: Number(row.upgrade_amount ?? defaults.upgradeAmount),
    packagePrice: Number(row.package_price ?? defaults.packagePrice),
    enabledPages: normalizeTierEnabledPages(row.enabled_pages, tierId),
    allowedFeatures: normalizeTierAllowedFeatures(row.allowed_features, tierId),
  };
}

function configsToRecord(rows: SubscriptionTierConfigRow[]): Record<SubscriptionTier, SubscriptionTierConfig> {
  const map = { ...defaultSubscriptionTiers };
  rows.forEach((row) => {
    const tierId = row.tier_id as SubscriptionTier;
    if (!subscriptionTierOrder.includes(tierId)) return;
    map[tierId] = rowToConfig(row);
  });
  return map;
}

export async function loadSubscriptionTierConfigs(): Promise<Record<SubscriptionTier, SubscriptionTierConfig>> {
  const { data, error } = await supabase.from("subscription_tier_configs").select("*");

  if (error) {
    if (error.message.includes("subscription_tier_configs") && error.message.includes("does not exist")) {
      setSubscriptionTierConfigs(defaultSubscriptionTiers);
      return defaultSubscriptionTiers;
    }
    console.error("loadSubscriptionTierConfigs error:", error.message);
    setSubscriptionTierConfigs(defaultSubscriptionTiers);
    return defaultSubscriptionTiers;
  }

  const configs = configsToRecord((data || []) as SubscriptionTierConfigRow[]);
  setSubscriptionTierConfigs(configs);
  return configs;
}

export type SubscriptionTierConfigInput = {
  labelAr: string;
  labelEn: string;
  maxBranches: number;
  maxUsers: number;
  summaryAr: string;
  summaryEn: string;
  featuresAr: string[];
  featuresEn: string[];
  upgradeAmount: number;
  packagePrice: number;
  enabledPages: SubscriptionTierConfig["enabledPages"];
  allowedFeatures: SubscriptionTierConfig["allowedFeatures"];
};

export async function upsertSubscriptionTierConfig(
  tierId: SubscriptionTier,
  input: SubscriptionTierConfigInput,
  operatorUid?: string,
): Promise<SubscriptionTierConfig> {
  const payload = {
    tier_id: tierId,
    label_ar: input.labelAr.trim(),
    label_en: input.labelEn.trim(),
    max_branches: Math.max(1, Math.floor(input.maxBranches)),
    max_users: Math.max(1, Math.floor(input.maxUsers)),
    summary_ar: input.summaryAr.trim(),
    summary_en: input.summaryEn.trim(),
    features_ar: input.featuresAr.map((line) => line.trim()).filter(Boolean),
    features_en: input.featuresEn.map((line) => line.trim()).filter(Boolean),
    upgrade_amount: Math.max(0, Number(input.upgradeAmount) || 0),
    package_price: Math.max(0, Number(input.packagePrice) || 0),
    enabled_pages: input.enabledPages,
    allowed_features: input.allowedFeatures,
    updated_at: new Date().toISOString(),
    updated_by: operatorUid || null,
  };

  const { data, error } = await supabase
    .from("subscription_tier_configs")
    .upsert(payload, { onConflict: "tier_id" })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("subscription_tier_configs") && error.message.includes("does not exist")) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }

  const saved = rowToConfig(data as SubscriptionTierConfigRow);
  setSubscriptionTierConfigs({ [tierId]: saved });
  return saved;
}

let tierConfigRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const tierConfigRealtimeListeners = new Set<
  (configs: Record<SubscriptionTier, SubscriptionTierConfig>) => void
>();

function notifyTierConfigListeners(configs: Record<SubscriptionTier, SubscriptionTierConfig>) {
  tierConfigRealtimeListeners.forEach((listener) => {
    try {
      listener(configs);
    } catch (error) {
      console.error("subscription tier listener error:", error);
    }
  });
}

function ensureTierConfigRealtimeChannel() {
  if (tierConfigRealtimeChannel) return;

  const channelName = "realtime-subscription-tier-configs";
  tierConfigRealtimeChannel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "subscription_tier_configs" },
    () => {
      void loadSubscriptionTierConfigs().then(notifyTierConfigListeners);
    },
  );
  void tierConfigRealtimeChannel.subscribe();
}

export function subscribeSubscriptionTierConfigs(
  callback: (configs: Record<SubscriptionTier, SubscriptionTierConfig>) => void,
) {
  tierConfigRealtimeListeners.add(callback);
  ensureTierConfigRealtimeChannel();

  return () => {
    tierConfigRealtimeListeners.delete(callback);
    if (tierConfigRealtimeListeners.size === 0 && tierConfigRealtimeChannel) {
      disposeManagedRealtimeChannel(tierConfigRealtimeChannel);
      tierConfigRealtimeChannel = null;
    }
  };
}
