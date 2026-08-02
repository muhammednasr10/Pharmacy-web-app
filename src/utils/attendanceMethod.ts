import type { AttendanceRecord } from "../types";

export function isSecureAttendanceStamp(
  distanceM?: number | null,
  lat?: number | null,
  lng?: number | null,
): boolean {
  return distanceM != null || lat != null || lng != null;
}

export function getAttendanceCheckInMethod(
  record?: Pick<
    AttendanceRecord,
    "checkIn" | "checkInDistanceM" | "checkInLat" | "checkInLng"
  > | null,
): "secure" | "manual" | null {
  if (!record?.checkIn) return null;
  return isSecureAttendanceStamp(record.checkInDistanceM, record.checkInLat, record.checkInLng)
    ? "secure"
    : "manual";
}

export function getAttendanceCheckOutMethod(
  record?: Pick<
    AttendanceRecord,
    "checkOut" | "checkOutDistanceM" | "checkOutLat" | "checkOutLng"
  > | null,
): "secure" | "manual" | null {
  if (!record?.checkOut) return null;
  return isSecureAttendanceStamp(record.checkOutDistanceM, record.checkOutLat, record.checkOutLng)
    ? "secure"
    : "manual";
}

export function formatAttendanceMethodLabel(
  method: "secure" | "manual" | null,
  isArabic: boolean,
): string {
  if (!method) return "";
  if (method === "secure") return isArabic ? "بصمة" : "Secure";
  return isArabic ? "يدوي" : "Manual";
}
