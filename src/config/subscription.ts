import { developerInfo } from "../branding";
import { formatDateInput } from "../utils/date";
import { getSubscriptionTier, type SubscriptionTier } from "./subscriptionTiers";

export type SubscriptionPlanKey = "monthly" | "quarterly" | "yearly" | "custom" | "trial";

/** Free trial length for new pharmacy signups */
export const TRIAL_SUBSCRIPTION_DAYS = 14;

export function isTrialSubscriptionStatus(status?: string | null) {
  return status === "trial";
}

export function isActiveSubscriptionStatus(status?: string | null) {
  if (!status) return true;
  return status === "active" || status === "trial";
}

export function computeTrialEndDate(from = new Date()) {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_SUBSCRIPTION_DAYS);
  return formatDateInput(end);
}

export const subscriptionPaymentInfo = {
  instapayAccount: developerInfo.phone,
  instapayName: developerInfo.name,
  currency: "EGP",
};

export const subscriptionPlanPricing = {
  monthly: { days: 30, amount: 500, labelAr: "شهري", labelEn: "Monthly" },
  quarterly: { days: 90, amount: 1350, labelAr: "ربع سنوي", labelEn: "Quarterly" },
  yearly: { days: 365, amount: 4800, labelAr: "سنوي", labelEn: "Yearly" },
} as const;

/** Annual plan is 20% cheaper than paying monthly for 12 months. */
export const YEARLY_SUBSCRIPTION_DISCOUNT = 0.2;

export function getQuarterlyPlanAmount(monthlyPrice: number): number {
  const monthly = monthlyPrice > 0 ? monthlyPrice : subscriptionPlanPricing.monthly.amount;
  return Math.round(monthly * 3);
}

export function getYearlyPlanAmount(monthlyPrice: number): number {
  const monthly = monthlyPrice > 0 ? monthlyPrice : subscriptionPlanPricing.monthly.amount;
  return Math.round(monthly * 12 * (1 - YEARLY_SUBSCRIPTION_DISCOUNT));
}

export function getTierUpgradeAmount(targetTier: SubscriptionTier): number {
  return getTierPackagePrice(targetTier);
}

export function getTierPackagePrice(tier: SubscriptionTier): number {
  return getSubscriptionTier(tier).packagePrice;
}

export function getTierUpgradePricingLabel(
  targetTier: SubscriptionTier,
  isArabic: boolean,
): string {
  const tier = getSubscriptionTier(targetTier);
  return isArabic ? `ترقية إلى باقة ${tier.labelAr}` : `Upgrade to ${tier.labelEn}`;
}

export function getSubscriptionAmountForDays(days: number, monthlyPrice?: number) {
  const safeDays = Math.max(1, Math.floor(days));
  const baseMonthly = monthlyPrice && monthlyPrice > 0 ? monthlyPrice : subscriptionPlanPricing.monthly.amount;
  const dailyRate = baseMonthly / subscriptionPlanPricing.monthly.days;
  return Math.round(safeDays * dailyRate);
}

export function getPlanAmountForTier(plan: string, tier: SubscriptionTier, customDays?: number) {
  const monthly = getTierPackagePrice(tier) || subscriptionPlanPricing.monthly.amount;
  if (plan === "monthly") return monthly;
  if (plan === "quarterly") return getQuarterlyPlanAmount(monthly);
  if (plan === "yearly") return getYearlyPlanAmount(monthly);
  if (plan === "custom" && customDays) return getSubscriptionAmountForDays(customDays, monthly);
  return 0;
}

export function getPlanDays(plan: string) {
  if (plan === "monthly") return subscriptionPlanPricing.monthly.days;
  if (plan === "quarterly") return subscriptionPlanPricing.quarterly.days;
  if (plan === "yearly") return subscriptionPlanPricing.yearly.days;
  return 0;
}

export function getPlanAmount(plan: string, customDays?: number) {
  const monthly = subscriptionPlanPricing.monthly.amount;
  if (plan === "monthly") return monthly;
  if (plan === "quarterly") return getQuarterlyPlanAmount(monthly);
  if (plan === "yearly") return getYearlyPlanAmount(monthly);
  if (plan === "custom" && customDays) return getSubscriptionAmountForDays(customDays);
  return 0;
}

export function planToSubscriptionPlan(days: number) {
  if (days >= 365) return "yearly";
  if (days >= 90) return "quarterly";
  return "monthly";
}

export function computeSubscriptionEndDate(currentEndDateStr: string | undefined, days: number) {
  const currentEndDate = currentEndDateStr ? new Date(`${currentEndDateStr}T23:59:59`) : new Date();
  const today = new Date();
  const startDate = currentEndDate > today ? currentEndDate : today;
  startDate.setDate(startDate.getDate() + days);
  return formatDateInput(startDate);
}
