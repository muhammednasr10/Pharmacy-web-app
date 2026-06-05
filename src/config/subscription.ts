import { developerInfo } from "../branding";
import { formatDateInput } from "../utils/date";

export type SubscriptionPlanKey = "monthly" | "quarterly" | "yearly" | "custom";

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

const DAILY_RATE = subscriptionPlanPricing.monthly.amount / subscriptionPlanPricing.monthly.days;

export function getSubscriptionAmountForDays(days: number) {
  const safeDays = Math.max(1, Math.floor(days));
  return Math.round(safeDays * DAILY_RATE);
}

export function getPlanDays(plan: string) {
  if (plan === "monthly") return subscriptionPlanPricing.monthly.days;
  if (plan === "quarterly") return subscriptionPlanPricing.quarterly.days;
  if (plan === "yearly") return subscriptionPlanPricing.yearly.days;
  return 0;
}

export function getPlanAmount(plan: string, customDays?: number) {
  if (plan === "monthly") return subscriptionPlanPricing.monthly.amount;
  if (plan === "quarterly") return subscriptionPlanPricing.quarterly.amount;
  if (plan === "yearly") return subscriptionPlanPricing.yearly.amount;
  if (plan === "custom" && customDays) return getSubscriptionAmountForDays(customDays);
  return 0;
}

export function planToSubscriptionPlan(days: number) {
  if (days >= 365) return "yearly";
  if (days >= 90) return "quarterly";
  return "monthly";
}

export function computeSubscriptionEndDate(currentEndDateStr: string | undefined, days: number) {
  const currentEndDate = currentEndDateStr
    ? new Date(`${currentEndDateStr}T23:59:59`)
    : new Date();
  const today = new Date();
  const startDate = currentEndDate > today ? currentEndDate : today;
  startDate.setDate(startDate.getDate() + days);
  return formatDateInput(startDate);
}
