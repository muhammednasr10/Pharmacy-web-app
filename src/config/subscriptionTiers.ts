export type SubscriptionTier = "basic" | "professional" | "premium";

export type SubscriptionTierConfig = {
  id: SubscriptionTier;
  labelAr: string;
  labelEn: string;
  maxBranches: number;
  summaryAr: string;
  summaryEn: string;
  featuresAr: string[];
  featuresEn: string[];
};

export const subscriptionTiers: Record<SubscriptionTier, SubscriptionTierConfig> = {
  basic: {
    id: "basic",
    labelAr: "أساسي",
    labelEn: "Basic",
    maxBranches: 1,
    summaryAr: "فرع واحد — المبيعات والمخزون الأساسي",
    summaryEn: "1 branch — core sales and inventory",
    featuresAr: ["فرع واحد", "نقطة بيع ومخزون", "فواتير ومرتجعات"],
    featuresEn: ["1 branch", "POS and inventory", "Invoices and returns"],
  },
  professional: {
    id: "professional",
    labelAr: "احترافي",
    labelEn: "Professional",
    maxBranches: 3,
    summaryAr: "حتى 3 فروع — تقارير مجمّعة ونقل مخزون",
    summaryEn: "Up to 3 branches — consolidated reports and transfers",
    featuresAr: ["حتى 3 فروع", "تقارير حسب الفرع", "نقل مخزون بين الفروع", "اعتماد طلبات النقل"],
    featuresEn: [
      "Up to 3 branches",
      "Branch breakdown reports",
      "Inter-branch stock transfers",
      "Transfer approvals",
    ],
  },
  premium: {
    id: "premium",
    labelAr: "فاخر",
    labelEn: "Premium",
    maxBranches: 10,
    summaryAr: "حتى 10 فروع — كل المميزات وHR مركزي",
    summaryEn: "Up to 10 branches — all features and central HR",
    featuresAr: [
      "حتى 10 فروع",
      "كل مميزات الاحترافي",
      "HR مركزي لكل الفروع",
      "تنبيهات مخزون على مستوى المجموعة",
    ],
    featuresEn: [
      "Up to 10 branches",
      "All Professional features",
      "Central HR across branches",
      "Organization-wide inventory alerts",
    ],
  },
};

export const subscriptionTierOrder: SubscriptionTier[] = ["basic", "professional", "premium"];

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
  return subscriptionTiers[parseSubscriptionTier(value)];
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
