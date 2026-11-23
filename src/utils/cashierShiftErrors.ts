/** Detect missing relation / schema-cache errors for cashier_shifts only. */
export function isCashierShiftsTableMissingError(message: string): boolean {
  const text = String(message || "").toLowerCase();
  if (!text) return false;

  const mentionsTable =
    text.includes("cashier_shifts") ||
    text.includes("schema cache") ||
    text.includes("could not find the table");

  if (!mentionsTable) return false;

  return (
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    text.includes("relation") && text.includes("does not exist") ||
    /pgrst20[45]/.test(text) ||
    text.includes("42p01")
  );
}

export function isCashierShiftsForeignKeyError(message: string): boolean {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("cashier_shifts_pharmacy_id_fkey") ||
    (text.includes("foreign key") && text.includes("pharmacy"))
  );
}

export function formatCashierShiftOpenError(message: string, isArabic: boolean): string {
  if (message.includes("shift_already_open")) {
    return isArabic ? "لديك وردية مفتوحة بالفعل" : "You already have an open shift";
  }
  if (isCashierShiftsTableMissingError(message)) {
    return isArabic
      ? "جدول ورديات الكاشير غير مفعّل. شغّل supabase/cashier-shifts.sql"
      : "Cashier shifts table missing. Run supabase/cashier-shifts.sql";
  }
  if (isCashierShiftsForeignKeyError(message)) {
    return isArabic
      ? "فرع الصيدلية غير مسجّل في قاعدة البيانات. راجع سجل الصيدليات ثم أعد المحاولة."
      : "Pharmacy branch is missing in the database. Restore the pharmacy record and try again.";
  }
  if (/row-level security|rls|not authorized|permission denied|42501/i.test(message)) {
    return isArabic
      ? "ليس لديك صلاحية فتح وردية على هذا الفرع."
      : "You do not have permission to open a shift on this branch.";
  }
  return message || (isArabic ? "تعذر فتح الوردية" : "Could not open shift");
}
