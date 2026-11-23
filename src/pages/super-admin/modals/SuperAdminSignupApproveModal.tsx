import type { PharmacySignupRequest } from "../../../types";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminSignupApproveModal({ state }: Props) {
  const {
    isArabic,
    signupApproveTarget,
    closeSignupApproveModal,
    confirmSignupApprove,
    requestUpdating,
  } = state;

  if (!signupApproveTarget) return null;

  const request = signupApproveTarget as PharmacySignupRequest;

  return (
    <div className="modalOverlay">
      <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
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
            ? "سيتم فتح الصيدلية بتجربة 14 يومًا حسب حدود حاسبة الاشتراك اللي اختارها العميل (فروع/مستخدمين)."
            : "The pharmacy opens with a 14-day trial using the subscription calculator limits the customer chose (branches/users)."}
        </p>

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
