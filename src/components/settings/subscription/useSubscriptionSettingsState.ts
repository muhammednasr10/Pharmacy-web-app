import { useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import { getPlanDays } from "../../../config/subscription";
import { isTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import { getSubscriptionDisplayValues } from "./subscriptionSettingsHelpers";
import type { BillingView, SubscriptionSettingsPanelProps } from "./types";

export type { BillingView } from "./types";

export function useSubscriptionSettingsState({
  isArabic,
  settingsForm,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription = false,
  submitSubscriptionRequest,
  pharmacySubscriptionRequests,
  subscriptionDaysLeft,
}: SubscriptionSettingsPanelProps) {
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<SubscriptionRequest | null>(null);

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
  const pendingRenewal = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && !isTierUpgradePlan(r.plan),
  );

  async function handleSubmitRenewalRequest(billingView: BillingView, amount: number) {
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
    const requestAmount = Math.max(0, Math.round(amount));

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
    paymentRequest,
    setPaymentRequest,
    displayValues,
    pendingRequest,
    pendingRenewal,
    handleSubmitRenewalRequest,
  };
}
