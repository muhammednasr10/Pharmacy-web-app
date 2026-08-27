export type AttendanceCardTone = "idle" | "in" | "done";

export function resolveAttendanceCardStatus(
  checkedIn: boolean,
  checkedOut: boolean,
  isArabic: boolean,
): { label: string; tone: AttendanceCardTone } {
  if (checkedIn && checkedOut) {
    return { label: isArabic ? "مكتمل" : "Complete", tone: "done" };
  }
  if (checkedIn) {
    return { label: isArabic ? "في الشيفت" : "On shift", tone: "in" };
  }
  return { label: isArabic ? "لم يحضر" : "Not in", tone: "idle" };
}
