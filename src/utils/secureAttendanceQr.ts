/** Attendance QR token format: ATTQR|{branch_id}|{unix_window}|{hmac_sha256_hex} */

export const ATTENDANCE_QR_REFRESH_MS = 10_000;
export const ATTENDANCE_QR_TTL_SECONDS = 10;
export const DEFAULT_GEOFENCE_RADIUS_M = 30;

export type SecureAttendanceAction = "check_in" | "check_out";

export type SecureAttendanceResult = {
  ok: boolean;
  action?: SecureAttendanceAction;
  branchId?: string;
  workDate?: string;
  distanceM?: number;
  allowedM?: number;
  error?: string;
};

export function parseAttendanceQrPayload(payload: string): {
  branchId: string;
  windowTs: number;
  signature: string;
} | null {
  const parts = payload.trim().split("|");
  if (parts.length !== 4 || parts[0] !== "ATTQR") return null;
  const branchId = parts[1]?.trim();
  const windowTs = Number(parts[2]);
  const signature = parts[3]?.trim().toLowerCase();
  if (!branchId || !Number.isFinite(windowTs) || !signature) return null;
  return { branchId, windowTs, signature };
}

/** Client-side HMAC (dev / fallback). Production: use get_dynamic_attendance_qr RPC. */
export async function signAttendanceQrPayload(
  branchId: string,
  secret: string,
  windowTs?: number,
): Promise<string> {
  const aligned =
    windowTs ??
    Math.floor(Date.now() / 1000) -
      (Math.floor(Date.now() / 1000) % ATTENDANCE_QR_TTL_SECONDS);
  const body = `${branchId}|${aligned}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const signature = [...new Uint8Array(sigBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `ATTQR|${body}|${signature}`;
}

export function formatSecureAttendanceError(code: string, isArabic: boolean): string {
  const map: Record<string, [string, string]> = {
    qr_expired_or_invalid: [
      "انتهت صلاحية رمز QR — امسح الكود الحالي من شاشة الكاشير",
      "QR code expired — scan the current code on the POS screen",
    ],
    qr_expired: [
      "انتهت صلاحية رمز QR (أكثر من 10 ثوانٍ)",
      "QR code expired (older than 10 seconds)",
    ],
    invalid_format: ["رمز QR غير صالح", "Invalid QR code"],
    invalid_signature: ["رمز QR غير موثوق", "QR signature mismatch"],
    outside_geofence: [
      "أنت خارج نطاق الصيدلية — اقترب من الفرع (أقل من 30 متر)",
      "You are outside the pharmacy geofence — move closer (within 30 m)",
    ],
    branch_location_not_configured: [
      "إحداثيات الفرع غير مضبوطة — اطلب من المدير ضبط الموقع من صفحة الفروع",
      "Branch GPS not configured — ask admin to set coordinates in Branches",
    ],
    location_required: [
      "فعّل خدمة الموقع (GPS) على الموبايل",
      "Enable location (GPS) on your device",
    ],
    already_checked_in: ["تم تسجيل الحضور مسبقاً", "Already checked in"],
    already_checked_out: ["تم تسجيل الانصراف مسبقاً", "Already checked out"],
    check_in_required: ["سجّل الحضور أولاً", "Check in first"],
    employee_not_linked: [
      "حسابك غير مربوط بموظف — تواصل مع المدير",
      "Your account is not linked to an employee profile",
    ],
    employee_wrong_branch: [
      "أنت مسجّل على فرع آخر — استخدم QR فرعك",
      "You belong to another branch — use your branch QR",
    ],
    not_authorized: ["غير مصرح", "Not authorized"],
    invalid_action: ["إجراء غير صالح", "Invalid action"],
    branch_not_found: ["الفرع غير موجود", "Branch not found"],
    user_not_found: ["المستخدم غير موجود", "User not found"],
  };
  const pair = map[code];
  if (pair) return isArabic ? pair[0] : pair[1];
  return code || (isArabic ? "تعذر تسجيل الحضور" : "Attendance failed");
}
