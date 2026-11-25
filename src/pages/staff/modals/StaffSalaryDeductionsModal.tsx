import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { renderAttendanceDeductionLine } from "../../hr/helpers";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffSalaryDeductionsModal({ state }: Props) {
  const {
    isArabic,
    currency,
    salaryDeductionsModal,
    setSalaryDeductionsModal,
    payrollConfig,
  } = state;

  if (!salaryDeductionsModal || !payrollConfig) return null;

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
                ? `خصومات — ${salaryDeductionsModal.record.userName}`
                : `Deductions — ${salaryDeductionsModal.record.userName}`}
            </h3>
            <p className="returnsSectionHint">
              {isArabic ? "اليومية = الراتب الأساسي ÷ 30" : "Daily rate = base salary ÷ 30"} (
              {formatMoney(salaryDeductionsModal.breakdown.dailyRate)} {currency})
            </p>
          </div>
          <button
            type="button"
            className="deleteSmallBtn"
            onClick={() => setSalaryDeductionsModal(null)}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="hrDeductionsSection cardInner">
          <h4>{isArabic ? "خصومات الحضور" : "Attendance deductions"}</h4>
          {renderAttendanceDeductionLine(
            "غياب",
            "Absence",
            salaryDeductionsModal.breakdown.absentDays,
            salaryDeductionsModal.breakdown.absentAmount,
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
            salaryDeductionsModal.breakdown.sickDays,
            salaryDeductionsModal.breakdown.sickAmount,
            payrollConfig.sickDeductionPercent,
            isArabic,
            currency,
          )}
          <div className="hrDeductionLine">
            <span>
              {isArabic ? "إجازات (ضمن الحد):" : "Leave (within limit):"}{" "}
              <strong>{salaryDeductionsModal.breakdown.leaveDays}</strong>{" "}
              {isArabic
                ? salaryDeductionsModal.breakdown.leaveDays === 1
                  ? "يوم"
                  : "أيام"
                : salaryDeductionsModal.breakdown.leaveDays === 1
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
            {formatMoney(salaryDeductionsModal.breakdown.attendanceTotal)} {currency}
          </div>
        </div>

        <div className="hrDeductionsSection cardInner">
          <h4>{isArabic ? "ضرائب وتأمينات" : "Taxes & insurance"}</h4>
          <div className="hrDeductionLine">
            <span>{isArabic ? "ضرائب" : "Taxes"}</span>
            <span>
              {formatMoney(salaryDeductionsModal.record.taxes ?? 0)} {currency}
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
              {formatMoney(salaryDeductionsModal.record.insurance ?? 0)} {currency}
              <small>
                {" "}
                ({payrollConfig.defaultInsurance}%{" "}
                {isArabic ? "من المستحق + الزيادات" : "of earned + additions"})
              </small>
            </span>
          </div>
          <p className="returnsSectionHint">
            {isArabic
              ? "تُعدّل النسب من الإعدادات ← إعدادات الموظفين."
              : "Percentages are configured in Settings → Employee Settings."}
          </p>
        </div>

        <div className="hrDeductionsTotal cardInner">
          <strong>{isArabic ? "إجمالي الخصومات:" : "Total deductions:"}</strong>{" "}
          {formatMoney(pharmacyService.sumPayrollDeductions(salaryDeductionsModal.record))}{" "}
          {currency}
        </div>

        <div className="modalActions">
          <button type="button" className="editBtn" onClick={() => setSalaryDeductionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
