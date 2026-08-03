import type { AttendanceRecord, EmployeeRequest } from "../types";
import {
  formatScheduleWindow,
  getShiftDisplayName,
  type PharmacyShift,
  type ResolvedWorkSchedule,
} from "./workSchedule";

export type EmployeeMonthDay = {
  date: string;
  dayNumber: number;
  weekdayLabel: string;
  isToday: boolean;
  isWorkDay: boolean;
  shiftLabel: string;
  shiftWindow: string;
  dayKind: "work" | "off" | "leave";
  attendance?: AttendanceRecord;
};

const DEFAULT_REST_WEEKDAYS = [5];

function eachDateInRange(startIso: string, endIso: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isDateInApprovedLeave(dateIso: string, requests: EmployeeRequest[]) {
  return requests.some((request) => {
    if (request.status !== "approved" || request.requestType !== "leave") return false;
    const endDate = request.endDate || request.workDate;
    return request.workDate <= dateIso && endDate >= dateIso;
  });
}

export function buildEmployeeMonthDays(input: {
  monthStart: string;
  monthEnd: string;
  todayIso: string;
  schedule: ResolvedWorkSchedule;
  workShifts: PharmacyShift[];
  isArabic: boolean;
  monthRecords: AttendanceRecord[];
  requests: EmployeeRequest[];
  restWeekdays?: number[];
}): EmployeeMonthDay[] {
  const restWeekdays = input.restWeekdays ?? DEFAULT_REST_WEEKDAYS;
  const attendanceByDate = new Map(input.monthRecords.map((row) => [row.workDate, row]));
  const shiftLabel = getShiftDisplayName(
    input.schedule.shiftId,
    input.workShifts,
    input.isArabic,
  );
  const shiftWindow = formatScheduleWindow(input.schedule, input.isArabic);

  return eachDateInRange(input.monthStart, input.monthEnd).map((date) => {
    const dayDate = new Date(`${date}T12:00:00`);
    const weekdayLabel = dayDate.toLocaleDateString(input.isArabic ? "ar-EG" : "en-GB", {
      weekday: "short",
    });
    const onLeave = isDateInApprovedLeave(date, input.requests);
    const isRestDay = restWeekdays.includes(dayDate.getDay());
    const isWorkDay = !isRestDay && !onLeave;
    const dayKind: EmployeeMonthDay["dayKind"] = onLeave ? "leave" : isRestDay ? "off" : "work";

    return {
      date,
      dayNumber: dayDate.getDate(),
      weekdayLabel,
      isToday: date === input.todayIso,
      isWorkDay,
      shiftLabel,
      shiftWindow,
      dayKind,
      attendance: attendanceByDate.get(date),
    };
  });
}

export function formatMonthTitle(monthStart: string, isArabic: boolean) {
  const date = new Date(`${monthStart}T12:00:00`);
  return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}
