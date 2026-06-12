export function getHeldInvoiceErrorMessage(error: unknown, isArabic: boolean) {
  const message = error instanceof Error ? error.message : "";
  if (message === "held_invoices_table_missing") {
    return isArabic
      ? "جدول الفواتير المعلقة غير موجود في Supabase. شغّل الملف: supabase/held-invoices-and-instant-return.sql"
      : "Held invoices table is missing. Run supabase/held-invoices-and-instant-return.sql";
  }
  if (message === "held_invoice_not_found") {
    return isArabic
      ? "الفاتورة المعلقة غير موجودة أو لا يمكن الوصول إليها"
      : "Held invoice not found or not accessible";
  }
  if (message === "held_invoice_not_active") {
    return isArabic
      ? "هذه الفاتورة لم تعد معلقة (تم استرجاعها أو حذفها مسبقاً)"
      : "This invoice is no longer held";
  }
  if (message === "held_invoice_id_missing") {
    return isArabic ? "معرّف الفاتورة المعلقة غير صالح" : "Invalid held invoice id";
  }
  return message || (isArabic ? "تعذر تحميل الفواتير المعلقة" : "Could not load held invoices");
}
