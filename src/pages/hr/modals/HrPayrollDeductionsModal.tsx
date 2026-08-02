import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { renderAttendanceDeductionLine } from "../helpers";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrPayrollDeductionsModal({ state }: Props) {
  const {
    isArabic,
    deductionsModal,
    setDeductionsModal,
    payrollConfig,
    currency,
  } = state;

  if (!deductionsModal) return null;

  return (
    
        <div className="modalOverlay">
          <div
            className="invoiceModal userModal hrDeductionsModal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader">
              <div>
                <h3>
                  {isArabic
                    ? `خصومات — ${deductionsModal.record.userName}`
                    : `Deductions — ${deductionsModal.record.userName}`}
                </h3>
                <p className="returnsSectionHint">
                  {isArabic ? "اليومية = الراتب الأساسي ÷ 30" : "Daily rate = base salary ÷ 30"} (
                  {formatMoney(deductionsModal.breakdown.dailyRate)} {currency})
                </p>
              </div>
              <button type="button" className="deleteSmallBtn" onClick={() => setDeductionsModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
    
            <div className="hrDeductionsSection cardInner">
              <h4>{isArabic ? "خصومات الحضور" : "Attendance deductions"}</h4>
              {renderAttendanceDeductionLine(
                "غياب",
                "Absence",
                deductionsModal.breakdown.absentDays,
                deductionsModal.breakdown.absentAmount,
                payrollConfig.absentDeductionPercent,
                isArabic,
                currency,
              )}
              <p className="returnsSectionHint">
                {isArabic
                  ? "يشمل أي إجازة فوق الحد المسموح — تُحسب كغياب."
                  : "Includes leave days above the allowed maximum, counted as absence."}
              </p>
              {renderAttendanceDeductionLine(
                "مرضي",
                "Sick leave",
                deductionsModal.breakdown.sickDays,
                deductionsModal.breakdown.sickAmount,
                payrollConfig.sickDeductionPercent,
                isArabic,
                currency,
              )}
              <div className="hrDeductionLine">
                <span>
                  {isArabic ? "إجازات (ضمن الحد):" : "Leave (within limit):"}{" "}
                  <strong>{deductionsModal.breakdown.leaveDays}</strong>{" "}
                  {isArabic
                    ? deductionsModal.breakdown.leaveDays === 1
                      ? "يوم"
                      : "أيام"
                    : deductionsModal.breakdown.leaveDays === 1
                      ? "day"
                      : "days"}
                </span>
                <span>
                  = {formatMoney(0)} {currency}
                  <small> ({isArabic ? "بدون خصم" : "no deduction"})</small>
                </span>
              </div>
              <div className="hrDeductionSubtotal">
                <strong>{isArabic ? "إجمالي خصومات الحضور:" : "Attendance total:"}</strong>{" "}
                {formatMoney(deductionsModal.breakdown.attendanceTotal)} {currency}
              </div>
            </div>
    
            <div className="hrDeductionsSection cardInner">
              <h4>{isArabic ? "ضرائب وتأمينات" : "Taxes & insurance"}</h4>
              <div className="hrDeductionLine">
                <span>{isArabic ? "ضرائب" : "Taxes"}</span>
                <span>
                  {formatMoney(deductionsModal.record.taxes ?? 0)} {currency}
                  <small>
                    {" "}
                    ({payrollConfig.defaultTaxes}%{" "}
                    {isArabic ? "من المستحق + الزيادات" : "of earned + additions"})
                  </small>
                </span>
              </div>
              <div className="hrDeductionLine">
                <span>{isArabic ? "تأمينات" : "Insurance"}</span>
                <span>
                  {formatMoney(deductionsModal.record.insurance ?? 0)} {currency}
                  <small>
                    {" "}
                    ({payrollConfig.defaultInsurance}%{" "}
                    {isArabic ? "من المستحق + الزيادات" : "of earned + additions"})
                  </small>
                </span>
              </div>
              <p className="returnsSectionHint">
                {isArabic
                  ? "تُعدّل النسب من الإعدادات ← إعدادات المرتبات."
                  : "Percentages are configured in Settings → Payroll."}
              </p>
            </div>
    
            <div className="hrDeductionsTotal cardInner">
              <strong>{isArabic ? "إجمالي الخصومات:" : "Total deductions:"}</strong>{" "}
              {formatMoney(pharmacyService.sumPayrollDeductions(deductionsModal.record))} {currency}
            </div>
    
            <div className="modalActions">
              <button type="button" className="editBtn" onClick={() => setDeductionsModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
  );
}
