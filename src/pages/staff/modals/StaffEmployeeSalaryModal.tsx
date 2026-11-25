import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { formatWorkMinutes } from "../../../utils/hrFormatters";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";
import StaffSalaryAdditionsModal from "./StaffSalaryAdditionsModal";
import StaffSalaryDeductionsModal from "./StaffSalaryDeductionsModal";

type Props = { state: EmployeesUsersPageState };

export default function StaffEmployeeSalaryModal({ state }: Props) {
  const {
    isArabic,
    currency,
    salaryModalEmployee,
    salaryModalRecord,
    salaryModalLoading,
    salaryModalError,
    salaryPeriodStart,
    setSalaryPeriodStart,
    salaryPeriodEnd,
    setSalaryPeriodEnd,
    salaryBusyAction,
    canEditSalaryRecord,
    closeEmployeeSalaryModal,
    refreshEmployeeSalaryModal,
    editSalaryBaseSalary,
    openSalaryAdditionsModal,
    openSalaryDeductionsModal,
  } = state;

  if (!salaryModalEmployee) return null;

  const record = salaryModalRecord;
  const canEdit = canEditSalaryRecord(record);

  return (
    <>
      <div className="modalOverlay" onClick={closeEmployeeSalaryModal}>
        <div
          className="invoiceModal userModal staffEmployeeSalaryModal"
          onClick={(e) => e.stopPropagation()}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="modalHeader">
            <div>
              <h2>{isArabic ? "بيانات المرتب" : "Salary details"}</h2>
              <p className="returnsSectionHint" style={{ margin: "0.25rem 0 0" }}>
                {salaryModalEmployee.name}
                {salaryModalEmployee.employeeCode
                  ? ` · ${salaryModalEmployee.employeeCode}`
                  : ""}
              </p>
            </div>
            <button type="button" className="deleteSmallBtn" onClick={closeEmployeeSalaryModal}>
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>

          <div className="hrFilters staffSalaryPeriodFilters">
            <label>
              {isArabic ? "من" : "From"}
              <input
                type="date"
                className="tableInput"
                value={salaryPeriodStart}
                onChange={(e) => setSalaryPeriodStart(e.target.value)}
              />
            </label>
            <label>
              {isArabic ? "إلى" : "To"}
              <input
                type="date"
                className="tableInput"
                value={salaryPeriodEnd}
                onChange={(e) => setSalaryPeriodEnd(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="printBtn"
              onClick={refreshEmployeeSalaryModal}
              disabled={salaryModalLoading}
            >
              {isArabic ? "تحديث" : "Refresh"}
            </button>
          </div>

          {salaryModalLoading ? (
            <p className="hintText staffSalaryCenteredText">
              {isArabic ? "جاري تحميل المرتب..." : "Loading salary..."}
            </p>
          ) : salaryModalError ? (
            <p className="errorText staffSalaryCenteredText">{salaryModalError}</p>
          ) : record ? (
            <div className="staffSalaryCard">
              <div className="staffSalaryCardGrid">
                <div className="staffSalaryStat">
                  <span>{isArabic ? "أيام الفترة" : "Period days"}</span>
                  <strong>{record.workingDays}</strong>
                </div>
                <div className="staffSalaryStat">
                  <span>{isArabic ? "ساعات العمل" : "Work hours"}</span>
                  <strong>{formatWorkMinutes(record.workMinutes ?? 0, isArabic)}</strong>
                </div>
                <div className="staffSalaryStat">
                  <span>{isArabic ? "حضور" : "Present"}</span>
                  <strong>{record.presentDays}</strong>
                </div>
                <div className="staffSalaryStat">
                  <span>{isArabic ? "غياب" : "Absent"}</span>
                  <strong>{record.absentDays}</strong>
                </div>
                <div className="staffSalaryStat">
                  <span>{isArabic ? "مرضي" : "Sick"}</span>
                  <strong>{record.sickDays ?? 0}</strong>
                </div>
                <div className="staffSalaryStat">
                  <span>{isArabic ? "إجازات" : "Leave"}</span>
                  <strong>{record.leaveDays ?? 0}</strong>
                </div>
              </div>

              <div className="staffSalaryMoneyGrid">
                <div className="staffSalaryMoneyRow">
                  <span>{isArabic ? "الأساسي" : "Base"}</span>
                  <button
                    type="button"
                    className="hrBaseSalaryBtn"
                    disabled={!canEdit || !!salaryBusyAction}
                    title={
                      canEdit
                        ? isArabic
                          ? "تعديل الراتب الأساسي"
                          : "Edit base salary"
                        : undefined
                    }
                    onClick={() => void editSalaryBaseSalary(record)}
                  >
                    {formatMoney(record.baseSalary)} {currency}
                  </button>
                </div>
                <div className="staffSalaryMoneyRow">
                  <span>{isArabic ? "المستحق" : "Earned"}</span>
                  <strong>
                    {formatMoney(record.calculatedSalary)} {currency}
                  </strong>
                </div>
                <div className="staffSalaryMoneyRow">
                  <span>{isArabic ? "زيادات" : "Additions"}</span>
                  <button
                    type="button"
                    className="hrAdditionsBtn"
                    disabled={!record.id || !!salaryBusyAction}
                    title={
                      record.id
                        ? isArabic
                          ? "عرض تفاصيل الزيادات"
                          : "View additions breakdown"
                        : undefined
                    }
                    onClick={() => void openSalaryAdditionsModal(record)}
                  >
                    {formatMoney(pharmacyService.sumPayrollAdditions(record))} {currency}
                  </button>
                </div>
                <div className="staffSalaryMoneyRow">
                  <span>{isArabic ? "خصومات" : "Deductions"}</span>
                  <button
                    type="button"
                    className="hrDeductionsBtn"
                    disabled={!record.id || !!salaryBusyAction}
                    title={
                      record.id
                        ? isArabic
                          ? "عرض تفاصيل الخصومات"
                          : "View deductions breakdown"
                        : undefined
                    }
                    onClick={() => openSalaryDeductionsModal(record)}
                  >
                    {formatMoney(pharmacyService.sumPayrollDeductions(record))} {currency}
                  </button>
                </div>
                <div className="staffSalaryMoneyRow staffSalaryMoneyRow--net">
                  <span>{isArabic ? "الصافي" : "Net"}</span>
                  <strong className="hrPayrollNet">
                    {formatMoney(record.netPay)} {currency}
                  </strong>
                </div>
              </div>

              <p className="returnsSectionHint hrPayrollHint staffSalaryCenteredText">
                {isArabic
                  ? "الحساب يعتمد على الحضور والراتب الأساسي وإعدادات المرتبات للفترة المحددة."
                  : "Calculated from attendance, base salary, and payroll settings for the selected period."}
              </p>
            </div>
          ) : (
            <p className="empty staffSalaryCenteredText">
              {isArabic ? "لا توجد بيانات" : "No data"}
            </p>
          )}
        </div>
      </div>

      <StaffSalaryAdditionsModal state={state} />
      <StaffSalaryDeductionsModal state={state} />
    </>
  );
}
