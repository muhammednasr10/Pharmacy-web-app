import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import { parseTierUpgradePlan } from "../utils/subscriptionFeatures";

export function getPaymentLabel(method: string, isArabic: boolean) {
  if (method === "cash") return isArabic ? "كاش" : "Cash";
  if (method === "visa") return isArabic ? "فيزا" : "Visa";
  if (method === "wallet") return isArabic ? "محفظة" : "Wallet";
  if (method === "credit") return isArabic ? "آجل" : "Credit";
  return method;
}

export function getSubscriptionPlanLabel(plan: string, isArabic: boolean) {
  const targetTier = parseTierUpgradePlan(plan);
  if (targetTier) {
    return isArabic
      ? `ترقية إلى ${getSubscriptionTierLabel(targetTier, true)}`
      : `Upgrade to ${getSubscriptionTierLabel(targetTier, false)}`;
  }
  if (plan === "trial") {
    return isArabic
      ? `تجريبي ${TRIAL_SUBSCRIPTION_DAYS} يوم`
      : `${TRIAL_SUBSCRIPTION_DAYS}-day trial`;
  }
  if (plan === "monthly") return isArabic ? "شهري" : "Monthly";
  if (plan === "quarterly") return isArabic ? "ربع سنوي" : "Quarterly";
  if (plan === "yearly") return isArabic ? "سنوي" : "Yearly";
  if (plan === "lifetime") return isArabic ? "مدى الحياة" : "Lifetime";
  return plan || "-";
}

export function showSubscriptionExpiredAlert(isArabic: boolean) {
  alert(
    isArabic
      ? "الاشتراك منتهي، يرجى التجديد لاستمرار استخدام النظام"
      : "Subscription expired. Please renew to continue using the system",
  );
}
