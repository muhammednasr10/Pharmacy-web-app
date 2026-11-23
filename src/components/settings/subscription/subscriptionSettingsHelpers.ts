import { TRIAL_SUBSCRIPTION_DAYS } from "../../../config/subscription";
import { getSubscriptionTier } from "../../../config/subscriptionTiers";
import { parseTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import type { SubscriptionTone } from "./types";

export function getRequestStatusLabel(isArabic: boolean, status: string) {
  if (status === "approved") return isArabic ? "معتمد" : "Approved";
  if (status === "rejected") return isArabic ? "مرفوض" : "Rejected";
  return isArabic ? "قيد المراجعة" : "Pending";
}

export function getRequestTypeLabel(isArabic: boolean, plan: string) {
  const targetTier = parseTierUpgradePlan(plan);
  if (targetTier) {
    const target = getSubscriptionTier(targetTier);
    return isArabic ? `ترقية إلى ${target.labelAr}` : `Upgrade to ${target.labelEn}`;
  }
  return isArabic ? "تجديد اشتراك" : "Renewal";
}

type SubscriptionDisplayInput = {
  isArabic: boolean;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription: boolean;
  subscriptionDaysLeft: number | string | null;
  subscriptionPlan: string;
  subscriptionEndDate: string;
};

export function getSubscriptionDisplayValues({
  isArabic,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription,
  subscriptionDaysLeft,
  subscriptionPlan,
  subscriptionEndDate,
}: SubscriptionDisplayInput) {
  const subscriptionTone: SubscriptionTone = isSubscriptionExpired
    ? "expired"
    : isSubscriptionExpiringSoon
      ? "warning"
      : isTrialSubscription
        ? "trial"
        : "active";

  const subscriptionStatusLabel = isSubscriptionExpired
    ? isArabic
      ? "منتهي"
      : "Expired"
    : isSubscriptionExpiringSoon
      ? isArabic
        ? "قرب الانتهاء"
        : "Expiring Soon"
      : isTrialSubscription
        ? isArabic
          ? "تجريبي"
          : "Trial"
        : isArabic
          ? "نشط"
          : "Active";

  const daysLeftNumeric =
    subscriptionDaysLeft === null ? null : Number(subscriptionDaysLeft);
  const daysLeftLabel =
    subscriptionDaysLeft === null
      ? isArabic
        ? "غير محدد"
        : "Not set"
      : daysLeftNumeric !== null && daysLeftNumeric < 0
        ? isArabic
          ? "منتهي"
          : "Expired"
        : String(subscriptionDaysLeft);

  const subscriptionMessage = isSubscriptionExpired
    ? isArabic
      ? isTrialSubscription
        ? `انتهت الفترة التجريبية (${TRIAL_SUBSCRIPTION_DAYS} يوم). اشترك للاستمرار.`
        : "انتهى الاشتراك. يرجى التجديد لاستمرار استخدام النظام."
      : isTrialSubscription
        ? `Your ${TRIAL_SUBSCRIPTION_DAYS}-day trial has ended. Subscribe to continue.`
        : "Subscription expired. Renew to continue using the system."
    : isTrialSubscription
      ? isArabic
        ? `أنت على فترة تجريبية مجانية ${TRIAL_SUBSCRIPTION_DAYS} يوماً. متبقي ${subscriptionDaysLeft ?? "?"} يوم.`
        : `You are on a free ${TRIAL_SUBSCRIPTION_DAYS}-day trial. ${subscriptionDaysLeft ?? "?"} days left.`
      : isSubscriptionExpiringSoon
        ? isArabic
          ? `متبقي ${subscriptionDaysLeft} يوم على انتهاء الاشتراك.`
          : `${subscriptionDaysLeft} days left until subscription ends.`
        : subscriptionPlan === "lifetime"
          ? isArabic
            ? "اشتراك مدى الحياة — النظام متاح بدون قيود زمنية."
            : "Lifetime license — full access without expiry."
          : isArabic
            ? "الاشتراك نشط ويعمل بشكل طبيعي."
            : "Subscription is active and running normally.";

  const progressCap =
    subscriptionPlan === "trial" || isTrialSubscription
      ? TRIAL_SUBSCRIPTION_DAYS
      : subscriptionPlan === "yearly"
        ? 365
        : subscriptionPlan === "quarterly"
          ? 90
          : subscriptionPlan === "lifetime"
            ? null
            : 30;

  const progressPercent =
    progressCap && daysLeftNumeric !== null && daysLeftNumeric >= 0
      ? Math.min(100, Math.max(8, (daysLeftNumeric / progressCap) * 100))
      : subscriptionPlan === "lifetime"
        ? 100
        : 0;

  const formattedEndDate = subscriptionEndDate
    ? new Date(`${subscriptionEndDate}T12:00:00`).toLocaleDateString(
        isArabic ? "ar-EG" : "en-GB",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "-";

  return {
    subscriptionTone,
    subscriptionStatusLabel,
    daysLeftLabel,
    subscriptionMessage,
    progressPercent,
    formattedEndDate,
  };
}
