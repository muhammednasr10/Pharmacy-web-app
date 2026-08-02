import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { formatWorkMinutes } from "../../../utils/hrFormatters";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrPayrollAdditionsModal({ state }: Props) {
  const {
    isArabic,
    additionsModal,
    setAdditionsModal,
    canManageHrFor,
    payrollBranchId,
    busyAction,
    savePayrollAdditions,
    currency,
  } = state;

  if (!additionsModal) return null;

  return (
    
        <div className="modalOverlay">
          <div
            className="invoiceModal userModal hrAdditionsModal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader">
              <div>
                <h3>
                  {isArabic
                    ? `زيادات — ${additionsModal.record.userName}`
                    : `Additions — ${additionsModal.record.userName}`}
                </h3>
                {additionsModal.commissionRate > 0 && (
                  <p className="returnsSectionHint">
                    {isArabic ? "نسبة العمولة في ملف الموظف:" : "Employee commission rate:"}{" "}
                    {additionsModal.commissionRate}%
                  </p>
                )}
              </div>
              <button type="button" className="deleteSmallBtn" onClick={() => setAdditionsModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
    
            <div className="hrAdditionsForm">
              <label>
                {isArabic ? "علاوات خاصة" : "Special allowances"}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="searchInput"
                  value={additionsModal.draft.specialAllowances}
                  disabled={!canManageHrFor(payrollBranchId(additionsModal.record))}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setAdditionsModal({
                      ...additionsModal,
                      draft: {
                        ...additionsModal.draft,
                        specialAllowances: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                      },
                    });
                  }}
                />
              </label>
              <label>
                {isArabic ? "مكافآت" : "Bonuses"}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="searchInput"
                  value={additionsModal.draft.bonuses}
                  disabled={!canManageHrFor(payrollBranchId(additionsModal.record))}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setAdditionsModal({
                      ...additionsModal,
                      draft: {
                        ...additionsModal.draft,
                        bonuses: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                      },
                    });
                  }}
                />
              </label>
              <label>
                {isArabic ? "حوافز (إضافي)" : "Incentives (overtime)"}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="searchInput hrAdditionsReadonlyInput"
                  value={additionsModal.draft.incentives}
                  readOnly
                  tabIndex={-1}
                />
                <small className="returnsSectionHint">
                  {isArabic
                    ? `${formatWorkMinutes(additionsModal.overtimeMinutes, true)} إضافية × ${additionsModal.overtimePercent}% من مرتب الساعة = ${formatMoney(additionsModal.draft.incentives)} ${currency}`
                    : `${formatWorkMinutes(additionsModal.overtimeMinutes, false)} overtime × ${additionsModal.overtimePercent}% of hourly rate = ${formatMoney(additionsModal.draft.incentives)} ${currency}`}
                </small>
              </label>
              <label>
                {isArabic ? "عمولة المبيعات" : "Sales commission"}
                <input
                  type="number"
                  min={0}
                  className="searchInput"
                  value={additionsModal.draft.commission}
                  readOnly={additionsModal.commissionRate > 0}
                  disabled={
                    !canManageHrFor(payrollBranchId(additionsModal.record)) ||
                    additionsModal.record.status !== "draft"
                  }
                  onChange={(e) =>
                    setAdditionsModal({
                      ...additionsModal,
                      draft: { ...additionsModal.draft, commission: Number(e.target.value) || 0 },
                    })
                  }
                />
                {additionsModal.commissionRate > 0 && (
                  <small className="returnsSectionHint">
                    {isArabic
                      ? `${additionsModal.salesInvoiceCount} فاتورة بمبيعات ${formatMoney(additionsModal.salesTotal)} ${currency} × ${additionsModal.commissionRate}% = ${formatMoney(additionsModal.draft.commission)} ${currency}`
                      : `${additionsModal.salesInvoiceCount} invoices, sales ${formatMoney(additionsModal.salesTotal)} ${currency} × ${additionsModal.commissionRate}% = ${formatMoney(additionsModal.draft.commission)} ${currency}`}
                  </small>
                )}
              </label>
            </div>
    
            <div className="hrAdditionsTotal cardInner">
              <strong>{isArabic ? "إجمالي الزيادات:" : "Total additions:"}</strong>{" "}
              {formatMoney(
                pharmacyService.sumPayrollAdditions({
                  ...additionsModal.record,
                  ...additionsModal.draft,
                }),
              )}{" "}
              {currency}
            </div>
    
            <div className="modalActions">
              {canManageHrFor(payrollBranchId(additionsModal.record)) && (
                <button
                  type="button"
                  className="completeBtn"
                  disabled={!!busyAction}
                  onClick={() => void savePayrollAdditions()}
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              )}
              <button type="button" className="editBtn" onClick={() => setAdditionsModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
  );
}
