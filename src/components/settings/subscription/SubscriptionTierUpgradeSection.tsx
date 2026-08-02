import type { SubscriptionRequest } from "../../../types";
import type { SubscriptionTierConfig } from "../../../config/subscriptionTiers";
import { getRequestTypeLabel } from "./subscriptionSettingsHelpers";

type SubscriptionTierUpgradeSectionProps = {
  isArabic: boolean;
  tierUpgradeConfig: SubscriptionTierConfig;
  tierUpgradeAmount: number;
  pendingTierUpgrade?: SubscriptionRequest;
  pendingRequest?: SubscriptionRequest;
  submittingTierUpgrade: boolean;
  onSubmitUpgrade: () => void;
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

export default function SubscriptionTierUpgradeSection({
  isArabic,
  tierUpgradeConfig,
  tierUpgradeAmount,
  pendingTierUpgrade,
  pendingRequest,
  submittingTierUpgrade,
  onSubmitUpgrade,
  onShowPaymentInfo,
}: SubscriptionTierUpgradeSectionProps) {
  return (
    <section className="subscriptionEditCard subscriptionTierUpgradeCard">
      <div className="subscriptionEditHeader">
        <span className="subscriptionEditHeaderIcon" aria-hidden="true">
          ⬆️
        </span>
        <div>
          <h3>
            {isArabic
              ? `ترقية إلى باقة ${tierUpgradeConfig.labelAr}`
              : `Upgrade to ${tierUpgradeConfig.labelEn}`}
          </h3>
          <p>
            {isArabic
              ? "أرسل طلب ترقية — سيراجعه المشرف ويفعّل الباقة الجديدة بعد الموافقة"
              : "Submit an upgrade request — an admin will review and activate the new package"}
          </p>
        </div>
      </div>
      <ul className="subscriptionTierFeatureList">
        {(isArabic ? tierUpgradeConfig.featuresAr : tierUpgradeConfig.featuresEn).map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <div className="subscriptionRequestSummary">
        <div>
          <span>{isArabic ? "سعر الباقة الجديدة (شهري)" : "New package price (monthly)"}</span>
          <strong>
            {tierUpgradeAmount} {isArabic ? "ج.م / شهر" : "EGP / month"}
          </strong>
        </div>
      </div>
      {pendingTierUpgrade ? (
        <div className="subscriptionSaveBar">
          <p className="returnsSectionHint">
            {isArabic
              ? `لديك طلب ترقية قيد المراجعة (${getRequestTypeLabel(isArabic, pendingTierUpgrade.plan)}).`
              : `You have a pending upgrade request (${getRequestTypeLabel(isArabic, pendingTierUpgrade.plan)}).`}
          </p>
          <button
            type="button"
            className="smallBtn"
            onClick={() => onShowPaymentInfo(pendingTierUpgrade)}
          >
            {isArabic ? "تعليمات الدفع" : "Payment info"}
          </button>
        </div>
      ) : (
        <div className="subscriptionSaveBar">
          <button
            type="button"
            className="completeBtn subscriptionSaveBtn"
            disabled={submittingTierUpgrade || Boolean(pendingRequest)}
            onClick={() => void onSubmitUpgrade()}
          >
            {submittingTierUpgrade
              ? isArabic
                ? "جاري إرسال الطلب..."
                : "Submitting..."
              : isArabic
                ? "إرسال طلب ترقية الباقة"
                : "Submit package upgrade request"}
          </button>
        </div>
      )}
    </section>
  );
}
