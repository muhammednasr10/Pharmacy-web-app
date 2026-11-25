import type { Employee } from "../../types";
import { getEmployeeJobRoleLabel } from "../../utils/roles";
import type { PharmacyShift, ShiftId } from "../../utils/workSchedule";
import { formatEmployeeShiftLabel, militaryStatusLabel } from "./employeeDisplay";
import { formatDate } from "./helpers";

export type EmployeeProfileRow = { label: string; value: string };

export function buildStaffEmployeeProfileRows(
  emp: Employee,
  input: {
    isArabic: boolean;
    branchLabel: (pharmacyId: string) => string;
    pharmacyShifts: PharmacyShift[];
    pharmacyDefaultShiftId: ShiftId;
  },
): EmployeeProfileRow[] {
  const { isArabic, branchLabel, pharmacyShifts, pharmacyDefaultShiftId } = input;
  return [
    { label: isArabic ? "كود الموظف" : "Employee code", value: emp.employeeCode || "—" },
    { label: isArabic ? "الفرع" : "Branch", value: branchLabel(emp.pharmacyId) },
    {
      label: isArabic ? "الدور" : "Role",
      value: emp.jobTitle ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic) : "—",
    },
    { label: isArabic ? "الهاتف" : "Phone", value: emp.phone || "—" },
    { label: isArabic ? "العنوان" : "Address", value: emp.address || "—" },
    {
      label: isArabic ? "تاريخ الميلاد" : "Date of birth",
      value: emp.birthDate ? formatDate(emp.birthDate, isArabic) : "—",
    },
    { label: isArabic ? "محل الميلاد" : "Place of birth", value: emp.birthPlace || "—" },
    {
      label: isArabic ? "حالة الجيش" : "Military status",
      value: militaryStatusLabel(emp.militaryStatus, isArabic),
    },
    {
      label: isArabic ? "الشيفت" : "Shift",
      value: formatEmployeeShiftLabel(emp, pharmacyShifts, pharmacyDefaultShiftId, isArabic),
    },
    {
      label: isArabic ? "تاريخ التعيين" : "Hire date",
      value: emp.hireDate ? formatDate(emp.hireDate, isArabic) : "—",
    },
    {
      label: isArabic ? "الحالة" : "Status",
      value: emp.isActive
        ? isArabic
          ? "نشط"
          : "Active"
        : isArabic
          ? "موقوف"
          : "Inactive",
    },
    { label: isArabic ? "ملاحظات" : "Notes", value: emp.notes || "—" },
  ];
}
