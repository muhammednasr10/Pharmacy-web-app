import { useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import { getPlanAmountForTier, getPlanDays } from "../../../config/subscription";
import type { SubscriptionTier } from "../../../config/subscriptionTiers";
import { isTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import {
  getSubscriptionDisplayValues,
  getTierDerivedValues,
} from "./subscriptionSettingsHelpers";
import type { BillingView, SubscriptionSettingsPanelProps } from "./types";

export type { BillingView } from "./types";

export function useSubscriptionSettingsState({
  isArabic,
  settingsForm,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription = false,
  subscriptionTier = "basic",
  submitSubscriptionRequest,
  submitTierUpgradeRequest,
  pharmacySubscriptionRequests,
  subscriptionDaysLeft,
}: SubscriptionSettingsPanelProps) {
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submittingTierUpgrade, setSubmittingTierUpgrade] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<SubscriptionRequest | null>(null);

  const tierDerived = useMemo(
    () => getTierDerivedValues(subscriptionTier, isArabic),
    [subscriptionTier, isArabic],
  );

  const displayValues = useMemo(
    () =>
      getSubscriptionDisplayValues({
        isArabic,
        isSubscriptionExpired,
        isSubscriptionExpiringSoon,
        isTrialSubscription,
        subscriptionDaysLeft,
        subscriptionPlan: settingsForm.subscriptionPlan,
        subscriptionEndDate: settingsForm.subscriptionEndDate,
      }),
    [
      isArabic,
      isSubscriptionExpired,
      isSubscriptionExpiringSoon,
      isTrialSubscription,
      subscriptionDaysLeft,
      settingsForm.subscriptionPlan,
      settingsForm.subscriptionEndDate,
    ],
  );

  const pendingRequest = pharmacySubscriptionRequests.find((r) => r.status === "pending");
  const pendingTierUpgrade = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && isTierUpgradePlan(r.plan),
  );
  const pendingRenewal = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && !isTierUpgradePlan(r.plan),
  );

  async function handleSubmitTierUpgradeRequest(targetTier?: SubscriptionTier) {
    const upgradeTarget = targetTier ?? tierDerived.tierUpgradeTarget;
    if (!upgradeTarget || !submitTierUpgradeRequest) return;
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة. انتظر الاعتماد قبل إرسال طلب جديد."
          : "You already have a pending subscription request.",
      );
      return;
    }

    setSubmittingTierUpgrade(true);
    try {
      const created = await submitTierUpgradeRequest(upgradeTarget);
      if (created) {
        setPaymentRequest(created);
      }
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إرسال طلب الترقية" : "Could not submit upgrade request");
    } finally {
      setSubmittingTierUpgrade(false);
    }
  }

  async function handleSubmitRenewalRequest(billingView: BillingView) {
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة. أكمل الدفع أو انتظر الاعتماد."
          : "You already have a pending subscription request.",
      );
      if (pendingRenewal) {
        setPaymentRequest(pendingRenewal);
      }
      return;
    }

    const plan = billingView === "yearly" ? "yearly" : "monthly";
    const requestDays = getPlanDays(plan);
    const requestAmount = getPlanAmountForTier(plan, subscriptionTier);

    setSubmittingRequest(true);
    try {
      const created = await submitSubscriptionRequest({
        plan,
        days: requestDays,
        amount: requestAmount,
      });
      if (created) {
        setPaymentRequest(created);
      }
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إرسال طلب التجديد" : "Could not submit renewal request");
    } finally {
      setSubmittingRequest(false);
    }
  }

  return {
    submittingRequest,
    submittingTierUpgrade,
    paymentRequest,
    setPaymentRequest,
    displayValues,
    pendingRequest,
    pendingTierUpgrade,
    pendingRenewal,
    handleSubmitTierUpgradeRequest,
    handleSubmitRenewalRequest,
  };
}
