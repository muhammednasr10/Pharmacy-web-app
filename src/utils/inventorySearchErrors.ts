export function formatInventoryLoadError(error: unknown, isArabic: boolean): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("timeout") ||
    lower.includes("57014") ||
    lower.includes("statement timeout") ||
    lower.includes("canceling statement")
  ) {
    return isArabic
      ? "انتهت مهلة البحث — تحقق من الإنترنت وحاول مرة أخرى"
      : "Search timed out — check your connection and try again";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed")
  ) {
    return isArabic
      ? "تعذّر الاتصال بالسيرفر — تحقق من الإنترنت"
      : "Could not reach the server — check your internet";
  }

  if (lower.includes("jwt") || lower.includes("401") || lower.includes("pgrst301")) {
    return isArabic
      ? "انتهت الجلسة — سجّل الدخول من جديد ثم ابحث"
      : "Session expired — sign in again, then search";
  }

  return message;
}

export function inventoryEmptySearchMessage(
  isArabic: boolean,
  search: string,
  isOffline: boolean,
  hasOfflineCache: boolean,
): string {
  const term = search.trim();
  if (isOffline && !hasOfflineCache) {
    return isArabic
      ? "لا يوجد اتصال — لا توجد نسخة محفوظة كافية للبحث في المخزون"
      : "Offline — no saved inventory snapshot available for search";
  }
  if (term) {
    return isArabic
      ? `لا توجد أصناف مطابقة لـ «${term}»`
      : `No items matching “${term}”`;
  }
  return isArabic ? "لا توجد أصناف مطابقة" : "No matching items";
}
