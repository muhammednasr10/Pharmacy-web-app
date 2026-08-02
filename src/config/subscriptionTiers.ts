import type { Page } from "../types";
import { getCachedSubscriptionTierConfigs } from "./subscriptionTierCache";
import { defaultTierAllowedFeatures, type TierFeatureKey } from "./subscriptionTierFeatures";
import { defaultTierEnabledPages } from "./subscriptionTierPages";

export type { TierFeatureKey } from "./subscriptionTierFeatures";

export type SubscriptionTier = "basic" | "professional" | "premium";

export type SubscriptionTierConfig = {
  id: SubscriptionTier;
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
  enabledPages: Page[];
  allowedFeatures: TierFeatureKey[];
};

export const defaultSubscriptionTiers: Record<SubscriptionTier, SubscriptionTierConfig> = {
  basic: {
    id: "basic",
    labelAr: "أساسي",
    labelEn: "Basic",
    maxBranches: 1,
    maxUsers: 5,
    summaryAr: "فرع واحد — حتى 5 مستخدمين",
    summaryEn: "1 branch — up to 5 users",
    featuresAr: ["فرع واحد", "حتى 5 مستخدمين", "نقطة بيع ومخزون", "فواتير ومرتجعات"],
    featuresEn: ["1 branch", "Up to 5 users", "POS and inventory", "Invoices and returns"],
    upgradeAmount: 0,
    packagePrice: 500,
    enabledPages: [...defaultTierEnabledPages.basic],
    allowedFeatures: [...defaultTierAllowedFeatures.basic],
  },
  professional: {
    id: "professional",
    labelAr: "احترافي",
    labelEn: "Professional",
    maxBranches: 3,
    maxUsers: 15,
    summaryAr: "حتى 3 فروع — حتى 15 مستخدماً",
    summaryEn: "Up to 3 branches — up to 15 users",
    featuresAr: [
      "حتى 3 فروع",
      "حتى 15 مستخدماً",
      "تقارير حسب الفرع",
      "نقل مخزون بين الفروع",
      "اعتماد طلبات النقل",
    ],
    featuresEn: [
      "Up to 3 branches",
      "Up to 15 users",
      "Branch breakdown reports",
      "Inter-branch stock transfers",
      "Transfer approvals",
    ],
    upgradeAmount: 0,
    packagePrice: 1000,
    enabledPages: [...defaultTierEnabledPages.professional],
    allowedFeatures: [...defaultTierAllowedFeatures.professional],
  },
  premium: {
    id: "premium",
    labelAr: "فاخر",
    labelEn: "Premium",
    maxBranches: 10,
    maxUsers: 50,
    summaryAr: "حتى 10 فروع — حتى 50 مستخدماً",
    summaryEn: "Up to 10 branches — up to 50 users",
    featuresAr: [
      "حتى 10 فروع",
      "حتى 50 مستخدماً",
      "كل مميزات الاحترافي",
      "HR مركزي لكل الفروع",
      "تنبيهات مخزون على مستوى المجموعة",
    ],
    featuresEn: [
      "Up to 10 branches",
      "Up to 50 users",
      "All Professional features",
      "Central HR across branches",
      "Organization-wide inventory alerts",
    ],
    upgradeAmount: 0,
    packagePrice: 1800,
    enabledPages: [...defaultTierEnabledPages.premium],
    allowedFeatures: [...defaultTierAllowedFeatures.premium],
  },
};

export const subscriptionTierOrder: SubscriptionTier[] = ["basic", "professional", "premium"];

export const subscriptionTiers = new Proxy({} as Record<SubscriptionTier, SubscriptionTierConfig>, {
  get(_target, prop) {
    const configs = getCachedSubscriptionTierConfigs();
    return configs[prop as SubscriptionTier];
  },
});

export function parseSubscriptionTier(value?: string | null): SubscriptionTier {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "professional" || normalized === "pro") return "professional";
  if (normalized === "premium" || normalized === "luxury" || normalized === "deluxe") {
    return "premium";
  }
  return "basic";
}

export function getSubscriptionTier(value?: string | null): SubscriptionTierConfig {
  return getCachedSubscriptionTierConfigs()[parseSubscriptionTier(value)];
}

export function getSubscriptionTierLabel(
  value: string | undefined | null,
  isArabic: boolean,
): string {
  const tier = getSubscriptionTier(value);
  return isArabic ? tier.labelAr : tier.labelEn;
}

export function tierAllowsMultiBranch(tier: SubscriptionTier): boolean {
  return tier === "professional" || tier === "premium";
}
