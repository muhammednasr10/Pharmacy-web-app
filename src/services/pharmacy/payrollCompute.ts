import type { AttendanceRecord, EmployeeRequest, PayrollRecord } from "../../types";

export function applyMaxLeavePolicy(
  rawLeaveDays: number,
  rawAbsentDays: number,
  maxLeaveDays: number,
): { leaveDays: number; absentDays: number; excessLeaveDays: number } {
  const allowed = Math.max(0, Math.floor(Number(maxLeaveDays) || 0));
  const rawLeave = Math.max(0, Number(rawLeaveDays) || 0);
  const rawAbsent = Math.max(0, Number(rawAbsentDays) || 0);
  const leaveDays = Math.min(rawLeave, allowed);
  const excessLeaveDays = Math.max(0, rawLeave - allowed);
  return {
    leaveDays,
    absentDays: rawAbsent + excessLeaveDays,
    excessLeaveDays,
  };
}

export type AttendanceDeductionBreakdown = {
  dailyRate: number;
  absentDays: number;
  sickDays: number;
  leaveDays: number;
  absentAmount: number;
  sickAmount: number;
  leaveAmount: number;
  attendanceTotal: number;
};

export function computeAttendanceDeductionBreakdown(
  record: Partial<PayrollRecord>,
  rates: { absentPct: number; sickPct: number },
): AttendanceDeductionBreakdown {
  const baseSalary = Number(record.baseSalary ?? 0);
  const dailyRate = baseSalary / 30;
  const absentDays = Number(record.absentDays ?? 0);
  const sickDays = Number(record.sickDays ?? 0);
  const leaveDays = Number(record.leaveDays ?? 0);
  const absentAmount =
    Math.round(dailyRate * absentDays * (Number(rates.absentPct) / 100) * 100) / 100;
  const sickAmount = Math.round(dailyRate * sickDays * (Number(rates.sickPct) / 100) * 100) / 100;
  const leaveAmount = 0;
  const attendanceTotal = Math.round((absentAmount + sickAmount + leaveAmount) * 100) / 100;
  return {
    dailyRate,
    absentDays,
    sickDays,
    leaveDays,
    absentAmount,
    sickAmount,
    leaveAmount,
    attendanceTotal,
  };
}

export function computeTaxInsuranceFromPercent(
  record: Partial<PayrollRecord>,
  taxesPercent: number,
  insurancePercent: number,
): { taxes: number; insurance: number } {
  const gross = Number(record.calculatedSalary ?? 0) + sumPayrollAdditions(record);
  const taxPct = Math.min(100, Math.max(0, Number(taxesPercent) || 0));
  const insPct = Math.min(100, Math.max(0, Number(insurancePercent) || 0));
  return {
    taxes: Math.round(gross * (taxPct / 100) * 100) / 100,
    insurance: Math.round(gross * (insPct / 100) * 100) / 100,
  };
}

export function sumPayrollDeductions(record: Partial<PayrollRecord>): number {
  return Number(record.deductions ?? 0) + Number(record.taxes ?? 0) + Number(record.insurance ?? 0);
}

export function combineWorkDateTime(
  workDate: string,
  time: string,
  dayOffset = 0,
): string | undefined {
  if (!time) return undefined;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  const d = new Date(`${workDate}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function isOvernightTimePair(checkInTime: string, checkOutTime: string): boolean {
  const [inH, inM] = checkInTime.split(":").map(Number);
  const [outH, outM] = checkOutTime.split(":").map(Number);
  if (!Number.isFinite(inH) || !Number.isFinite(outH)) return false;
  const inMinutes = inH * 60 + (Number.isFinite(inM) ? inM : 0);
  const outMinutes = outH * 60 + (Number.isFinite(outM) ? outM : 0);
  return outMinutes <= inMinutes;
}

export function buildAttendanceCheckInIso(
  workDate: string,
  checkInTime: string,
): string | undefined {
  return combineWorkDateTime(workDate, checkInTime, 0);
}

export function buildAttendanceCheckOutIso(
  workDate: string,
  checkInTime: string,
  checkOutTime: string,
): string | undefined {
  if (!checkOutTime) return undefined;
  const dayOffset = checkInTime && isOvernightTimePair(checkInTime, checkOutTime) ? 1 : 0;
  return combineWorkDateTime(workDate, checkOutTime, dayOffset);
}

export function calcAttendanceWorkedMinutes(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  let end = new Date(checkOut);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 86400000);
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function calcAttendanceWorkedHours(checkIn?: string, checkOut?: string): number | null {
  const minutes = calcAttendanceWorkedMinutes(checkIn, checkOut);
  return minutes === null ? null : minutes / 60;
}

export function computeHourlyRate(baseSalary: number, requiredWorkHoursPerDay = 8): number {
  const dailyHours = Math.max(1, Number(requiredWorkHoursPerDay) || 8);
  return Number(baseSalary) / 30 / dailyHours;
}

export function splitRegularAndOvertimeMinutes(
  records: Array<{ checkIn?: string; checkOut?: string }>,
  standardWorkHoursPerDay: number,
): { regularMinutes: number; overtimeMinutes: number; totalMinutes: number } {
  const standardMinutes = Math.max(0, Number(standardWorkHoursPerDay) || 0) * 60;
  let regularMinutes = 0;
  let overtimeMinutes = 0;

  for (const rec of records) {
    const dayMinutes = calcAttendanceWorkedMinutes(rec.checkIn, rec.checkOut) ?? 0;
    if (standardMinutes <= 0) {
      regularMinutes += dayMinutes;
      continue;
    }
    regularMinutes += Math.min(dayMinutes, standardMinutes);
    overtimeMinutes += Math.max(0, dayMinutes - standardMinutes);
  }

  return {
    regularMinutes,
    overtimeMinutes,
    totalMinutes: regularMinutes + overtimeMinutes,
  };
}

export function computePayrollEarnedFromAttendance(
  baseSalary: number,
  records: Array<{ checkIn?: string; checkOut?: string }>,
  requiredWorkHoursPerDay: number,
  standardWorkHoursPerDay: number,
  overtimePercent: number,
): { calculatedSalary: number; overtimePay: number; workMinutes: number } {
  const { regularMinutes, overtimeMinutes, totalMinutes } = splitRegularAndOvertimeMinutes(
    records,
    standardWorkHoursPerDay,
  );
  const hourlyRate = computeHourlyRate(baseSalary, requiredWorkHoursPerDay);
  const calculatedSalary = Math.round(hourlyRate * (regularMinutes / 60) * 100) / 100;
  const overtimePay =
    overtimeMinutes > 0
      ? Math.round(hourlyRate * (overtimePercent / 100) * (overtimeMinutes / 60) * 100) / 100
      : 0;

  return { calculatedSalary, overtimePay, workMinutes: totalMinutes };
}

export function computeEmployeeOvertimeIncentives(
  baseSalary: number,
  records: Array<{ checkIn?: string; checkOut?: string }>,
  requiredWorkHoursPerDay: number,
  overtimePercent: number,
) {
  const dailyHours = Math.max(1, Number(requiredWorkHoursPerDay) || 8);
  const split = splitRegularAndOvertimeMinutes(records, dailyHours);
  const earned = computePayrollEarnedFromAttendance(
    baseSalary,
    records,
    dailyHours,
    dailyHours,
    overtimePercent,
  );
  const hourlyRate = computeHourlyRate(baseSalary, dailyHours);
  return {
    regularMinutes: split.regularMinutes,
    overtimeMinutes: split.overtimeMinutes,
    totalMinutes: split.totalMinutes,
    overtimePay: earned.overtimePay,
    hourlyRate,
    overtimePercent,
  };
}

export function computeEarnedSalary(
  baseSalary: number,
  workMinutes: number,
  requiredWorkHoursPerDay = 8,
): number {
  const hourlyRate = computeHourlyRate(baseSalary, requiredWorkHoursPerDay);
  const workHours = Math.max(0, Number(workMinutes) || 0) / 60;
  return Math.round(hourlyRate * workHours * 100) / 100;
}

export function sumPayrollAdditions(record: Partial<PayrollRecord>): number {
  return (
    Number(record.specialAllowances ?? 0) +
    Number(record.bonuses ?? 0) +
    Number(record.incentives ?? 0) +
    Number(record.commission ?? 0)
  );
}

export function filterAttendanceForEmployee(
  attendance: AttendanceRecord[],
  userId: string,
  employeeId?: string,
) {
  return attendance.filter(
    (row) => row.userId === userId || (employeeId ? row.userId === employeeId : false),
  );
}

export function computePayrollNet(record: Partial<PayrollRecord>): number {
  const calculatedSalary = Number(record.calculatedSalary ?? 0);
  const additions = sumPayrollAdditions(record);
  const deductions = Number(record.deductions ?? 0);
  const taxes = Number(record.taxes ?? 0);
  const insurance = Number(record.insurance ?? 0);
  return Math.round((calculatedSalary + additions - deductions - taxes - insurance) * 100) / 100;
}

export function listDaysBetween(start: string, end: string): string[] {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(s);
  while (cursor.getTime() <= e.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function hasApprovedPermissionForDate(
  requests: EmployeeRequest[],
  userId: string,
  employeeId: string,
  workDate: string,
): boolean {
  return requests.some(
    (req) =>
      req.status === "approved" &&
      req.requestType === "permission" &&
      req.workDate === workDate &&
      (req.userId === userId || req.employeeId === employeeId),
  );
}
