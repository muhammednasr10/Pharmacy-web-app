import { useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import { isTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import {
  buildRequestPlanOptions,
  getRequestPricing,
  getSubscriptionDisplayValues,
  getTierDerivedValues,
} from "./subscriptionSettingsHelpers";
import type { RequestPlan, SubscriptionSettingsPanelProps } from "./types";

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
  const [requestPlan, setRequestPlan] = useState<RequestPlan>("monthly");
  const [customDays, setCustomDays] = useState(30);
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

  const requestPlanOptions = useMemo(
    () => buildRequestPlanOptions(isArabic, tierDerived.tierConfig.packagePrice),
    [isArabic, tierDerived.tierConfig.packagePrice],
  );

  const pendingRequest = pharmacySubscriptionRequests.find((r) => r.status === "pending");
  const pendingTierUpgrade = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && isTierUpgradePlan(r.plan),
  );

  const { requestDays, requestAmount } = getRequestPricing(
    requestPlan,
    customDays,
    subscriptionTier,
    tierDerived.tierConfig.packagePrice,
  );

  async function handleSubmitTierUpgradeRequest() {
    if (!tierDerived.tierUpgradeTarget || !submitTierUpgradeRequest) return;
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
      const created = await submitTierUpgradeRequest(tierDerived.tierUpgradeTarget);
      if (created) {
        setPaymentRequest(created);
      }
    } finally {
      setSubmittingTierUpgrade(false);
    }
  }

  async function handleSubmitSubscriptionRequest() {
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة. أكمل الدفع أو انتظر الاعتماد."
          : "You already have a pending subscription request.",
      );
      if (!isTierUpgradePlan(pendingRequest.plan)) {
        setPaymentRequest(pendingRequest);
      }
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await submitSubscriptionRequest({
        plan: requestPlan,
        days: requestDays,
        amount: requestAmount,
      });
      if (created) {
        setPaymentRequest(created);
      }
    } finally {
      setSubmittingRequest(false);
    }
  }

  return {
    requestPlan,
    setRequestPlan,
    customDays,
    setCustomDays,
    submittingRequest,
    submittingTierUpgrade,
    paymentRequest,
    setPaymentRequest,
    tierDerived,
    displayValues,
    requestPlanOptions,
    pendingRequest,
    pendingTierUpgrade,
    requestDays,
    requestAmount,
    handleSubmitTierUpgradeRequest,
    handleSubmitSubscriptionRequest,
  };
}
