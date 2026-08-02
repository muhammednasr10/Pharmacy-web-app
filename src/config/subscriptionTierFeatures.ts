import type { SubscriptionTier } from "./subscriptionTiers";

/** Granular features (tabs, actions) — stored in DB as allowed_features. */
export type TierFeatureKey =
  | "branchesPage"
  | "multiBranchSwitch"
  | "branchTransfers"
  | "branchBreakdownReports"
  | "orgInventoryAlerts"
  | "centralHr";

export type TierFeatureDefinition = {
  key: TierFeatureKey;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

export const TIER_CONFIGURABLE_FEATURES: TierFeatureDefinition[] = [
  {
    key: "branchesPage",
    labelAr: "صفحة الفروع",
    labelEn: "Branches page",
    descriptionAr: "إدارة فروع الصيدلية من صفحة الفروع",
    descriptionEn: "Manage pharmacy branches from the branches page",
  },
  {
    key: "multiBranchSwitch",
    labelAr: "التبديل بين الفروع",
    labelEn: "Multi-branch switch",
    descriptionAr: "اختيار فرع آخر من الشريط العلوي",
    descriptionEn: "Switch active branch from the top bar",
  },
  {
    key: "branchTransfers",
    labelAr: "نقل المخزون بين الفروع",
    labelEn: "Branch stock transfers",
    descriptionAr: "إنشاء واعتماد طلبات نقل المخزون",
    descriptionEn: "Create and approve inter-branch stock transfers",
  },
  {
    key: "branchBreakdownReports",
    labelAr: "تقارير حسب الفرع",
    labelEn: "Branch breakdown reports",
    descriptionAr: "عرض المبيعات والأرباح لكل فرع",
    descriptionEn: "Sales and profit breakdown per branch",
  },
  {
    key: "orgInventoryAlerts",
    labelAr: "تنبيهات مخزون المجموعة",
    labelEn: "Organization inventory alerts",
    descriptionAr: "تنبيهات النواقص على مستوى كل الفروع",
    descriptionEn: "Low-stock alerts across all branches",
  },
  {
    key: "centralHr",
    labelAr: "الموارد البشرية المركزية",
    labelEn: "Central HR",
    descriptionAr: "إدارة حضور الموظفين لكل الفروع",
    descriptionEn: "Manage employee attendance across branches",
  },
];

const professionalFeatures: TierFeatureKey[] = [
  "branchesPage",
  "multiBranchSwitch",
  "branchTransfers",
  "branchBreakdownReports",
];

const premiumFeatures: TierFeatureKey[] = [
  ...professionalFeatures,
  "orgInventoryAlerts",
  "centralHr",
];

export const defaultTierAllowedFeatures: Record<SubscriptionTier, TierFeatureKey[]> = {
  basic: [],
  professional: [...professionalFeatures],
  premium: [...premiumFeatures],
};

export function getTierFeatureLabel(key: TierFeatureKey, isArabic: boolean): string {
  const def = TIER_CONFIGURABLE_FEATURES.find((entry) => entry.key === key);
  if (!def) return key;
  return isArabic ? def.labelAr : def.labelEn;
}

export function normalizeTierAllowedFeatures(
  value: unknown,
  tierId: SubscriptionTier,
): TierFeatureKey[] {
  const allowed = new Set(TIER_CONFIGURABLE_FEATURES.map((entry) => entry.key));
  const fallback = defaultTierAllowedFeatures[tierId];
  if (!Array.isArray(value)) return [...fallback];

  const features = value
    .map((entry) => String(entry).trim())
    .filter((entry): entry is TierFeatureKey => allowed.has(entry as TierFeatureKey));

  return features.length ? [...new Set(features)] : [...fallback];
}

export function sanitizeTierAllowedFeaturesSelection(features: TierFeatureKey[]): TierFeatureKey[] {
  const allowed = new Set(TIER_CONFIGURABLE_FEATURES.map((entry) => entry.key));
  return [...new Set(features.filter((feature) => allowed.has(feature)))];
}

export function tierFeaturesToRecord(features: TierFeatureKey[]): Record<TierFeatureKey, boolean> {
  const set = new Set(features);
  return TIER_CONFIGURABLE_FEATURES.reduce(
    (acc, def) => {
      acc[def.key] = set.has(def.key);
      return acc;
    },
    {} as Record<TierFeatureKey, boolean>,
  );
}
