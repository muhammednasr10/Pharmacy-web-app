import type { SubscriptionRequest } from "../../../types";
import type { PricingBillingCycle } from "../../../config/pricingCalculator";

type Props = {
  isArabic: boolean;
  currency: string;
  billingCycle: PricingBillingCycle;
  billedAmount: number;
  editingPackage: boolean;
  packageChanged: boolean;
  submittingRequest: boolean;
  pendingRequest?: SubscriptionRequest;
  pendingRenewal?: SubscriptionRequest;
  pendingLimitChange?: SubscriptionRequest;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitRenewal: () => void;
  onSubmitLimitChange: () => void;
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

export default function SubscriptionPackageActions({
  isArabic,
  currency,
  billingCycle,
  billedAmount,
  editingPackage,
  packageChanged,
  submittingRequest,
  pendingRequest,
  pendingRenewal,
  pendingLimitChange,
  onStartEdit,
  onCancelEdit,
  onSubmitRenewal,
  onSubmitLimitChange,
  onShowPaymentInfo,
}: Props) {
  return (
    <div className="subscriptionCompareCardAction subscriptionPackageActions">
      {pendingLimitChange ? (
        <p className="subscriptionCompareHint inline">
          {isArabic
            ? "طلب تعديل الباقة قيد مراجعة مالك النظام"
            : "Package change request is pending system-owner approval"}
        </p>
      ) : null}

      {pendingRenewal ? (
        <button
          type="button"
          className="subscriptionCompareBtn outline"
          onClick={() => onShowPaymentInfo(pendingRenewal)}
        >
          {isArabic ? "تعليمات الدفع" : "Payment info"}
        </button>
      ) : null}

      {editingPackage ? (
        <>
          <button
            type="button"
            className="subscriptionCompareBtn primary"
            disabled={submittingRequest || Boolean(pendingRequest) || !packageChanged}
            onClick={onSubmitLimitChange}
          >
            {submittingRequest
              ? isArabic
                ? "جاري الإرسال..."
                : "Submitting..."
              : isArabic
                ? "طلب تعديل الباقة (بانتظار الاعتماد)"
                : "Request package change (awaits approval)"}
          </button>
          <button
            type="button"
            className="subscriptionCompareBtn outline"
            disabled={submittingRequest}
            onClick={onCancelEdit}
          >
            {isArabic ? "إلغاء التعديل" : "Cancel edit"}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="subscriptionCompareBtn outline"
            disabled={Boolean(pendingRequest)}
            onClick={onStartEdit}
          >
            {isArabic ? "تعديل الباقة" : "Edit package"}
          </button>
          <button
            type="button"
            className="subscriptionCompareBtn primary"
            disabled={submittingRequest || Boolean(pendingRequest)}
            onClick={onSubmitRenewal}
          >
            {submittingRequest
              ? isArabic
                ? "جاري الإرسال..."
                : "Submitting..."
              : billingCycle === "yearly"
                ? isArabic
                  ? `تجديد سنوي — ${billedAmount.toLocaleString("ar-EG")} ${currency}`
                  : `Renew yearly — ${billedAmount.toLocaleString("en-US")} ${currency}`
                : isArabic
                  ? `تجديد شهري — ${billedAmount.toLocaleString("ar-EG")} ${currency}`
                  : `Renew monthly — ${billedAmount.toLocaleString("en-US")} ${currency}`}
          </button>
        </>
      )}
    </div>
  );
}
