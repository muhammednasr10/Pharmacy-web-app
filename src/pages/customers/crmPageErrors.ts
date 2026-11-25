export function subscriptionBlockedAlert(isArabic: boolean) {
  return isArabic
    ? "انتهى الاشتراك — جدّد الاشتراك لاستخدام النظام"
    : "Subscription expired — renew to use the system";
}

export function crmSqlMigrationAlert(
  isArabic: boolean,
  sqlFile: "customers-crm.sql" | "pharmacy-suppliers.sql",
) {
  return isArabic
    ? `شغّل supabase/${sqlFile} في Supabase أولاً`
    : `Run supabase/${sqlFile} in Supabase first`;
}

export function crmActionErrorAlert(
  error: unknown,
  isArabic: boolean,
  fallback: string,
  sqlFile?: "customers-crm.sql" | "pharmacy-suppliers.sql",
) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "sql_migration_required" && sqlFile) {
    return crmSqlMigrationAlert(isArabic, sqlFile);
  }
  return message || fallback;
}
