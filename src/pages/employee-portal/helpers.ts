export function formatTime(iso: string | undefined, isArabic: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string, isArabic: boolean) {
  const map: Record<string, { ar: string; en: string }> = {
    present: { ar: "حاضر", en: "Present" },
    absent: { ar: "غائب", en: "Absent" },
    late: { ar: "حضور (تأخير)", en: "Present (late)" },
    leave: { ar: "إجازة", en: "Leave" },
    sick: { ar: "مرضي", en: "Sick leave" },
    pending: { ar: "قيد المراجعة", en: "Pending" },
    approved: { ar: "موافق عليه", en: "Approved" },
    rejected: { ar: "مرفوض", en: "Rejected" },
  };
  const item = map[status] || { ar: "لم يسجل", en: "Not recorded" };
  return isArabic ? item.ar : item.en;
}

export function requestTypeLabel(type: string, isArabic: boolean) {
  if (type === "leave") return isArabic ? "إجازة" : "Leave";
  if (type === "permission") return isArabic ? "إذن انصراف" : "Early leave";
  return type;
}

export function currentMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function mapAttendanceActionError(
  message: string,
  isCheckOut: boolean,
  isArabic: boolean,
) {
  const fallback = isCheckOut
    ? isArabic
      ? "تعذر تسجيل الانصراف"
      : "Could not check out"
    : isArabic
      ? "تعذر تسجيل الحضور"
      : "Could not check in";

  if (message === "already_checked_in") {
    return isArabic ? "تم تسجيل الحضور مسبقاً" : "Already checked in";
  }
  if (message === "already_checked_out") {
    return isArabic ? "تم تسجيل الانصراف مسبقاً" : "Already checked out";
  }
  if (message === "check_in_required") {
    return isArabic ? "سجّل الحضور أولاً" : "Check in first";
  }
  if (/row-level security|permission denied|violates row-level/i.test(message)) {
    return isArabic
      ? "صلاحيات قاعدة البيانات تمنع التسجيل — شغّل ملف attendance-self-checkin-rls.sql في Supabase"
      : "Database permissions blocked this action — run attendance-self-checkin-rls.sql in Supabase";
  }
  return message || fallback;
}
