import type { Employee } from "../../../../types";
import {
  computeWorkHoursFromSchedule,
  parseWorkBreaks,
  resolveWorkSchedule,
  type PharmacyShift,
  type ShiftId,
  type WorkSchedule,
} from "../../../../utils/workSchedule";
import { emptyEmployeeForm } from "../../types";

export type EmployeeFormState = typeof emptyEmployeeForm;

export function createEmployeeFormForAdd(input: {
  pharmacyId: string;
  pharmacyShifts: PharmacyShift[];
  pharmacyDefaultShiftId: ShiftId;
}): EmployeeFormState {
  const defaultShift =
    input.pharmacyShifts.find((item) => item.id === input.pharmacyDefaultShiftId) ||
    input.pharmacyShifts[0];
  return {
    ...emptyEmployeeForm,
    pharmacyId: input.pharmacyId,
    hireDate: new Date().toISOString().slice(0, 10),
    assignedShiftId: input.pharmacyDefaultShiftId,
    workDayStart: defaultShift.dayStart,
    workDayEnd: defaultShift.dayEnd,
    workBreaks: defaultShift.breaks.map((item) => ({ ...item })),
  };
}

export function employeeRecordToForm(
  employee: Employee,
  pharmacyShifts: PharmacyShift[],
  pharmacyDefaultShiftId: ShiftId,
): EmployeeFormState {
  return {
    pharmacyId: employee.pharmacyId,
    employeeCode: employee.employeeCode || "",
    photoBase64: employee.photoBase64 || "",
    name: employee.name,
    phone: employee.phone || "",
    address: employee.address || "",
    militaryStatus: employee.militaryStatus || "",
    birthDate: employee.birthDate || "",
    birthPlace: employee.birthPlace || "",
    salary: employee.salary,
    commissionRate: employee.commissionRate,
    requiredWorkHours: employee.requiredWorkHours ?? 8,
    assignedShiftId: (employee.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
    useCustomWorkSchedule: Boolean(employee.useCustomWorkSchedule),
    workDayStart: employee.workDayStart || pharmacyShifts[0].dayStart,
    workDayEnd: employee.workDayEnd || pharmacyShifts[0].dayEnd,
    workBreaks: parseWorkBreaks(employee.workBreaks),
    hireDate: employee.hireDate || "",
    notes: employee.notes || "",
    isActive: employee.isActive,
  };
}

export function applyWorkScheduleToForm(
  prev: EmployeeFormState,
  schedule: WorkSchedule,
): EmployeeFormState {
  return {
    ...prev,
    workDayStart: schedule.dayStart,
    workDayEnd: schedule.dayEnd,
    workBreaks: schedule.breaks,
    requiredWorkHours: computeWorkHoursFromSchedule(schedule),
  };
}

export function buildEmployeeSavePayload(
  employeeForm: EmployeeFormState,
  input: {
    targetPharmacyId: string;
    pharmacyShifts: PharmacyShift[];
    pharmacyDefaultShiftId: ShiftId;
  },
) {
  const customSchedule = employeeForm.useCustomWorkSchedule
    ? {
        dayStart: employeeForm.workDayStart,
        dayEnd: employeeForm.workDayEnd,
        breaks: employeeForm.workBreaks,
      }
    : resolveWorkSchedule(
        {
          assignedShiftId: employeeForm.assignedShiftId,
          useCustomWorkSchedule: false,
        },
        input.pharmacyShifts,
        input.pharmacyDefaultShiftId,
      );
  const requiredWorkHours = computeWorkHoursFromSchedule(customSchedule);

  return {
    pharmacyId: input.targetPharmacyId,
    employeeCode: employeeForm.employeeCode.trim() || undefined,
    photoBase64: employeeForm.photoBase64 || undefined,
    name: employeeForm.name.trim(),
    phone: employeeForm.phone.trim() || undefined,
    address: employeeForm.address.trim() || undefined,
    militaryStatus: employeeForm.militaryStatus.trim() || undefined,
    birthDate: employeeForm.birthDate || undefined,
    birthPlace: employeeForm.birthPlace.trim() || undefined,
    salary: Number(employeeForm.salary) || 0,
    commissionRate: Number(employeeForm.commissionRate) || 0,
    requiredWorkHours,
    assignedShiftId: employeeForm.assignedShiftId,
    useCustomWorkSchedule: employeeForm.useCustomWorkSchedule,
    workDayStart: employeeForm.useCustomWorkSchedule
      ? employeeForm.workDayStart
      : (null as unknown as undefined),
    workDayEnd: employeeForm.useCustomWorkSchedule
      ? employeeForm.workDayEnd
      : (null as unknown as undefined),
    workBreaks: employeeForm.useCustomWorkSchedule
      ? employeeForm.workBreaks
      : (null as unknown as undefined),
    hireDate: employeeForm.hireDate || undefined,
    notes: employeeForm.notes.trim() || undefined,
    isActive: employeeForm.isActive,
  };
}
