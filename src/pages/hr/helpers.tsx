import { formatMoney } from "../../utils/formatMoney";
import type { EmployeeRequest, PayrollRecord } from "../../types";
import type { HrStaffRow, HrTab } from "./types";

export const HR_TABS: { id: HrTab; ar: string; en: string }[] = [
  { id: "attendance", ar: "الحضور والانصراف", en: "Attendance" },
  { id: "requests", ar: "طلبات الموظفين", en: "Employee requests" },
  { id: "payroll", ar: "حساب المرتبات", en: "Payroll" },
];

export function mapAttendanceScanError(code: string, isArabic: boolean) {
  if (code === "employee_not_found") {
    return isArabic ? "لم يُعثر على موظف بهذا الكود" : "No employee found for this code";
  }
  if (code === "forbidden_branch") {
    return isArabic
      ? "لا يمكنك تسجيل حضور هذا الفرع"
      : "You cannot record attendance for this branch";
  }
  if (code === "already_checked_in") {
    return isArabic ? "تم تسجيل الحضور مسبقاً" : "Already checked in";
  }
  if (code === "check_in_required") {
    return isArabic ? "سجّل الحضور أولاً" : "Check in first";
  }
  if (code === "already_checked_out") {
    return isArabic ? "تم تسجيل الانصراف مسبقاً" : "Already checked out";
  }
  if (code === "attendance_complete") {
    return isArabic ? "اكتمل حضور وانصراف اليوم" : "Today's attendance is already complete";
  }
  return isArabic ? "تعذر تسجيل الحضور" : "Could not record attendance";
}

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
