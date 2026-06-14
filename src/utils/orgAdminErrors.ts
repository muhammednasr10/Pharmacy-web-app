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
      "تم الوصول للحد الأقصى للفروع. زِد حد الفروع أو غيّر الباقة أولاً.",
      "Branch limit reached. Increase the branch cap or upgrade the package first.",
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
  return message;
}
