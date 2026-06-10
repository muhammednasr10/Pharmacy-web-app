import {
  getSubscriptionTier,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../config/subscriptionTiers";
import type { AppUser, Page, PharmacySettings } from "../types";
import {
  isAccountant,
  isBranchManager,
  isOrgPharmacyAdmin,
  isSuperAdmin,
} from "./roles";

export type TierFeatureKey =
  | "branchesPage"
  | "multiBranchSwitch"
  | "branchTransfers"
  | "branchBreakdownReports"
  | "orgInventoryAlerts"
  | "centralHr";

export type TierFeatures = Record<TierFeatureKey, boolean>;

const tierFeatureMatrix: Record<SubscriptionTier, TierFeatures> = {
  basic: {
    branchesPage: false,
    multiBranchSwitch: false,
    branchTransfers: false,
    branchBreakdownReports: false,
    orgInventoryAlerts: false,
    centralHr: false,
  },
  professional: {
    branchesPage: true,
    multiBranchSwitch: true,
    branchTransfers: true,
    branchBreakdownReports: true,
    orgInventoryAlerts: false,
    centralHr: false,
  },
  premium: {
    branchesPage: true,
    multiBranchSwitch: true,
    branchTransfers: true,
    branchBreakdownReports: true,
    orgInventoryAlerts: true,
    centralHr: true,
  },
};

export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  return tierFeatureMatrix[tier];
}

export function resolveOrganizationTier(
  branches: PharmacySettings[],
  homePharmacyId?: string | null
): SubscriptionTier {
  if (!branches.length) return "basic";
  const home =
    branches.find((branch) => branch.id === homePharmacyId) || branches[0];
  return parseSubscriptionTier(home?.subscriptionTier || home?.subscriptionPlan);
}

export function isTierFeatureEnabled(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  feature: TierFeatureKey
): boolean {
  if (isSuperAdmin(appUser)) return true;
  return getTierFeatures(tier)[feature];
}

export function filterPagesBySubscriptionTier(
  pages: Page[],
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier
): Page[] {
  if (isSuperAdmin(appUser)) return pages;
  const features = getTierFeatures(tier);
  return pages.filter((page) => {
    if (page === "branches" && !features.branchesPage) return false;
    return true;
  });
}

export function canSwitchBranchesWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (branchCount <= 1) return false;
  if (isSuperAdmin(appUser)) return true;
  if (!getTierFeatures(tier).multiBranchSwitch) return false;
  return isOrgPharmacyAdmin(appUser) || isAccountant(appUser);
}

export function canViewBranchBreakdownWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (branchCount <= 1) return false;
  if (isSuperAdmin(appUser)) return true;
  if (!getTierFeatures(tier).branchBreakdownReports) return false;
  return isOrgPharmacyAdmin(appUser) || isAccountant(appUser);
}

export function canManageOrgBranchesWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier
): boolean {
  if (!isOrgPharmacyAdmin(appUser)) return false;
  return isTierFeatureEnabled(appUser, tier, "branchesPage");
}

export function canTransferStockWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (branchCount <= 1) return false;
  if (!isOrgPharmacyAdmin(appUser)) return false;
  return isTierFeatureEnabled(appUser, tier, "branchTransfers");
}

export function canShowOrgInventoryAlertsWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (branchCount <= 1) return false;
  if (!isOrgPharmacyAdmin(appUser)) return false;
  return isTierFeatureEnabled(appUser, tier, "orgInventoryAlerts");
}

export function canShowCentralHrWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (!isOrgPharmacyAdmin(appUser)) return false;
  if (branchCount <= 1) return false;
  return isTierFeatureEnabled(appUser, tier, "centralHr");
}

/** Accountant views HR across branches (professional+) — read-only in UI. */
export function canViewOrgHrAcrossBranchesWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (!isAccountant(appUser)) return false;
  if (branchCount <= 1) return false;
  return isTierFeatureEnabled(appUser, tier, "multiBranchSwitch");
}

export function canViewOrgHrWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  return (
    canShowCentralHrWithTier(appUser, tier, branchCount) ||
    canViewOrgHrAcrossBranchesWithTier(appUser, tier, branchCount)
  );
}

/** Org admin manages login accounts for every branch (professional+). */
export function canManageOrgLoginAccountsWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (!isOrgPharmacyAdmin(appUser)) return false;
  if (branchCount <= 1) return false;
  return isTierFeatureEnabled(appUser, tier, "branchesPage");
}

export function canReviewBranchTransfersWithTier(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number
): boolean {
  if (branchCount <= 1) return false;
  if (isSuperAdmin(appUser)) return true;
  if (!getTierFeatures(tier).branchTransfers) return false;
  return isOrgPharmacyAdmin(appUser) || isBranchManager(appUser);
}

export const TIER_UPGRADE_PLAN_PREFIX = "tier_upgrade:";

export function buildTierUpgradePlan(targetTier: SubscriptionTier): string {
  return `${TIER_UPGRADE_PLAN_PREFIX}${targetTier}`;
}

export function parseTierUpgradePlan(plan: string): SubscriptionTier | null {
  if (!plan.startsWith(TIER_UPGRADE_PLAN_PREFIX)) return null;
  const tier = plan.slice(TIER_UPGRADE_PLAN_PREFIX.length);
  if (tier === "professional" || tier === "premium") return tier;
  return null;
}

export function isTierUpgradePlan(plan: string): boolean {
  return parseTierUpgradePlan(plan) !== null;
}

export function getNextSubscriptionTier(tier: SubscriptionTier): SubscriptionTier | null {
  if (tier === "basic") return "professional";
  if (tier === "professional") return "premium";
  return null;
}

export type TierUpgradePrompt = {
  targetTier: SubscriptionTier;
  title: string;
  summary: string;
  features: string[];
  ctaLabel: string;
};

/** Dashboard upsell for org admin below premium. */
export function getTierUpgradePrompt(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  isArabic: boolean
): TierUpgradePrompt | null {
  if (!isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)) return null;
  if (tier === "premium") return null;

  const targetTier = getNextSubscriptionTier(tier);
  if (!targetTier) return null;
  const target = getSubscriptionTier(targetTier);
  const current = getSubscriptionTier(tier);
  const features =
    tier === "basic"
      ? isArabic
        ? getSubscriptionTier("professional").featuresAr
        : getSubscriptionTier("professional").featuresEn
      : isArabic
        ? ["HR مركزي لكل الفروع", "تنبيهات مخزون على مستوى المجموعة"]
        : ["Central HR across branches", "Organization-wide inventory alerts"];

  return {
    targetTier,
    title: isArabic ? `ترقية إلى باقة ${target.labelAr}` : `Upgrade to ${target.labelEn}`,
    summary: isArabic
      ? `باقتك الحالية: ${current.labelAr} — ${current.summaryAr}`
      : `Your plan: ${current.labelEn} — ${current.summaryEn}`,
    features,
    ctaLabel: isArabic ? "عرض الاشتراك والباقة" : "View subscription & plan",
  };
}

export function getTierUpgradeHint(
  tier: SubscriptionTier,
  feature: TierFeatureKey,
  isArabic: boolean
): string {
  const requiredTier: SubscriptionTier =
    feature === "centralHr" || feature === "orgInventoryAlerts"
      ? "premium"
      : "professional";
  const required = getSubscriptionTier(requiredTier);
  const current = getSubscriptionTier(tier);
  if (isArabic) {
    return `ميزة باقة ${required.labelAr} — باقتك الحالية: ${current.labelAr}. أرسل طلب ترقية من الإعدادات → الاشتراك.`;
  }
  return `${required.labelEn} package feature — your plan: ${current.labelEn}. Submit an upgrade request in Settings → Subscription.`;
}

/** Inline notice when org admin hits a tier-gated feature. */
export function getTierUpgradeNotice(
  appUser: AppUser | null | undefined,
  tier: SubscriptionTier,
  branchCount: number,
  feature: TierFeatureKey,
  isArabic: boolean
): string | null {
  if (isSuperAdmin(appUser)) return null;
  if (!isOrgPharmacyAdmin(appUser)) return null;
  if (isTierFeatureEnabled(appUser, tier, feature)) return null;
  if (feature !== "branchesPage" && branchCount <= 1) return null;
  return getTierUpgradeHint(tier, feature, isArabic);
}
