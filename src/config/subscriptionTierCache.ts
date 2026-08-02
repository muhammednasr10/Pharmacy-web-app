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
        enabledPages: [...tier.enabledPages],
        allowedFeatures: [...tier.allowedFeatures],
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
      enabledPages: override.enabledPages ? [...override.enabledPages] : merged[tierId].enabledPages,
      allowedFeatures: override.allowedFeatures
        ? [...override.allowedFeatures]
        : merged[tierId].allowedFeatures,
      packagePrice: override.packagePrice ?? merged[tierId].packagePrice,
    };
  });
  cachedTierConfigs = merged;
}

export function resetSubscriptionTierConfigs() {
  cachedTierConfigs = null;
}
