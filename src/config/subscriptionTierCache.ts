import type { SubscriptionTier, SubscriptionTierConfig } from "./subscriptionTiers";
import { defaultSubscriptionTiers, subscriptionTierOrder } from "./subscriptionTiers";

let cachedTierConfigs: Record<SubscriptionTier, SubscriptionTierConfig> | null = null;

function cloneTierConfigs(
  source: Record<SubscriptionTier, SubscriptionTierConfig>,
): Record<SubscriptionTier, SubscriptionTierConfig> {
  return subscriptionTierOrder.reduce(
    (acc, tierId) => {
      const tier = source[tierId];
      acc[tierId] = {
        ...tier,
        featuresAr: [...tier.featuresAr],
        featuresEn: [...tier.featuresEn],
      };
      return acc;
    },
    {} as Record<SubscriptionTier, SubscriptionTierConfig>,
  );
}

export function getCachedSubscriptionTierConfigs(): Record<SubscriptionTier, SubscriptionTierConfig> {
  return cachedTierConfigs
    ? cloneTierConfigs(cachedTierConfigs)
    : cloneTierConfigs(defaultSubscriptionTiers);
}

export function setSubscriptionTierConfigs(
  configs: Partial<Record<SubscriptionTier, SubscriptionTierConfig>>,
) {
  const merged = cloneTierConfigs(defaultSubscriptionTiers);
  subscriptionTierOrder.forEach((tierId) => {
    const override = configs[tierId];
    if (!override) return;
    merged[tierId] = {
      ...merged[tierId],
      ...override,
      featuresAr: override.featuresAr ? [...override.featuresAr] : merged[tierId].featuresAr,
      featuresEn: override.featuresEn ? [...override.featuresEn] : merged[tierId].featuresEn,
    };
  });
  cachedTierConfigs = merged;
}

export function resetSubscriptionTierConfigs() {
  cachedTierConfigs = null;
}
