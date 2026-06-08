export type WorkBreak = {
  start: string;
  end: string;
};

export type WorkSchedule = {
  dayStart: string;
  dayEnd: string;
  breaks: WorkBreak[];
};

export type ShiftId = "A" | "B" | "C";

export const SHIFT_IDS: ShiftId[] = ["A", "B", "C"];

export type PharmacyShift = {
  id: ShiftId;
  label: string;
  labelAr: string;
  dayStart: string;
  dayEnd: string;
  breaks: WorkBreak[];
  /** Minutes after shift start before check-in counts as late. */
  allowedLateMinutes: number;
};

export const WORK_SCHEDULE_DEFAULTS: WorkSchedule = {
  dayStart: "08:00",
  dayEnd: "16:00",
  breaks: [{ start: "12:00", end: "13:00" }],
};

export const DEFAULT_ALLOWED_LATE_MINUTES = 15;

export const DEFAULT_PHARMACY_SHIFTS: PharmacyShift[] = [
  {
    id: "A",
    label: "Shift A",
    labelAr: "شيفت أ",
    dayStart: "08:00",
    dayEnd: "16:00",
    breaks: [{ start: "12:00", end: "13:00" }],
    allowedLateMinutes: DEFAULT_ALLOWED_LATE_MINUTES,
  },
  {
    id: "B",
    label: "Shift B",
    labelAr: "شيفت ب",
    dayStart: "16:00",
    dayEnd: "00:00",
    breaks: [],
    allowedLateMinutes: DEFAULT_ALLOWED_LATE_MINUTES,
  },
  {
    id: "C",
    label: "Shift C",
    labelAr: "شيفت ج",
    dayStart: "00:00",
    dayEnd: "08:00",
    breaks: [],
    allowedLateMinutes: DEFAULT_ALLOWED_LATE_MINUTES,
  },
];

export function emptyWorkBreak(): WorkBreak {
  return { start: "12:00", end: "13:00" };
}

export function normalizeTimeValue(value: string | undefined | null, fallback: string): string {
  if (!value || typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseWorkBreaks(raw: unknown): WorkBreak[] {
  if (!raw) return [];
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return [];
    }
  } else {
    return [];
  }

  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const start = normalizeTimeValue(String(row.start ?? ""), "");
      const end = normalizeTimeValue(String(row.end ?? ""), "");
      if (!start || !end) return null;
      return { start, end };
    })
    .filter((item): item is WorkBreak => item !== null);
}

function normalizeShiftId(value: unknown, fallback: ShiftId): ShiftId {
  const id = String(value || "").trim().toUpperCase();
  return SHIFT_IDS.includes(id as ShiftId) ? (id as ShiftId) : fallback;
}

function normalizeAllowedLateMinutes(value: unknown, fallback = DEFAULT_ALLOWED_LATE_MINUTES): number {
  const minutes = Number(value ?? fallback);
  if (!Number.isFinite(minutes)) return fallback;
  return Math.min(180, Math.max(0, Math.round(minutes)));
}

export function resolveAllowedLateMinutes(
  shiftId: ShiftId,
  pharmacyShifts: PharmacyShift[]
): number {
  const shift = pharmacyShifts.find((item) => item.id === shiftId);
  return normalizeAllowedLateMinutes(shift?.allowedLateMinutes, DEFAULT_ALLOWED_LATE_MINUTES);
}

export function parsePharmacyShifts(raw: unknown, legacySchedule?: WorkSchedule): PharmacyShift[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }

  const byId = new Map<ShiftId, PharmacyShift>();
  for (const template of DEFAULT_PHARMACY_SHIFTS) {
    byId.set(template.id, { ...template, breaks: template.breaks.map((item) => ({ ...item })) });
  }

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = normalizeShiftId(row.id, "A");
    const template = byId.get(id)!;
    byId.set(id, {
      id,
      label: String(row.label || template.label),
      labelAr: String(row.labelAr || template.labelAr),
      dayStart: normalizeTimeValue(String(row.dayStart ?? ""), template.dayStart),
      dayEnd: normalizeTimeValue(String(row.dayEnd ?? ""), template.dayEnd),
      breaks: parseWorkBreaks(row.breaks),
      allowedLateMinutes: normalizeAllowedLateMinutes(
        row.allowedLateMinutes,
        template.allowedLateMinutes
      ),
    });
  }

  if (legacySchedule) {
    const shiftA = byId.get("A")!;
    byId.set("A", {
      ...shiftA,
      dayStart: legacySchedule.dayStart,
      dayEnd: legacySchedule.dayEnd,
      breaks: legacySchedule.breaks.map((item) => ({ ...item })),
    });
  }

  return SHIFT_IDS.map((id) => byId.get(id)!);
}

export function clonePharmacyShifts(shifts: PharmacyShift[]): PharmacyShift[] {
  return shifts.map((shift) => ({
    ...shift,
    breaks: shift.breaks.map((item) => ({ ...item })),
  }));
}

export function getShiftDisplayName(
  shiftId: ShiftId,
  shifts: PharmacyShift[],
  isArabic: boolean
): string {
  const shift = shifts.find((item) => item.id === shiftId);
  if (!shift) return isArabic ? `شيفت ${shiftId}` : `Shift ${shiftId}`;
  return isArabic ? shift.labelAr || shift.label : shift.label;
}

export function timeToMinutes(time: string): number {
  const normalized = normalizeTimeValue(time, "00:00");
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Net work minutes = shift length minus breaks (supports overnight end). */
export function computeWorkMinutesFromSchedule(schedule: WorkSchedule): number {
  const start = timeToMinutes(schedule.dayStart);
  let end = timeToMinutes(schedule.dayEnd);
  if (end <= start) end += 24 * 60;

  let breakMinutes = 0;
  for (const br of schedule.breaks) {
    let bStart = timeToMinutes(br.start);
    let bEnd = timeToMinutes(br.end);
    if (bEnd <= bStart) bEnd += 24 * 60;
    breakMinutes += Math.max(0, bEnd - bStart);
  }

  return Math.max(0, end - start - breakMinutes);
}

export function computeWorkHoursFromSchedule(schedule: WorkSchedule): number {
  return minutesToHours(computeWorkMinutesFromSchedule(schedule));
}

export type ResolvedWorkSchedule = WorkSchedule & {
  shiftId: ShiftId;
  shiftLabel: string;
  shiftLabelAr: string;
};

export function resolveScheduleForShiftId(
  shiftId: ShiftId | string | null | undefined,
  pharmacyShifts: PharmacyShift[],
  fallbackShiftId: ShiftId = "A"
): ResolvedWorkSchedule {
  const normalized = normalizeShiftId(shiftId, fallbackShiftId);
  const shiftTemplate =
    pharmacyShifts.find((item) => item.id === normalized) ||
    pharmacyShifts[0] ||
    DEFAULT_PHARMACY_SHIFTS[0];

  return {
    dayStart: shiftTemplate.dayStart,
    dayEnd: shiftTemplate.dayEnd,
    breaks: shiftTemplate.breaks.map((item) => ({ ...item })),
    shiftId: shiftTemplate.id,
    shiftLabel: shiftTemplate.label,
    shiftLabelAr: shiftTemplate.labelAr,
  };
}

export function resolveWorkSchedule(
  employee: {
    useCustomWorkSchedule?: boolean;
    assignedShiftId?: string | null;
    workDayStart?: string | null;
    workDayEnd?: string | null;
    workBreaks?: unknown;
  } | null | undefined,
  pharmacyShifts: PharmacyShift[],
  defaultShiftId: ShiftId = "A"
): ResolvedWorkSchedule {
  const shiftId = normalizeShiftId(employee?.assignedShiftId, defaultShiftId);
  const shiftTemplate =
    pharmacyShifts.find((item) => item.id === shiftId) ||
    pharmacyShifts[0] ||
    DEFAULT_PHARMACY_SHIFTS[0];

  if (!employee?.useCustomWorkSchedule) {
    return {
      dayStart: shiftTemplate.dayStart,
      dayEnd: shiftTemplate.dayEnd,
      breaks: shiftTemplate.breaks.map((item) => ({ ...item })),
      shiftId: shiftTemplate.id,
      shiftLabel: shiftTemplate.label,
      shiftLabelAr: shiftTemplate.labelAr,
    };
  }

  return {
    dayStart: normalizeTimeValue(employee.workDayStart ?? undefined, shiftTemplate.dayStart),
    dayEnd: normalizeTimeValue(employee.workDayEnd ?? undefined, shiftTemplate.dayEnd),
    breaks: parseWorkBreaks(employee.workBreaks),
    shiftId,
    shiftLabel: shiftTemplate.label,
    shiftLabelAr: shiftTemplate.labelAr,
  };
}

/** Normalize check-in time onto the shift timeline; null if outside the shift window. */
function normalizeCheckInMinutes(checkIn: Date, schedule: WorkSchedule): number | null {
  const checkMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  const startMinutes = timeToMinutes(schedule.dayStart);
  let endMinutes = timeToMinutes(schedule.dayEnd);
  const overnightShift = endMinutes <= startMinutes;
  if (overnightShift) endMinutes += 24 * 60;

  let normalizedCheck = checkMinutes;
  if (overnightShift && checkMinutes < startMinutes) {
    normalizedCheck += 24 * 60;
  }

  const maxEarlyMinutes = 120;
  if (normalizedCheck < startMinutes - maxEarlyMinutes) return null;
  if (normalizedCheck > endMinutes) return null;

  return normalizedCheck;
}

/** Returns true if check-in is after scheduled start + grace minutes (only within shift window). */
export function isCheckInLate(checkInIso: string, schedule: WorkSchedule, graceMinutes = 15): boolean {
  const checkIn = new Date(checkInIso);
  if (Number.isNaN(checkIn.getTime())) return false;

  const startMinutes = timeToMinutes(schedule.dayStart);
  const normalizedCheck = normalizeCheckInMinutes(checkIn, schedule);
  if (normalizedCheck === null) return false;

  return normalizedCheck > startMinutes + graceMinutes;
}

/** Returns true if check-out is before scheduled shift end (with grace). */
export function isCheckOutEarly(
  checkOutIso: string,
  schedule: WorkSchedule,
  workDate: string,
  graceMinutes = DEFAULT_ALLOWED_LATE_MINUTES
): boolean {
  const checkOut = new Date(checkOutIso);
  if (Number.isNaN(checkOut.getTime())) return false;

  const checkoutDate = checkOutIso.slice(0, 10);
  const checkMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
  const startMinutes = timeToMinutes(schedule.dayStart);
  let endMinutes = timeToMinutes(schedule.dayEnd);
  const overnightShift = endMinutes <= startMinutes;
  if (overnightShift) endMinutes += 24 * 60;

  let normalizedCheck: number;
  if (checkoutDate === workDate) {
    normalizedCheck = checkMinutes;
    if (overnightShift && checkMinutes < startMinutes) {
      normalizedCheck += 24 * 60;
    }
  } else if (checkoutDate > workDate) {
    const workDay = new Date(`${workDate}T12:00:00`);
    const checkoutDay = new Date(`${checkoutDate}T12:00:00`);
    const dayDiff = Math.round((checkoutDay.getTime() - workDay.getTime()) / 86400000);
    if (dayDiff < 1) return false;
    normalizedCheck = checkMinutes + dayDiff * 24 * 60;
  } else {
    return false;
  }

  if (overnightShift && normalizedCheck < startMinutes) {
    return false;
  }

  if (normalizedCheck > endMinutes) return false;

  return normalizedCheck < endMinutes - graceMinutes;
}

export type AttendanceTimingFlags = {
  isLate: boolean;
  isEarlyLeave: boolean;
};

export function isEarlyLeaveApproved(
  earlyLeaveOutcome: "permission" | "deduction" | undefined,
  hasApprovedPermissionRequest: boolean
): boolean {
  if (hasApprovedPermissionRequest) return true;
  return earlyLeaveOutcome !== "deduction";
}

export function resolveEarlyLeaveOutcome(
  earlyLeaveOutcome: "permission" | "deduction" | undefined
): "permission" | "deduction" {
  return earlyLeaveOutcome === "deduction" ? "deduction" : "permission";
}

export function evaluateAttendanceTiming(
  workDate: string,
  checkInIso: string | undefined,
  checkOutIso: string | undefined,
  schedule: WorkSchedule,
  allowedLateMinutes = DEFAULT_ALLOWED_LATE_MINUTES,
  options?: { approvedEarlyLeave?: boolean }
): AttendanceTimingFlags {
  return {
    isLate: checkInIso ? isCheckInLate(checkInIso, schedule, allowedLateMinutes) : false,
    isEarlyLeave:
      checkOutIso && !options?.approvedEarlyLeave
        ? isCheckOutEarly(checkOutIso, schedule, workDate, allowedLateMinutes)
        : false,
  };
}

/** Infer shift from current local time (fallback when employee has no assignment). */
export function inferShiftIdFromTime(
  date = new Date(),
  shifts: PharmacyShift[] = DEFAULT_PHARMACY_SHIFTS
): ShiftId {
  const nowMinutes = date.getHours() * 60 + date.getMinutes();

  for (const shift of shifts) {
    const start = timeToMinutes(shift.dayStart);
    let end = timeToMinutes(shift.dayEnd);
    if (end <= start) end += 24 * 60;

    let point = nowMinutes;
    if (end > 24 * 60 && point < start) point += 24 * 60;

    if (point >= start && point < end) {
      return shift.id;
    }
  }

  return "A";
}

export function formatScheduleWindow(schedule: WorkSchedule, isArabic: boolean): string {
  return isArabic
    ? `${schedule.dayStart} → ${schedule.dayEnd}`
    : `${schedule.dayStart} → ${schedule.dayEnd}`;
}
