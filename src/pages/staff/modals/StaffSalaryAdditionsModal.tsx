import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { formatWorkMinutes } from "../../../utils/hrFormatters";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffSalaryAdditionsModal({ state }: Props) {
  const {
    isArabic,
    currency,
    salaryAdditionsModal,
    setSalaryAdditionsModal,
    canEditSalaryRecord,
    salaryBusyAction,
    saveSalaryAdditions,
  } = state;

  if (!salaryAdditionsModal) return null;

  const canEdit = canEditSalaryRecord(salaryAdditionsModal.record);

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
                ? `زيادات — ${salaryAdditionsModal.record.userName}`
                : `Additions — ${salaryAdditionsModal.record.userName}`}
            </h3>
            {salaryAdditionsModal.commissionRate > 0 && (
              <p className="returnsSectionHint">
                {isArabic ? "نسبة العمولة في ملف الموظف:" : "Employee commission rate:"}{" "}
                {salaryAdditionsModal.commissionRate}%
              </p>
            )}
          </div>
          <button
            type="button"
            className="deleteSmallBtn"
            onClick={() => setSalaryAdditionsModal(null)}
          >
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
              value={salaryAdditionsModal.draft.specialAllowances}
              disabled={!canEdit}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setSalaryAdditionsModal({
                  ...salaryAdditionsModal,
                  draft: {
                    ...salaryAdditionsModal.draft,
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
              value={salaryAdditionsModal.draft.bonuses}
              disabled={!canEdit}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setSalaryAdditionsModal({
                  ...salaryAdditionsModal,
                  draft: {
                    ...salaryAdditionsModal.draft,
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
              value={salaryAdditionsModal.draft.incentives}
              readOnly
              tabIndex={-1}
            />
            <small className="returnsSectionHint">
              {isArabic
                ? `${formatWorkMinutes(salaryAdditionsModal.overtimeMinutes, true)} إضافية × ${salaryAdditionsModal.overtimePercent}% من مرتب الساعة = ${formatMoney(salaryAdditionsModal.draft.incentives)} ${currency}`
                : `${formatWorkMinutes(salaryAdditionsModal.overtimeMinutes, false)} overtime × ${salaryAdditionsModal.overtimePercent}% of hourly rate = ${formatMoney(salaryAdditionsModal.draft.incentives)} ${currency}`}
            </small>
          </label>
          <label>
            {isArabic ? "عمولة المبيعات" : "Sales commission"}
            <input
              type="number"
              min={0}
              className="searchInput"
              value={salaryAdditionsModal.draft.commission}
              readOnly={salaryAdditionsModal.commissionRate > 0}
              disabled={!canEdit || salaryAdditionsModal.record.status !== "draft"}
              onChange={(e) =>
                setSalaryAdditionsModal({
                  ...salaryAdditionsModal,
                  draft: {
                    ...salaryAdditionsModal.draft,
                    commission: Number(e.target.value) || 0,
                  },
                })
              }
            />
            {salaryAdditionsModal.commissionRate > 0 && (
              <small className="returnsSectionHint">
                {isArabic
                  ? `${salaryAdditionsModal.salesInvoiceCount} فاتورة بمبيعات ${formatMoney(salaryAdditionsModal.salesTotal)} ${currency} × ${salaryAdditionsModal.commissionRate}% = ${formatMoney(salaryAdditionsModal.draft.commission)} ${currency}`
                  : `${salaryAdditionsModal.salesInvoiceCount} invoices, sales ${formatMoney(salaryAdditionsModal.salesTotal)} ${currency} × ${salaryAdditionsModal.commissionRate}% = ${formatMoney(salaryAdditionsModal.draft.commission)} ${currency}`}
              </small>
            )}
          </label>
        </div>

        <div className="hrAdditionsTotal cardInner">
          <strong>{isArabic ? "إجمالي الزيادات:" : "Total additions:"}</strong>{" "}
          {formatMoney(
            pharmacyService.sumPayrollAdditions({
              ...salaryAdditionsModal.record,
              ...salaryAdditionsModal.draft,
            }),
          )}{" "}
          {currency}
        </div>

        <div className="modalActions">
          {canEdit && (
            <button
              type="button"
              className="completeBtn"
              disabled={!!salaryBusyAction}
              onClick={() => void saveSalaryAdditions()}
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          )}
          <button type="button" className="editBtn" onClick={() => setSalaryAdditionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
