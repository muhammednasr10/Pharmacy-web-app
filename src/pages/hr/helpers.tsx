import { formatMoney } from "../../utils/formatMoney";
import type { EmployeeRequest, PayrollRecord } from "../../types";
import type { HrStaffRow, HrTab } from "./types";

export const HR_TABS: { id: HrTab; ar: string; en: string }[] = [
  { id: "attendance", ar: "الحضور والانصراف", en: "Attendance" },
  { id: "requests", ar: "طلبات الموظفين", en: "Employee requests" },
  { id: "payroll", ar: "حساب المرتبات", en: "Payroll" },
];

export function requestTypeLabel(type: string, isArabic: boolean) {
  if (type === "leave") return isArabic ? "إجازة" : "Leave";
  if (type === "permission") return isArabic ? "إذن انصراف" : "Permission";
  return type;
}

export function requestStatusLabel(status: string, isArabic: boolean) {
  if (status === "pending") return isArabic ? "قيد المراجعة" : "Pending";
  if (status === "approved") return isArabic ? "موافق" : "Approved";
  if (status === "rejected") return isArabic ? "مرفوض" : "Rejected";
  return status;
}

export function requestBranchLabel(
  req: EmployeeRequest,
  staffRows: HrStaffRow[],
  resolveBranchLabel?: (branchId: string) => string,
): string {
  const branchId =
    req.pharmacyId || staffRows.find((row) => row.employeeId === req.employeeId)?.pharmacyId;
  if (!branchId) return "—";
  return resolveBranchLabel ? resolveBranchLabel(branchId) : branchId;
}

export function payrollBranchId(
  rec: PayrollRecord,
  staffBranchByKey: Map<string, string>,
): string {
  return rec.pharmacyId || staffBranchByKey.get(rec.userId) || "";
}

export function renderAttendanceDeductionLine(
  labelAr: string,
  labelEn: string,
  days: number,
  amount: number,
  percent: number,
  isArabic: boolean,
  currency: string,
) {
  const dayWord = isArabic ? (days === 1 ? "يوم" : "أيام") : days === 1 ? "day" : "days";
  return (
    <div className="hrDeductionLine">
      <span>
        {isArabic ? labelAr : labelEn}: <strong>{days}</strong> {dayWord}
      </span>
      <span>
        = {formatMoney(amount)} {currency}
        <small>
          {" "}
          ({isArabic ? "خصم" : "deduct"} {percent}%)
        </small>
      </span>
    </div>
  );
}
