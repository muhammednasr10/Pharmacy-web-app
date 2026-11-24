import { useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import { getPlanDays } from "../../../config/subscription";
import { isTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import {
  buildLimitChangePlan,
  isLimitChangePlan,
  type SubscriptionLimitChange,
} from "../../../utils/subscriptionLimitChange";
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
  const pendingLimitChange = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && isLimitChangePlan(r.plan),
  );
  const pendingRenewal = pharmacySubscriptionRequests.find(
    (r) =>
      r.status === "pending" && !isTierUpgradePlan(r.plan) && !isLimitChangePlan(r.plan),
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

  async function handleSubmitLimitChangeRequest(
    change: SubscriptionLimitChange,
    amount: number,
  ) {
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة بالفعل. انتظر اعتماد مالك النظام."
          : "You already have a pending subscription request awaiting approval.",
      );
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await submitSubscriptionRequest({
        plan: buildLimitChangePlan(change),
        days: 0,
        amount: Math.max(0, Math.round(amount)),
      });
      if (created) {
        alert(
          isArabic
            ? "تم إرسال طلب تعديل الباقة. سيظهر التغيير بعد اعتماد مالك النظام."
            : "Package change request submitted. Changes apply after system-owner approval.",
        );
      }
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إرسال طلب تعديل الباقة" : "Could not submit package change request");
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
    pendingLimitChange,
    handleSubmitRenewalRequest,
    handleSubmitLimitChangeRequest,
  };
}
