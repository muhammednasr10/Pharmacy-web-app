import type { Employee } from "../../types";
import {
  getShiftDisplayNameWithHours,
  type PharmacyShift,
  type ShiftId,
} from "../../utils/workSchedule";
import { EMPLOYEE_MILITARY_STATUS_OPTIONS } from "./types";

type ShiftEmployee = Pick<
  Employee,
  "useCustomWorkSchedule" | "workDayStart" | "workDayEnd" | "assignedShiftId"
>;

export function formatEmployeeShiftLabel(
  emp: ShiftEmployee,
  pharmacyShifts: PharmacyShift[],
  pharmacyDefaultShiftId: ShiftId,
  isArabic: boolean,
): string {
  if (emp.useCustomWorkSchedule) {
    const start = emp.workDayStart || "—";
    const end = emp.workDayEnd || "—";
    return isArabic ? `مخصص (${start} - ${end})` : `Custom (${start} - ${end})`;
  }
  return getShiftDisplayNameWithHours(
    (emp.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
    pharmacyShifts,
    isArabic,
  );
}

export function militaryStatusLabel(value: string | undefined, isArabic: boolean): string {
  if (!value) return "—";
  const match = EMPLOYEE_MILITARY_STATUS_OPTIONS.find((option) => option.value === value);
  if (!match || !match.value) return value;
  return isArabic ? match.ar : match.en;
}
