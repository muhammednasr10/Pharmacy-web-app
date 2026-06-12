import { isTrialSubscriptionStatus } from "../config/subscription";
import type { PharmacySettings } from "../types";

export function getSubscriptionStatus(pharmacySettings: PharmacySettings | null | undefined) {
  const subscriptionEndDate = pharmacySettings?.subscriptionEndDate || "";
  const subscriptionEnd = subscriptionEndDate ? new Date(`${subscriptionEndDate}T23:59:59`) : null;

  const todayDate = new Date();

  const subscriptionDaysLeft = subscriptionEnd
    ? Math.ceil((subscriptionEnd.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isSubscriptionExpired = subscriptionDaysLeft !== null && subscriptionDaysLeft < 0;

  const isSubscriptionExpiringSoon =
    subscriptionDaysLeft !== null && subscriptionDaysLeft >= 0 && subscriptionDaysLeft <= 7;

  const isTrialSubscription = isTrialSubscriptionStatus(pharmacySettings?.subscriptionStatus);

  return {
    subscriptionEndDate,
    subscriptionDaysLeft,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    isTrialSubscription,
  };
}
