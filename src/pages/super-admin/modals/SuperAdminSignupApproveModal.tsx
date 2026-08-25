import {
  subscriptionTierOrder,
  subscriptionTiers,
  type SubscriptionTier,
} from "../../../config/subscriptionTiers";
import type { PharmacySignupRequest } from "../../../types";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminSignupApproveModal({ state }: Props) {
  const {
    isArabic,
    signupApproveTarget,
    signupApproveTier,
    setSignupApproveTier,
    closeSignupApproveModal,
    confirmSignupApprove,
    requestUpdating,
  } = state;

  if (!signupApproveTarget) return null;

  const request = signupApproveTarget as PharmacySignupRequest;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal saasModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "اعتماد التسجيل" : "Approve signup"}</h2>
            <p>
              {request.pharmacyName} · {request.adminName}
              <br />
              <span dir="ltr">{request.email}</span>
            </p>
          </div>
          <button
            type="button"
            className="closeBtn"
            disabled={requestUpdating}
            onClick={closeSignupApproveModal}
          >
            ×
          </button>
        </div>

        <p className="loginHint">
          {isArabic
            ? "اختر الباقة التجريبية قبل الاعتماد. سيتم فتح الصيدلية لمدة 14 يوماً على الباقة المحددة."
            : "Choose the trial package before approval. The pharmacy opens with a 14-day trial on the selected tier."}
        </p>

        <div className="saasTierPickGrid">
          {subscriptionTierOrder.map((tierId) => {
            const tier = subscriptionTiers[tierId];
            const selected = signupApproveTier === tierId;
            return (
              <button
                key={tierId}
                type="button"
                className={`saasTierPickCard ${tierId}${selected ? " selected" : ""}`}
                disabled={requestUpdating}
                onClick={() => setSignupApproveTier(tierId as SubscriptionTier)}
              >
                <span className="saasTierPickBadge">
                  {isArabic ? tier.labelAr : tier.labelEn}
                </span>
                <strong>{isArabic ? tier.summaryAr : tier.summaryEn}</strong>
                <small>
                  {isArabic
                    ? `${tier.maxBranches} فروع · ${tier.maxUsers} مستخدم`
                    : `${tier.maxBranches} branches · ${tier.maxUsers} users`}
                </small>
              </button>
            );
          })}
        </div>

        <div className="modalActions saasModalActions">
          <button
            type="button"
            className="deleteSmallBtn"
            disabled={requestUpdating}
            onClick={closeSignupApproveModal}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="smallBtn"
            disabled={requestUpdating}
            onClick={() => void confirmSignupApprove()}
          >
            {requestUpdating
              ? isArabic
                ? "جاري الاعتماد..."
                : "Approving..."
              : isArabic
                ? "اعتماد وفتح الصيدلية"
                : "Approve & open pharmacy"}
          </button>
        </div>
      </div>
    </div>
  );
}
