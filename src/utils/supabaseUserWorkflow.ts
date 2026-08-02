export function getSupabaseUserWorkflowSteps(isArabic: boolean): string[] {
  return isArabic
    ? [
        "اضغط «إضافة مستخدم» وأدخل الإيميل وكلمة المرور والدور (من تبويب الأدوار)",
        "مدير عام الصيدلية يربط الحساب بالموظف ويحدّد الدور من صفحة الموظفين",
        "أنت تتحكم في حساب المدير العام فقط — لا يستطيع تعديل نفسه",
      ]
    : [
        "Click «Add user» and enter email, password, and role (from the Roles tab)",
        "The pharmacy GM links the account to an employee and sets the role from Staff",
        "You control the General Manager account only — they cannot edit themselves",
      ];
}

export function getSupabaseUserWorkflowSummary(isArabic: boolean): string {
  return isArabic
    ? "مرجع الأدوار: تبويب «أدوار» — حسابات الدخول: إدارة الصيدلية"
    : "Roles catalog: «Roles» tab — login accounts: pharmacy Manage";
}
