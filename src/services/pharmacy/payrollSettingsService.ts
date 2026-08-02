import { supabase } from "../supabaseClient";
import type { AppUser, PharmacySettings, PharmacyShift, ShiftId, WorkBreak } from "../../types";
import {
  WORK_SCHEDULE_DEFAULTS,
  DEFAULT_PHARMACY_SHIFTS,
  clonePharmacyShifts,
  inferShiftIdFromTime,
  normalizeTimeValue,
  parsePharmacyShifts,
  parseWorkBreaks,
  resolveWorkSchedule,
  type WorkSchedule,
} from "../../utils/workSchedule";
import { toCamelCase, toSnakeCase } from "./mappers";
import { getPharmacySettings, updatePharmacySettings } from "./authService";
import { getEmployees } from "./employeeService";
import { resolveLinkedEmployeeForAppUser } from "./employeeLinkService";

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
