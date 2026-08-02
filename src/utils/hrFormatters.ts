import * as pharmacyService from "../services/pharmacyService";
import type { AttendanceRecord, AttendanceStatus } from "../types";

export function formatTime(iso: string | undefined, isArabic: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcWorkedHours(checkIn?: string, checkOut?: string): number | null {
  return pharmacyService.calcAttendanceWorkedHours(checkIn, checkOut);
}

export function formatHoursWithMinutes(hours: number, isArabic: boolean) {
  const minutes = Math.round(hours * 60);
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} (${minutes} دقيقة)` : `${hoursText} (${minutes} min)`;
}

export function formatActualHours(checkIn?: string, checkOut?: string, isArabic = false) {
  const hours = calcWorkedHours(checkIn, checkOut);
  if (hours === null) return "—";
  return formatHoursWithMinutes(hours, isArabic);
}

export function isoToTimeInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatTimeWithOvernight(
  iso: string | undefined,
  isArabic: boolean,
  spansNextDay = false,
) {
  if (!iso) return "—";
  const time = new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!spansNextDay) return time;
  return isArabic ? `${time} (+1)` : `${time} (+1d)`;
}

export function attendanceSpansNextDay(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return false;
  return checkIn.slice(0, 10) !== checkOut.slice(0, 10);
}

export function statusClearsTimes(status: AttendanceStatus | "") {
  return status === "absent" || status === "leave" || status === "sick";
}

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    start: formatLocalDate(new Date(y, m, 1)),
    end: formatLocalDate(new Date(y, m + 1, 0)),
  };
}

export function monthBoundsFromDate(dateStr: string) {
  return monthBounds(new Date(`${dateStr}T12:00:00`));
}

export function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthAnchorDate(monthValue: string) {
  return `${monthValue}-01`;
}

export function listDaysInMonth(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    days.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatTotalWorked(minutes: number, isArabic: boolean) {
  const hours = minutes / 60;
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} ساعة (${minutes} دقيقة)` : `${hoursText} hrs (${minutes} min)`;
}

export function formatWorkMinutes(minutes: number, isArabic: boolean) {
  if (!minutes) return "0";
  const hours = minutes / 60;
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} (${minutes} د)` : `${hoursText} (${minutes}m)`;
}

export function countPeriodDays(start: string, end: string) {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function statusLabel(status: AttendanceStatus | string, isArabic: boolean) {
  const map: Record<string, { ar: string; en: string }> = {
    present: { ar: "حاضر", en: "Present" },
    absent: { ar: "غائب", en: "Absent" },
    late: { ar: "حضور (تأخير)", en: "Present (late)" },
    leave: { ar: "إجازة", en: "Leave" },
    sick: { ar: "مرضي", en: "Sick leave" },
  };
  const item = map[status] || map.present;
  return isArabic ? item.ar : item.en;
}

export function isShiftOnlyPresetRecord(record?: AttendanceRecord) {
  return Boolean(record?.shiftId && !record.checkIn && !record.checkOut);
}

export function isAttendanceWorkDay(record?: AttendanceRecord) {
  if (!record || isShiftOnlyPresetRecord(record)) return false;
  if (record.status === "present" || record.status === "late") return true;
  if (["absent", "leave", "sick"].includes(record.status)) return false;
  return Boolean(record.checkIn || record.checkOut);
}

export function formatAttendanceDateCell(dateStr: string, isArabic: boolean) {
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    day: d.getDate(),
    weekday: d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", { weekday: "short" }),
    monthYear: d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      month: "short",
      year: "numeric",
    }),
  };
}
