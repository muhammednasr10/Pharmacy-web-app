import * as pharmacyService from "../../services/pharmacyService";
import { formatMoney } from "../../utils/formatMoney";
import { formatWorkMinutes } from "../../utils/hrFormatters";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrPayrollTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    loadPayroll,
    loading,
    handleExportPayrollPdf,
    payrollRows,
    totalNetPay,
    currency,
    canManageHrFor,
    payrollBranchId,
    editBaseSalary,
    openAdditionsModal,
    openDeductionsModal,
  } = state;

  if (activeTab !== "payroll") return null;

  return (
            <div className="settingsTabPanel hrPayrollPanel">
              <div className="hrPayrollToolbar">
                <div className="hrFilters">
                  <label>
                    {isArabic ? "من" : "From"}
                    <input
                      type="date"
                      className="tableInput"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </label>
                  <label>
                    {isArabic ? "إلى" : "To"}
                    <input
                      type="date"
                      className="tableInput"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="printBtn"
                    onClick={() => void loadPayroll()}
                    disabled={loading}
                  >
                    {isArabic ? "تحديث" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    className="editBtn"
                    disabled={payrollRows.length === 0}
                    onClick={handleExportPayrollPdf}
                  >
                    <span aria-hidden="true">⬇️</span>
                    <span>{isArabic ? "تصدير PDF" : "Export PDF"}</span>
                  </button>
                </div>
              </div>
    
              <div className="hrPayrollSummary">
                <span>
                  {isArabic ? "إجمالي الصافي:" : "Total net:"}{" "}
                  <strong>
                    {formatMoney(totalNetPay)} {currency}
                  </strong>
                </span>
              </div>
    
              <div className="tableWrap hrPayrollTableWrap">
                <table className="hrPayrollTable">
                  <thead>
                    <tr>
                      <th className="col-name">{isArabic ? "الموظف" : "Employee"}</th>
                      <th className="col-attendance">{isArabic ? "أيام الفترة" : "Period days"}</th>
                      <th className="col-attendance">{isArabic ? "ساعات العمل" : "Work hours"}</th>
                      <th className="col-attendance">{isArabic ? "حضور" : "Present"}</th>
                      <th className="col-attendance">{isArabic ? "غياب" : "Absent"}</th>
                      <th className="col-attendance">{isArabic ? "مرضي" : "Sick"}</th>
                      <th className="col-attendance">{isArabic ? "إجازات" : "Leave"}</th>
                      <th className="col-money">{isArabic ? "الأساسي" : "Base"}</th>
                      <th className="col-money">{isArabic ? "المستحق" : "Earned"}</th>
                      <th className="col-money">{isArabic ? "زيادات" : "Additions"}</th>
                      <th className="col-money">{isArabic ? "خصومات" : "Deductions"}</th>
                      <th className="col-money">{isArabic ? "الصافي" : "Net"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="empty">
                          {isArabic ? "لا يوجد موظفون" : "No employees"}
                        </td>
                      </tr>
                    ) : (
                      payrollRows.map((rec) => (
                        <tr key={rec.userId}>
                          <td className="col-name">{rec.userName}</td>
                          <td className="col-attendance">{rec.workingDays}</td>
                          <td className="col-attendance">
                            {formatWorkMinutes(rec.workMinutes ?? 0, isArabic)}
                          </td>
                          <td className="col-attendance">{rec.presentDays}</td>
                          <td className="col-attendance">{rec.absentDays}</td>
                          <td className="col-attendance">{rec.sickDays ?? 0}</td>
                          <td className="col-attendance">{rec.leaveDays ?? 0}</td>
                          <td className="col-money">
                            <button
                              type="button"
                              className="hrBaseSalaryBtn"
                              disabled={
                                !rec.id ||
                                !canManageHrFor(payrollBranchId(rec)) ||
                                rec.status !== "draft"
                              }
                              title={
                                rec.id && canManageHrFor(payrollBranchId(rec)) && rec.status === "draft"
                                  ? isArabic
                                    ? "تعديل الراتب الأساسي"
                                    : "Edit base salary"
                                  : undefined
                              }
                              onClick={() => void editBaseSalary(rec)}
                            >
                              {formatMoney(rec.baseSalary)} {currency}
                            </button>
                          </td>
                          <td className="col-money">
                            {formatMoney(rec.calculatedSalary)} {currency}
                          </td>
                          <td className="col-money">
                            <button
                              type="button"
                              className="hrAdditionsBtn"
                              disabled={!rec.id}
                              title={
                                rec.id
                                  ? isArabic
                                    ? "عرض تفاصيل الزيادات"
                                    : "View additions breakdown"
                                  : undefined
                              }
                              onClick={() => void openAdditionsModal(rec)}
                            >
                              {formatMoney(pharmacyService.sumPayrollAdditions(rec))} {currency}
                            </button>
                          </td>
                          <td className="col-money">
                            <button
                              type="button"
                              className="hrDeductionsBtn"
                              disabled={!rec.id}
                              title={
                                rec.id
                                  ? isArabic
                                    ? "عرض تفاصيل الخصومات"
                                    : "View deductions breakdown"
                                  : undefined
                              }
                              onClick={() => openDeductionsModal(rec)}
                            >
                              {formatMoney(pharmacyService.sumPayrollDeductions(rec))} {currency}
                            </button>
                          </td>
                          <td className="col-money">
                            <strong className="hrPayrollNet">
                              {formatMoney(rec.netPay)} {currency}
                            </strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
    
              <p className="returnsSectionHint hrPayrollHint">
                {isArabic
                  ? "المستحق = ساعات عادية × مرتب الساعة. الإضافي (فوق ساعات العمل اليومية) يظهر في «حوافز» ضمن الزيادات."
                  : "Earned = regular hours × hourly rate. Overtime (above daily work hours) appears in incentives under additions."}
              </p>
            </div>
  );
}
