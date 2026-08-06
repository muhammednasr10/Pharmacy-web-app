import type { ReactNode } from "react";
import { isTrialSubscriptionStatus } from "../../../../config/subscription";
import {
  getPharmacyEndDate,
  getPharmacyStartDate,
  isPharmacyActive,
} from "../../helpers";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";

type Props = {
  state: SuperAdminPageState;
  children: ReactNode;
};

export default function ManageTenantModalShell({ state, children }: Props) {
  const {
    isArabic,
    selected,
    selectedTrialStatus,
    setManageModalOpen,
    handleOpenEmployeesPage,
    handleViewAsTenant,
  } = state;

  if (!selected) return null;

  return (
    <div className="modalOverlay">
      <div className="invoiceModal saasModal saasModalWide" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>
              {isArabic ? "إدارة الصيدلية" : "Manage Pharmacy"} — {selected.name}
            </h2>
            <p>
              <code dir="ltr">{selected.id}</code>
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={() => setManageModalOpen(false)}>
            ×
          </button>
        </div>

        <div className="saasInfoGrid">
          <div>
            <span>{isArabic ? "الهاتف" : "Phone"}</span>
            <strong dir="ltr">{selected.phone || "—"}</strong>
          </div>
          <div>
            <span>{isArabic ? "الحالة" : "Status"}</span>
            <strong>
              {isTrialSubscriptionStatus(selected.subscriptionStatus)
                ? isArabic
                  ? "نسخة مجانية"
                  : "Free trial"
                : isPharmacyActive(selected)
                  ? isArabic
                    ? "نشط"
                    : "Active"
                  : isArabic
                    ? "موقوف"
                    : "Suspended"}
            </strong>
          </div>
          <div>
            <span>{isArabic ? "بدء الاشتراك" : "Subscription start"}</span>
            <strong>{getPharmacyStartDate(selected, isArabic)}</strong>
          </div>
          <div>
            <span>{isArabic ? "انتهاء الاشتراك" : "Subscription end"}</span>
            <strong>
              {getPharmacyEndDate(selected, isArabic)}
              {selectedTrialStatus?.isTrialSubscription &&
              selectedTrialStatus.subscriptionDaysLeft !== null ? (
                <span className="saasFreeTrialDaysLeft">
                  {selectedTrialStatus.subscriptionDaysLeft < 0
                    ? isArabic
                      ? " (منتهية)"
                      : " (expired)"
                    : isArabic
                      ? ` (متبقي ${selectedTrialStatus.subscriptionDaysLeft} يوم)`
                      : ` (${selectedTrialStatus.subscriptionDaysLeft} days left)`}
                </span>
              ) : null}
            </strong>
          </div>
        </div>

        {children}

        <div className="saasManageFooterActions">
          <button
            type="button"
            className="editBtn"
            onClick={() => handleOpenEmployeesPage(selected.id)}
          >
            {isArabic ? "صفحة الموظفين" : "Employees page"}
          </button>
          <button type="button" className="editBtn" onClick={() => handleViewAsTenant(selected.id)}>
            {isArabic ? "عرض بيانات الصيدلية" : "View pharmacy data"}
          </button>
        </div>
      </div>
    </div>
  );
}
