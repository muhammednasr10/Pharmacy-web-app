export function formatBranchLimitError(message: string, isArabic: boolean): string {
  const map: Record<string, [string, string]> = {
    forbidden: ["ليس لديك صلاحية لهذا الإجراء", "You do not have permission for this action"],
    invalid_max_branches: [
      "أدخل عدداً صحيحاً أكبر من صفر",
      "Enter a whole number greater than zero",
    ],
    below_current_branches: [
      "لا يمكن تقليل الحد عن عدد الفروع الحالية",
      "Cannot set limit below current branch count",
    ],
    organization_not_found: [
      "المجموعة غير موجودة في قاعدة البيانات",
      "Organization not found in database",
    ],
    update_blocked_or_not_found: [
      "تعذر التحديث — شغّل organization-branch-limit.sql في Supabase",
      "Update blocked — run organization-branch-limit.sql in Supabase",
    ],
    sql_migration_required: [
      "شغّل ملف supabase/organization-user-limit.sql في Supabase SQL Editor ثم أعد المحاولة",
      "Run supabase/organization-user-limit.sql in Supabase SQL Editor, then try again",
    ],
    invalid_max_users: [
      "أدخل عدداً صحيحاً أكبر من صفر",
      "Enter a whole number greater than zero",
    ],
    below_current_users: [
      "لا يمكن تقليل الحد عن عدد المستخدمين الحالي",
      "Cannot set limit below current user count",
    ],
    user_limit_reached: [
      "تم الوصول للحد الأقصى لمستخدمي هذه الصيدلية. تواصل مع الدعم لزيادة الباقة.",
      "This pharmacy reached its user limit. Contact support to upgrade the plan.",
    ],
    branch_limit_reached: [
      "تم الوصول للحد الأقصى للمخازن. زِد حد المخازن أو غيّر الباقة أولاً.",
      "Warehouse limit reached. Increase the warehouse cap or upgrade the package first.",
    ],
    tier_sync_below_current_branches: [
      "لا يمكن خفض عدد المخازن — بعض العملاء يستخدمون مخازن أكثر من الحد الجديد",
      "Cannot lower warehouse limit — some customers use more warehouses than the new cap",
    ],
    tier_sync_below_current_users: [
      "لا يمكن خفض حد المستخدمين — بعض العملاء لديهم مستخدمون أكثر من الحد الجديد",
      "Cannot lower user limit — some customers have more users than the new cap",
    ],
    anchor_not_found: [
      "تعذر تحديد مجموعة الصيدلية",
      "Could not resolve pharmacy organization",
    ],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  for (const [key, labels] of Object.entries(map)) {
    if (message.includes(key)) return isArabic ? labels[0] : labels[1];
  }
  if (message.startsWith("tier_sync_below_current_branches:")) {
    const parts = message.split(":");
    const used = parts[2] || "?";
    return isArabic
      ? `لا يمكن خفض عدد المخازن — أحد العملاء يستخدم ${used} مخازن`
      : `Cannot lower warehouse limit — a customer already uses ${used} warehouses`;
  }
  if (message.startsWith("tier_sync_below_current_users:")) {
    const parts = message.split(":");
    const used = parts[2] || "?";
    return isArabic
      ? `لا يمكن خفض حد المستخدمين — أحد العملاء لديه ${used} مستخدمين نشطين`
      : `Cannot lower user limit — a customer already has ${used} active users`;
  }
  return message;
}
