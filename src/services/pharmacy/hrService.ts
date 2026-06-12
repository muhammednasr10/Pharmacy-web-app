import { createEphemeralSupabase, supabase } from "../supabaseClient";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isPharmacyManager,
  isSuperAdmin,
  normalizeAppUser,
  normalizeRole,
} from "../../utils/roles";
import { ALL_BRANCHES_ID } from "../../constants/branches";
import { notifySuperAdminOfSubscriptionRequest } from "../../utils/superAdminNotify";
import { isActiveSubscriptionStatus, TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../../config/subscriptionTiers";
import type {
  ActivityLog,
  AppUser,
  SubscriptionRequest,
  SubscriptionRequestStatus,
  LoginAccountRequest,
  PharmacyLoginAccount,
  CartItem,
  CreatePharmacyInput,
  CreatePharmacyUserInput,
  CustomerPayment,
  HeldInvoice,
  InstantSaleReturnInput,
  Invoice,
  InvoiceItem,
  Medicine,
  PharmacySettings,
  PharmacyCost,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  BranchStockTransfer,
  SystemUser,
  UserRole,
  EmployeeProfile,
  AttendanceRecord,
  AttendanceStatus,
  PayrollRecord,
  Employee,
  WorkBreak,
  ShiftId,
  PharmacyShift,
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
  CashierShift,
  CashierShiftSummary,
} from "../../types";
import {
  WORK_SCHEDULE_DEFAULTS,
  DEFAULT_PHARMACY_SHIFTS,
  DEFAULT_ALLOWED_LATE_MINUTES,
  clonePharmacyShifts,
  computeWorkHoursFromSchedule,
  inferShiftIdFromTime,
  isCheckInLate,
  normalizeTimeValue,
  parsePharmacyShifts,
  parseWorkBreaks,
  resolveWorkSchedule,
  type WorkSchedule,
} from "../../utils/workSchedule";
import { extractCopyableBranchSettings } from "../../utils/copyBranchSettings";
import {
  computeCashierCommissionFromInvoices,
  currentMonthPeriodBounds,
} from "../../utils/cashierCommission";

import { toCamelCase, toSnakeCase } from "./mappers";
import {
  setActivePharmacy,
  getActivePharmacy,
  setOrganizationBranchIds,
  getOrganizationBranchIds,
  setCurrentAppUser,
  getCurrentAppUser,
  applyPharmacyFilter,
  applyPharmacyScopeFilter,
  stampPharmacy,
  resolveStampPharmacyId,
  resolveHeldInvoicesPharmacyId,
  prepareMedicinePayload,
  prepareMedicinePayloadForPharmacy,
  shouldQueryAllOrganizationBranches,
} from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";
import { getRows, subscribeTable } from "./dbHelpers";

import {
  getPharmacySettings,
  updatePharmacySettings,
  getSystemUsers,
  getPharmacyLoginAccountRequests,
  getPharmacyLoginAccounts,
} from "./authService";
import { getInvoicesForPeriod } from "./salesService";

export const PAYROLL_DEFAULTS = {
  payDay: 30,
  sickDeductionPercent: 25,
  absentDeductionPercent: 100,
  maxLeaveDays: 2,
  standardWorkHours: 8,
  overtimePercent: 150,
  defaultTaxes: 0,
  defaultInsurance: 0,
  workDayStart: WORK_SCHEDULE_DEFAULTS.dayStart,
  workDayEnd: WORK_SCHEDULE_DEFAULTS.dayEnd,
  workBreaks: [] as WorkBreak[],
  workShifts: clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS),
  defaultShiftId: "A" as ShiftId,
} as const;

export type PayrollSettingsValues = {
  payDay: number;
  sickDeductionPercent: number;
  absentDeductionPercent: number;
  maxLeaveDays: number;
  standardWorkHours: number;
  overtimePercent: number;
  defaultTaxes: number;
  defaultInsurance: number;
  workDayStart: string;
  workDayEnd: string;
  workBreaks: WorkBreak[];
  workShifts: PharmacyShift[];
  defaultShiftId: ShiftId;
};

export function resolvePharmacyWorkSchedule(
  settings: Partial<PharmacySettings> | null | undefined,
): WorkSchedule {
  const shifts = resolvePharmacyShifts(settings);
  const shiftA = shifts.find((item) => item.id === "A") || shifts[0];
  return {
    dayStart: shiftA.dayStart,
    dayEnd: shiftA.dayEnd,
    breaks: shiftA.breaks.map((item) => ({ ...item })),
  };
}

export function resolvePharmacyShifts(
  settings: Partial<PharmacySettings> | null | undefined,
): PharmacyShift[] {
  const legacy = {
    dayStart: normalizeTimeValue(settings?.payrollWorkDayStart, WORK_SCHEDULE_DEFAULTS.dayStart),
    dayEnd: normalizeTimeValue(settings?.payrollWorkDayEnd, WORK_SCHEDULE_DEFAULTS.dayEnd),
    breaks: parseWorkBreaks(settings?.payrollWorkBreaks),
  };
  const hasStoredShifts = Array.isArray(settings?.workShifts) && settings!.workShifts!.length >= 3;
  const parsed = parsePharmacyShifts(
    hasStoredShifts ? settings?.workShifts : settings?.workShifts,
    legacy,
  );
  return clonePharmacyShifts(parsed);
}

export async function resolveWorkShiftForUser(
  appUser: AppUser | null | undefined,
): Promise<{ shiftId: ShiftId; schedule: WorkSchedule; shifts: PharmacyShift[] } | null> {
  if (!appUser?.pharmacyId) return null;

  const [settings, employees] = await Promise.all([
    loadPayrollSettings(appUser.pharmacyId),
    getEmployees(),
  ]);

  const employee =
    employees.find((item) => item.id === appUser.employeeId) ||
    (await resolveLinkedEmployeeForAppUser(appUser));

  if (employee) {
    const resolved = resolveWorkSchedule(employee, settings.workShifts, settings.defaultShiftId);
    return {
      shiftId: resolved.shiftId,
      schedule: {
        dayStart: resolved.dayStart,
        dayEnd: resolved.dayEnd,
        breaks: resolved.breaks,
      },
      shifts: settings.workShifts,
    };
  }

  const inferredId = inferShiftIdFromTime(new Date(), settings.workShifts);
  const inferredShift =
    settings.workShifts.find((item) => item.id === inferredId) || settings.workShifts[0];

  return {
    shiftId: inferredId,
    schedule: {
      dayStart: inferredShift.dayStart,
      dayEnd: inferredShift.dayEnd,
      breaks: inferredShift.breaks.map((item) => ({ ...item })),
    },
    shifts: settings.workShifts,
  };
}

export { resolveWorkSchedule, computeWorkHoursFromSchedule, isCheckInLate };

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

function isLegacyPayrollDefaults(settings: Partial<PharmacySettings>) {
  return settings.payrollPayDay === 1 && Number(settings.payrollSickDeductionPercent ?? 0) === 0;
}

export function resolvePayrollSettings(
  settings: Partial<PharmacySettings> | null | undefined,
): PayrollSettingsValues {
  const payDay = settings?.payrollPayDay;
  const sick = settings?.payrollSickDeductionPercent;
  const absent = settings?.payrollAbsentDeductionPercent;
  const maxLeave = settings?.payrollMaxLeaveDays;
  const standardHours = settings?.payrollStandardWorkHours;
  const overtime = settings?.payrollOvertimePercent;
  const taxes = settings?.payrollDefaultTaxes;
  const insurance = settings?.payrollDefaultInsurance;
  const workSchedule = resolvePharmacyWorkSchedule(settings);
  const workShifts = resolvePharmacyShifts(settings);
  const defaultShiftId = (settings?.defaultShiftId as ShiftId) || PAYROLL_DEFAULTS.defaultShiftId;

  if (
    payDay == null &&
    sick == null &&
    absent == null &&
    maxLeave == null &&
    standardHours == null &&
    overtime == null &&
    taxes == null &&
    insurance == null &&
    settings?.payrollWorkDayStart == null &&
    settings?.payrollWorkDayEnd == null &&
    settings?.payrollWorkBreaks == null &&
    settings?.workShifts == null
  ) {
    return {
      ...PAYROLL_DEFAULTS,
      workBreaks: [...PAYROLL_DEFAULTS.workBreaks],
      workShifts: clonePharmacyShifts(PAYROLL_DEFAULTS.workShifts),
    };
  }

  if (isLegacyPayrollDefaults(settings || {})) {
    return {
      ...PAYROLL_DEFAULTS,
      workBreaks: [...PAYROLL_DEFAULTS.workBreaks],
      workShifts: clonePharmacyShifts(PAYROLL_DEFAULTS.workShifts),
    };
  }

  return {
    payDay: Math.min(31, Math.max(1, Number(payDay ?? PAYROLL_DEFAULTS.payDay))),
    sickDeductionPercent: Math.min(
      100,
      Math.max(0, Number(sick ?? PAYROLL_DEFAULTS.sickDeductionPercent)),
    ),
    absentDeductionPercent: Math.min(
      100,
      Math.max(0, Number(absent ?? PAYROLL_DEFAULTS.absentDeductionPercent)),
    ),
    maxLeaveDays: Math.max(0, Math.floor(Number(maxLeave ?? PAYROLL_DEFAULTS.maxLeaveDays))),
    standardWorkHours: Math.max(0, Number(standardHours ?? PAYROLL_DEFAULTS.standardWorkHours)),
    overtimePercent: Math.max(0, Number(overtime ?? PAYROLL_DEFAULTS.overtimePercent)),
    defaultTaxes: Math.min(100, Math.max(0, Number(taxes ?? PAYROLL_DEFAULTS.defaultTaxes))),
    defaultInsurance: Math.min(
      100,
      Math.max(0, Number(insurance ?? PAYROLL_DEFAULTS.defaultInsurance)),
    ),
    workDayStart: workSchedule.dayStart,
    workDayEnd: workSchedule.dayEnd,
    workBreaks: workSchedule.breaks.map((item) => ({ ...item })),
    workShifts: clonePharmacyShifts(workShifts),
    defaultShiftId,
  };
}

export async function loadPayrollSettings(pharmacyId: string): Promise<PayrollSettingsValues> {
  const settings = await getPharmacySettings(pharmacyId);
  const resolved = resolvePayrollSettings(settings);

  const shouldPersist =
    settings &&
    (settings.payrollPayDay == null ||
      settings.payrollSickDeductionPercent == null ||
      settings.payrollAbsentDeductionPercent == null ||
      settings.payrollMaxLeaveDays == null ||
      settings.payrollStandardWorkHours == null ||
      settings.payrollOvertimePercent == null ||
      settings.payrollDefaultTaxes == null ||
      settings.payrollDefaultInsurance == null ||
      settings.payrollWorkDayStart == null ||
      settings.payrollWorkDayEnd == null ||
      settings.payrollWorkBreaks == null ||
      settings.workShifts == null ||
      settings.defaultShiftId == null ||
      isLegacyPayrollDefaults(settings));

  if (shouldPersist) {
    try {
      const shiftA = resolved.workShifts.find((item) => item.id === "A") || resolved.workShifts[0];
      await updatePharmacySettings(pharmacyId, {
        payrollPayDay: resolved.payDay,
        payrollSickDeductionPercent: resolved.sickDeductionPercent,
        payrollAbsentDeductionPercent: resolved.absentDeductionPercent,
        payrollMaxLeaveDays: resolved.maxLeaveDays,
        payrollStandardWorkHours: resolved.standardWorkHours,
        payrollOvertimePercent: resolved.overtimePercent,
        payrollDefaultTaxes: resolved.defaultTaxes,
        payrollDefaultInsurance: resolved.defaultInsurance,
        payrollWorkDayStart: shiftA.dayStart,
        payrollWorkDayEnd: shiftA.dayEnd,
        payrollWorkBreaks: shiftA.breaks,
        workShifts: resolved.workShifts,
        defaultShiftId: resolved.defaultShiftId,
      });
    } catch (error) {
      console.error("loadPayrollSettings persist error:", error);
    }
  }

  return resolved;
}

export async function upsertPharmacySettings(
  pharmacyId: string,
  updates: Partial<PharmacySettings>,
) {
  const existing = await getPharmacySettings(pharmacyId);
  if (existing) {
    await updatePharmacySettings(pharmacyId, updates);
    return;
  }

  const payload = toSnakeCase({
    id: pharmacyId,
    name: updates.name || pharmacyId,
    name_en: updates.name_en || updates.name || pharmacyId,
    phone: updates.phone || "",
    address: updates.address || "",
    currency: updates.currency || "ج.م",
    isActive: updates.isActive ?? true,
    ...updates,
  });

  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribePharmacySettings(
  pharmacyId: string,
  callback: (settings: PharmacySettings) => void,
) {
  const channel = supabase.channel(`realtime-pharmacies-${pharmacyId}`).on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "pharmacies",
      filter: `id=eq.${pharmacyId}`,
    },
    (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        callback(toCamelCase<PharmacySettings>(row));
      }
    },
  );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

// --- HR: employee profiles, attendance, payroll ---

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

function countDaysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

function sumAttendanceWorkMinutes(records: Array<{ checkIn?: string; checkOut?: string }>): number {
  return records.reduce((sum, rec) => {
    const minutes = calcAttendanceWorkedMinutes(rec.checkIn, rec.checkOut);
    return sum + (minutes ?? 0);
  }, 0);
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
  attendance: Array<{ userId: string }>,
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

export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  return getRows<EmployeeProfile>("employee_profiles", "user_name", false, 500, undefined, true);
}

export async function upsertEmployeeProfile(
  profile: Partial<EmployeeProfile> & { userId: string; userName: string },
) {
  const id = profile.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...profile,
      id,
      baseSalary: Number(profile.baseSalary ?? 0),
      updatedAt: new Date().toISOString(),
    }),
  );
  const { error } = await supabase
    .from("employee_profiles")
    .upsert([payload], { onConflict: "pharmacy_id,user_id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getAttendanceRecords(
  fromDate: string,
  toDate: string,
  pharmacyIds?: string[],
): Promise<AttendanceRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("attendance_records").select("*"), pharmacyIds)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("getAttendanceRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<AttendanceRecord>(row));
}

export async function upsertAttendanceRecord(
  record: Partial<AttendanceRecord> & { userId: string; userName: string; workDate: string },
) {
  const id = record.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      status: record.status || "present",
      updatedAt: new Date().toISOString(),
    }),
  );
  const { error } = await supabase
    .from("attendance_records")
    .upsert([payload], { onConflict: "pharmacy_id,user_id,work_date" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAttendanceRecord(id: number) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function getAttendanceForDay(
  userId: string,
  workDate: string,
): Promise<AttendanceRecord | null> {
  let query = applyPharmacyFilter(
    supabase.from("attendance_records").select("*").eq("user_id", userId).eq("work_date", workDate),
  );
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<AttendanceRecord>(data);
}

export async function recordCheckIn(
  userId: string,
  userName: string,
  workDate?: string,
  options?: {
    expectedSchedule?: WorkSchedule;
    shiftId?: ShiftId;
    graceMinutes?: number;
  },
) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (existing?.checkIn) {
    throw new Error("already_checked_in");
  }

  const checkIn = new Date().toISOString();
  let status: AttendanceStatus =
    existing?.status && existing.status !== "absent" ? existing.status : "present";

  if (
    options?.expectedSchedule &&
    isCheckInLate(
      checkIn,
      options.expectedSchedule,
      options.graceMinutes ?? DEFAULT_ALLOWED_LATE_MINUTES,
    )
  ) {
    status = "late";
  }

  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate: date,
    checkIn,
    status,
    shiftId: options?.shiftId ?? existing?.shiftId,
  });
}

export async function recordCheckOut(userId: string, userName: string, workDate?: string) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (!existing?.checkIn) {
    throw new Error("check_in_required");
  }
  if (existing.checkOut) {
    throw new Error("already_checked_out");
  }
  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate: date,
    checkOut: new Date().toISOString(),
  });
}

export async function setAttendanceStatus(
  userId: string,
  userName: string,
  workDate: string,
  status: AttendanceStatus,
  notes?: string,
) {
  const existing = await getAttendanceForDay(userId, workDate);
  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate,
    status,
    notes: notes ?? existing?.notes,
    checkIn:
      status === "absent" || status === "leave" || status === "sick"
        ? undefined
        : existing?.checkIn,
    checkOut:
      status === "absent" || status === "leave" || status === "sick"
        ? undefined
        : existing?.checkOut,
  });
}

export async function getPayrollRecords(
  periodStart: string,
  periodEnd: string,
  pharmacyIds?: string[],
): Promise<PayrollRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("payroll_records").select("*"), pharmacyIds)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .order("user_name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("getPayrollRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PayrollRecord>(row));
}

export async function upsertPayrollRecord(
  record: Partial<PayrollRecord> & { userId: string; periodStart: string; periodEnd: string },
) {
  const calculatedSalary = Number(record.calculatedSalary ?? 0);
  const bonuses = Number(record.bonuses ?? 0);
  const deductions = Number(record.deductions ?? 0);
  const netPay = Number(record.netPay ?? computePayrollNet(record));
  const id = record.id ?? Date.now();

  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      calculatedSalary,
      bonuses,
      deductions,
      netPay,
      updatedAt: new Date().toISOString(),
    }),
  );

  const { error } = await supabase.from("payroll_records").upsert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePayrollRecord(id: number, updates: Partial<PayrollRecord>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  if (updates.netPay === undefined) {
    const financialKeys: (keyof PayrollRecord)[] = [
      "calculatedSalary",
      "specialAllowances",
      "bonuses",
      "incentives",
      "commission",
      "deductions",
      "taxes",
      "insurance",
    ];
    if (financialKeys.some((key) => updates[key] !== undefined)) {
      payload.net_pay = computePayrollNet(updates as Partial<PayrollRecord>);
    }
  }
  const { error } = await supabase.from("payroll_records").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function generatePayroll(
  periodStart: string,
  periodEnd: string,
  employees: Array<{ uid: string; name: string; isActive?: boolean; salary?: number }>,
  options: {
    sickDeductionPercent?: number;
    absentDeductionPercent?: number;
    maxLeaveDays?: number;
    standardWorkHours?: number;
    overtimePercent?: number;
    defaultTaxes?: number;
    defaultInsurance?: number;
    workShifts?: PharmacyShift[];
    defaultShiftId?: ShiftId;
  } = {},
): Promise<PayrollRecord[]> {
  const dbEmployees = await getEmployees();
  const profiles = await getEmployeeProfiles();
  const attendance = await getAttendanceRecords(periodStart, periodEnd);
  const existingPayroll = await getPayrollRecords(periodStart, periodEnd);
  const periodInvoices = await getInvoicesForPeriod(periodStart, periodEnd);
  const workingDays = countDaysInclusive(periodStart, periodEnd);
  const sickPct = Number(options.sickDeductionPercent ?? 25);
  const absentPct = Number(options.absentDeductionPercent ?? 100);
  const maxLeaveDays = Math.max(
    0,
    Math.floor(Number(options.maxLeaveDays ?? PAYROLL_DEFAULTS.maxLeaveDays)),
  );
  const standardWorkHours = Math.max(
    0,
    Number(options.standardWorkHours ?? PAYROLL_DEFAULTS.standardWorkHours),
  );
  const overtimePercent = Math.max(
    0,
    Number(options.overtimePercent ?? PAYROLL_DEFAULTS.overtimePercent),
  );
  const defaultTaxesPercent = Math.min(
    100,
    Math.max(0, Number(options.defaultTaxes ?? PAYROLL_DEFAULTS.defaultTaxes)),
  );
  const defaultInsurancePercent = Math.min(
    100,
    Math.max(0, Number(options.defaultInsurance ?? PAYROLL_DEFAULTS.defaultInsurance)),
  );
  const results: PayrollRecord[] = [];

  for (const emp of employees.filter((e) => e.isActive !== false)) {
    const dbEmployee =
      dbEmployees.find((e) => e.id === emp.uid) || dbEmployees.find((e) => e.name === emp.name);
    const existing = existingPayroll.find(
      (p) => p.userId === emp.uid || (dbEmployee ? p.userId === dbEmployee.id : false),
    );
    if (existing && existing.status === "paid") {
      results.push(existing);
      continue;
    }

    const profile = profiles.find((p) => p.userId === emp.uid);
    const baseSalary = Number(emp.salary ?? dbEmployee?.salary ?? profile?.baseSalary ?? 0);
    const empAttendance = filterAttendanceForEmployee(attendance, emp.uid, dbEmployee?.id);
    const presentDays = empAttendance.filter(
      (a) =>
        a.status === "present" ||
        a.status === "late" ||
        (a.checkIn && a.status !== "absent" && a.status !== "leave" && a.status !== "sick"),
    ).length;
    const sickDays = empAttendance.filter((a) => a.status === "sick").length;
    const rawAbsentDays = empAttendance.filter((a) => a.status === "absent").length;
    const rawLeaveDays = empAttendance.filter((a) => a.status === "leave").length;
    const leavePolicy = applyMaxLeavePolicy(rawLeaveDays, rawAbsentDays, maxLeaveDays);
    const absentDays = leavePolicy.absentDays;
    const leaveDays = leavePolicy.leaveDays;
    const requiredWorkHours = dbEmployee
      ? Math.max(
          1,
          computeWorkHoursFromSchedule(
            resolveWorkSchedule(
              dbEmployee,
              options.workShifts || PAYROLL_DEFAULTS.workShifts,
              options.defaultShiftId || "A",
            ),
          ) || Number(dbEmployee.requiredWorkHours ?? 8),
        )
      : 8;
    const earned = computePayrollEarnedFromAttendance(
      baseSalary,
      empAttendance,
      requiredWorkHours,
      requiredWorkHours,
      overtimePercent,
    );
    const calculatedSalary = earned.calculatedSalary;
    const workMinutesFinal = earned.workMinutes;
    const attendanceBreakdown = computeAttendanceDeductionBreakdown(
      { baseSalary, absentDays, sickDays, leaveDays },
      { absentPct, sickPct },
    );
    const autoDeductions = attendanceBreakdown.attendanceTotal;
    const specialAllowances = existing?.specialAllowances ?? 0;
    const bonuses = existing?.bonuses ?? 0;
    const incentives = earned.overtimePay;
    const commissionRate = Number(dbEmployee?.commissionRate ?? 0);
    const commission =
      commissionRate > 0
        ? computeCashierCommissionFromInvoices(
            periodInvoices,
            {
              userId: emp.uid,
              employeeId: dbEmployee?.id,
              userName: emp.name,
            },
            commissionRate,
            { periodStart, periodEnd },
          ).commission
        : (existing?.commission ?? 0);
    const draftForTax: Partial<PayrollRecord> = {
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
    };
    const { taxes, insurance } = computeTaxInsuranceFromPercent(
      draftForTax,
      defaultTaxesPercent,
      defaultInsurancePercent,
    );
    const deductions = autoDeductions;
    const draftRecord: PayrollRecord = {
      id: existing?.id ?? Date.now() + results.length,
      userId: emp.uid,
      userName: emp.name,
      periodStart,
      periodEnd,
      workingDays,
      presentDays,
      absentDays,
      sickDays,
      leaveDays,
      workMinutes: workMinutesFinal,
      baseSalary,
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
      deductions,
      taxes,
      insurance,
      netPay: 0,
      status: existing?.status === "paid" ? "paid" : "draft",
      notes: existing?.notes,
    };
    draftRecord.netPay = computePayrollNet(draftRecord);

    const record = draftRecord;

    await upsertPayrollRecord(record);
    results.push(record);
  }

  return results;
}

export async function resolvePayrollSalesCommission(
  record: Partial<PayrollRecord> & { userId: string; userName?: string },
  employee: Pick<Employee, "id" | "commissionRate"> | null | undefined,
  periodStart: string,
  periodEnd: string,
  pharmacyId?: string,
) {
  const rate = Number(employee?.commissionRate ?? 0);
  if (!(rate > 0)) {
    return {
      commission: Number(record.commission ?? 0),
      salesTotal: 0,
      profitTotal: 0,
      invoiceCount: 0,
      commissionRate: 0,
    };
  }

  const invoices = await getInvoicesForPeriod(
    periodStart,
    periodEnd,
    pharmacyId ? [pharmacyId] : undefined,
  );

  return computeCashierCommissionFromInvoices(
    invoices,
    {
      userId: record.userId,
      employeeId: employee?.id,
      userName: record.userName,
    },
    rate,
    { periodStart, periodEnd },
  );
}

export async function syncCashierPayrollCommissionAfterSale(params: {
  cashierUserId: string;
  cashierName?: string;
  pharmacyId?: string;
}) {
  if (!params.cashierUserId) return;

  const appUser = {
    uid: params.cashierUserId,
    name: params.cashierName || "",
    pharmacyId: params.pharmacyId || resolveStampPharmacyId(),
  } as AppUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee || !(Number(employee.commissionRate) > 0)) return;

  const { periodStart, periodEnd } = currentMonthPeriodBounds();
  const sales = await resolvePayrollSalesCommission(
    { userId: params.cashierUserId, userName: params.cashierName, commission: 0 },
    employee,
    periodStart,
    periodEnd,
    employee.pharmacyId,
  );

  const payrollRows = await getPayrollRecords(periodStart, periodEnd);
  const existing = payrollRows.find(
    (row) =>
      row.userId === params.cashierUserId ||
      row.userId === employee.id ||
      row.userName === employee.name,
  );

  if (!existing?.id || existing.status === "paid") return;

  const payrollSettings = await loadPayrollSettings(employee.pharmacyId);
  const merged = { ...existing, commission: sales.commission };
  const { taxes, insurance } = computeTaxInsuranceFromPercent(
    merged,
    payrollSettings.defaultTaxes,
    payrollSettings.defaultInsurance,
  );
  const netPay = computePayrollNet({ ...merged, taxes, insurance });

  await updatePayrollRecord(existing.id, {
    commission: sales.commission,
    taxes,
    insurance,
    netPay,
  });
}

// --- Employees (HR staff records, separate from login accounts) ---

export async function getEmployees(): Promise<Employee[]> {
  return getRows<Employee>("employees", "employee_code", false, 500, undefined, true);
}

export async function getEmployeesForPharmacies(pharmacyIds: string[]): Promise<Employee[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getEmployees();
  if (ids.length === 1) {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("pharmacy_id", ids[0])
      .order("employee_code", { ascending: true })
      .limit(500);
    if (error) {
      console.error("getEmployeesForPharmacies error:", error.message);
      return [];
    }
    return (data || []).map((row) => toCamelCase<Employee>(row));
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .in("pharmacy_id", ids)
    .order("employee_code", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("getEmployeesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Employee>(row));
}

export async function suggestNextEmployeeCode(pharmacyId?: string): Promise<string> {
  const scopeId = pharmacyId || resolveStampPharmacyId();
  const employees = await getEmployees();
  const scoped = employees.filter((e) => e.pharmacyId === scopeId);
  let maxNum = 0;
  for (const emp of scoped) {
    const code = (emp.employeeCode || "").trim();
    const match = code.match(/(\d+)\s*$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  let query = applyPharmacyFilter(supabase.from("employees").select("*").eq("id", id));
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<Employee>(data);
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Employee> {
  const id = input.id || crypto.randomUUID();
  const pharmacyId = input.pharmacyId || resolveStampPharmacyId();
  let employeeCode = (input.employeeCode || "").trim();
  if (!employeeCode) {
    employeeCode = await suggestNextEmployeeCode(pharmacyId);
  }
  const payload = stampPharmacy(
    toSnakeCase({
      ...input,
      id,
      pharmacyId,
      employeeCode,
      salary: Number(input.salary ?? 0),
      commissionRate: Number(input.commissionRate ?? 0),
      requiredWorkHours: Number(input.requiredWorkHours ?? 8),
      assignedShiftId: (input.assignedShiftId as ShiftId) || "A",
      useCustomWorkSchedule: Boolean(input.useCustomWorkSchedule),
      workDayStart: input.useCustomWorkSchedule ? input.workDayStart || null : null,
      workDayEnd: input.useCustomWorkSchedule ? input.workDayEnd || null : null,
      workBreaks: input.useCustomWorkSchedule ? parseWorkBreaks(input.workBreaks) : null,
      isActive: input.isActive !== false,
      updatedAt: new Date().toISOString(),
    }),
  );
  const { data, error } = await supabase.from("employees").insert([payload]).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<Employee>(data);
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { error } = await supabase.from("employees").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  await updateEmployee(id, { isActive });
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function linkUserToEmployee(uid: string, employeeId: string | null) {
  const payload: Record<string, unknown> = {
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function resolveLinkedEmployeeFromData(
  appUser: AppUser,
  employees: Employee[],
  accounts: SystemUser[],
  loginRequests: LoginAccountRequest[],
  catalogAccounts: PharmacyLoginAccount[] = [],
): Employee | null {
  if (appUser.employeeId) {
    const linked = employees.find((item) => item.id === appUser.employeeId && item.isActive);
    if (linked) return linked;
  }

  const myAccount = accounts.find((item) => item.uid === appUser.uid);
  if (myAccount?.employeeId) {
    const linked = employees.find((item) => item.id === myAccount.employeeId && item.isActive);
    if (linked) return linked;
  }

  const normalizedEmail = appUser.email.trim().toLowerCase();

  for (const catalog of catalogAccounts) {
    if (!catalog.isActive || catalog.status !== "approved" || !catalog.employeeId) continue;
    if (catalog.email !== normalizedEmail) continue;
    const linked = employees.find((item) => item.id === catalog.employeeId && item.isActive);
    if (linked) return linked;
  }

  const approvedRequests = loginRequests
    .filter((item) => item.status === "approved")
    .sort((a, b) =>
      String(b.reviewedAt || b.updatedAt || "").localeCompare(
        String(a.reviewedAt || a.updatedAt || ""),
      ),
    );

  for (const request of approvedRequests) {
    if (request.email.trim().toLowerCase() !== normalizedEmail) continue;
    if (!request.employeeId) continue;
    const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
    if (linked) return linked;
  }

  const identity = (appUser.username || appUser.name || "").trim();
  if (identity) {
    for (const request of approvedRequests) {
      if (request.username.trim() !== identity) continue;
      if (!request.employeeId) continue;
      const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
      if (linked) return linked;
    }
  }

  return null;
}

export async function resolveLinkedEmployeeForAppUser(appUser: AppUser): Promise<Employee | null> {
  const [employees, accounts, loginRequests, catalogAccounts] = await Promise.all([
    getEmployees(),
    getSystemUsers(appUser.pharmacyId),
    getPharmacyLoginAccountRequests(appUser.pharmacyId),
    getPharmacyLoginAccounts(appUser.pharmacyId),
  ]);
  return resolveLinkedEmployeeFromData(
    appUser,
    employees,
    accounts,
    loginRequests,
    catalogAccounts,
  );
}

export async function ensureAppUserEmployeeLink(appUser: AppUser): Promise<AppUser> {
  if (appUser.employeeId) return appUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee) return appUser;

  try {
    await linkUserToEmployee(appUser.uid, employee.id);
    return { ...appUser, employeeId: employee.id };
  } catch (error) {
    console.warn("ensureAppUserEmployeeLink failed", error);
    return appUser;
  }
}

export async function linkLoginRequestToUserAccount(
  request: LoginAccountRequest,
): Promise<boolean> {
  try {
    await syncPharmacyLoginAccountToUser({
      email: request.email,
      role: request.role,
      pharmacyId: request.pharmacyId,
      employeeId: request.employeeId,
    });
    return true;
  } catch {
    return false;
  }
}

export type SyncLoginAccountResult = {
  uid: string;
  email: string;
  role: UserRole;
};

export async function syncPharmacyLoginAccountToUser(
  account: Pick<PharmacyLoginAccount, "email" | "role" | "pharmacyId" | "employeeId">,
  options?: { name?: string },
): Promise<SyncLoginAccountResult> {
  const email = account.email.trim().toLowerCase();
  const role = normalizeRole(account.role);
  const name = options?.name?.trim() || email.split("@")[0];

  const { data, error } = await supabase.rpc("sync_auth_user_for_login_account", {
    p_email: email,
    p_role: role,
    p_pharmacy_id: account.pharmacyId,
    p_employee_id: account.employeeId || null,
    p_name: name,
  });

  if (error) {
    if (error.message.includes("auth_user_not_found")) {
      throw new Error("auth_user_not_found");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("sync_failed");
  }

  return { uid: String(data), email, role };
}

export async function syncAllPharmacyLoginAccounts(pharmacyId: string) {
  const [accounts, employees] = await Promise.all([
    getPharmacyLoginAccounts(pharmacyId),
    getEmployees(),
  ]);
  const employeeById = new Map(employees.map((item) => [item.id, item]));

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const account of accounts) {
    if (account.status !== "approved") continue;
    try {
      const employee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
      await syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      if (account.linkRequestPending) {
        await supabase
          .from("pharmacy_login_accounts")
          .update({
            link_request_pending: false,
            link_requested_by: null,
            link_requested_by_name: null,
            link_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }
      results.push({ email: account.email, ok: true });
    } catch (err) {
      results.push({
        email: account.email,
        ok: false,
        error: err instanceof Error ? err.message : "sync_failed",
      });
    }
  }

  return results;
}

export async function linkExistingAuthUser(params: {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  username?: string;
  isActive?: boolean;
}) {
  const { error } = await supabase.from("users").upsert([
    {
      uid: params.uid,
      employee_id: params.employeeId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      username: params.username?.trim() || null,
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: params.isActive !== false,
      updated_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLoginAccount(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function recordLastLogin(uid: string) {
  const { error } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("uid", uid);
  if (error) {
    console.error("recordLastLogin error:", error.message);
  }
}

function buildEmployeeRequestNumber() {
  return `ER-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
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

export async function getEmployeeRequests(options?: {
  userId?: string;
  employeeId?: string;
  status?: EmployeeRequestStatus;
  fromDate?: string;
  toDate?: string;
  pharmacyIds?: string[];
}): Promise<EmployeeRequest[]> {
  let query = applyPharmacyScopeFilter(
    supabase.from("employee_requests").select("*"),
    options?.pharmacyIds,
  ).order("created_at", { ascending: false });

  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.employeeId) query = query.eq("employee_id", options.employeeId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.fromDate) query = query.gte("work_date", options.fromDate);
  if (options?.toDate) query = query.lte("work_date", options.toDate);

  const { data, error } = await query;
  if (error) {
    console.error("getEmployeeRequests error:", error.message);
    return [];
  }
  return (data || []).map((row) => toCamelCase<EmployeeRequest>(row));
}

export async function createEmployeeRequest(input: {
  employeeId: string;
  userId?: string;
  employeeName: string;
  requestType: EmployeeRequestType;
  workDate: string;
  endDate?: string;
  requestedTime?: string;
  reason?: string;
}): Promise<EmployeeRequest> {
  const payload = stampPharmacy(
    toSnakeCase({
      requestNumber: buildEmployeeRequestNumber(),
      employeeId: input.employeeId,
      userId: input.userId || "",
      employeeName: input.employeeName,
      requestType: input.requestType,
      workDate: input.workDate,
      endDate: input.endDate || null,
      requestedTime: input.requestedTime || null,
      reason: input.reason || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("employee_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<EmployeeRequest>(data);
}

export async function reviewEmployeeRequest(
  id: number,
  status: Exclude<EmployeeRequestStatus, "pending">,
  reviewer: { uid: string; name: string },
  reviewNote?: string,
): Promise<EmployeeRequest> {
  const { data: existing, error: loadError } = await applyPharmacyFilter(
    supabase.from("employee_requests").select("*").eq("id", id),
  ).maybeSingle();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "request_not_found");
  }

  const request = toCamelCase<EmployeeRequest>(existing);
  if (request.status !== "pending") {
    throw new Error("request_already_reviewed");
  }

  const payload = toSnakeCase({
    status,
    reviewedBy: reviewer.uid,
    reviewedByName: reviewer.name,
    reviewNote: reviewNote || "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await applyPharmacyFilter(
    supabase.from("employee_requests").update(payload).eq("id", id),
  )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = toCamelCase<EmployeeRequest>(data);

  if (status === "approved") {
    if (updated.requestType === "leave") {
      const end = updated.endDate || updated.workDate;
      const days = listDaysBetween(updated.workDate, end);
      for (const workDate of days) {
        await upsertAttendanceRecord({
          userId: updated.userId || updated.employeeId,
          userName: updated.employeeName,
          workDate,
          status: "leave",
          notes: updated.reason || (updated.requestNumber ? `إجازة ${updated.requestNumber}` : ""),
        });
      }
    } else if (updated.requestType === "permission") {
      const existingRecord = await getAttendanceForDay(
        updated.userId || updated.employeeId,
        updated.workDate,
      );
      const permissionNote = updated.requestedTime
        ? `إذن معتمد — انصراف ${updated.requestedTime}`
        : "إذن معتمد";
      await upsertAttendanceRecord({
        ...existingRecord,
        userId: updated.userId || updated.employeeId,
        userName: updated.employeeName,
        workDate: updated.workDate,
        status: existingRecord?.status || "present",
        notes: [existingRecord?.notes, permissionNote].filter(Boolean).join(" | "),
      });
    }
  }

  return updated;
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
