/** Production-like main branch ids that should not be wiped by QA imports. */
const PROTECTED_BRANCH_IDS = new Set(["main", "default-pharmacy"]);

export function isProtectedProductionBranch(pharmacyId: string | null | undefined): boolean {
  const id = String(pharmacyId || "").trim().toLowerCase();
  if (!id) return false;
  return PROTECTED_BRANCH_IDS.has(id);
}

export function catalogReplaceGuardMessage(isArabic: boolean, pharmacyId: string): string {
  const branch = pharmacyId || "main";
  return isArabic
    ? `فرع «${branch}» محمٍ من استبدال الكتالوج بالكامل. استخدم فرع اختبار (مثل QA) أو ألغِ خيار الاستبدال.`
    : `Branch "${branch}" is protected from full catalog replace. Use a QA/test branch or turn off replace.`;
}
