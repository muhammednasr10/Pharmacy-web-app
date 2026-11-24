export type UserGuideSection = {
  id: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string[];
  bodyEn: string[];
  tipsAr?: string[];
  tipsEn?: string[];
};

export const USER_GUIDE_SECTIONS: UserGuideSection[] = [
  {
    id: "start",
    icon: "🚀",
    titleAr: "البداية وتسجيل الدخول",
    titleEn: "Getting started & sign-in",
    bodyAr: [
      "ادخل بالإيميل وكلمة المرور من صفحة الدخول.",
      "تسجيل صيدلية جديدة يبدأ فترة تجريبية — أكمل بيانات الصيدلية من الإعدادات بعد الدخول.",
      "الموظف الجديد يسجّل دخوله مرة واحدة ثم يطلب من المدير ربط حسابه من صفحة الموظفين → زر «حسابات الدخول».",
    ],
    bodyEn: [
      "Sign in with email and password from the login page.",
      "New pharmacy registration starts a trial — complete pharmacy details in Settings after sign-in.",
      "New staff sign in once, then ask the manager to link their account from Staff → «Login accounts».",
    ],
    tipsAr: ["من صفحة «صيدلية جديدة» تُفتح نسخة تجربة تلقائياً بعد التسجيل."],
    tipsEn: ["From «New pharmacy» a trial workspace opens automatically after signup."],
  },
  {
    id: "dashboard",
    icon: "🏠",
    titleAr: "لوحة التحكم",
    titleEn: "Dashboard",
    bodyAr: [
      "ملخص المبيعات، النواقص، الأدوية المنتهية، وديون العملاء.",
      "من هنا تصل سريعاً للصفحات المسموح لك بها حسب دورك.",
      "إن ظهرت بطاقة ترقية الباقة، اضغط «ترقية» أو افتح الإعدادات → الاشتراك.",
    ],
    bodyEn: [
      "Overview of sales, low stock, expiring medicines, and customer debt.",
      "Quick entry to pages allowed for your role.",
      "If an upgrade card appears, use Upgrade or Settings → Subscription.",
    ],
  },
  {
    id: "pos",
    icon: "💳",
    titleAr: "نقطة البيع",
    titleEn: "Point of sale",
    bodyAr: [
      "امسح الباركود أو ابحث عن الدواء ثم أضفه للسلة.",
      "اختر طريقة الدفع وأتمم البيع — يمكن تعليق الفاتورة أو استرجاع فاتورة سابقة.",
      "راجع تبويب الاختصارات في هذا الدليل لاختصارات F1–F9 و Ctrl+Enter.",
    ],
    bodyEn: [
      "Scan a barcode or search for a medicine, then add it to the cart.",
      "Pick payment method and complete the sale — hold invoices or process returns as needed.",
      "See the Shortcuts tab in this guide for F1–F9 and Ctrl+Enter.",
    ],
  },
  {
    id: "inventory",
    icon: "🧬",
    titleAr: "المخزون والمشتريات",
    titleEn: "Inventory & purchases",
    bodyAr: [
      "أضف أو عدّل الأدوية، راقب الكميات وتواريخ الصلاحية.",
      "المشتريات تزيد المخزون تلقائياً بعد اعتماد التوريد.",
      "حركة المخزون تعرض كل الإضافات والخصومات حسب الفرع.",
    ],
    bodyEn: [
      "Add or edit medicines; monitor quantities and expiry dates.",
      "Purchases increase stock automatically after confirmation.",
      "Stock movements list all additions and deductions per branch.",
    ],
  },
  {
    id: "staff",
    icon: "👥",
    titleAr: "الموظفين والصلاحيات",
    titleEn: "Staff & permissions",
    bodyAr: [
      "كيف تضيف موظفاً: افتح «الموظفين» → اضغط «+ إضافة موظف» → اكتب الاسم والكود والهاتف وتاريخ التعيين → اختر الشيفت (أ / ب / ج) إن لزم → احفظ.",
      "بعد الحفظ: من نفس الصفحة افتح «مستخدمي الدخول» وأنشئ حساب دخول للموظف ضمن الحد التعاقدي للمستخدمين؛ لو وصلت للحد اطلب زيادة من مالك النظام.",
      "كيف تضبط إعداداته: من كارت الموظف عدّل الراتب/العمولة/الشيفت أو فعّل جدول عمل مخصص إن احتجت ساعات مختلفة عن شيفت الصيدلية.",
      "إعدادات عامة للفريق: من «الإعدادات» → «إعدادات الموظفين» اضبط موقع الحضور (GPS) وأدوار الصيدلية وإعدادات المرتبات؛ ومن «مواعيد العمل» اضبط خطة أيام العمل وتقسيم الشيفتات أ / ب / ج؛ وتنبيهات المخزون من «إعدادات المخزن».",
      "الحضور والبروفايل: الموظف يدخل من «بروفايلى» لتسجيل الحضور/الانصراف وطلب إجازة أو إذن — يظهر ذلك للمدير في قسم الموظفين/HR.",
      "عدد المستخدمين النشطين محدود حسب باقة الاشتراك؛ المدير يعدّل صلاحيات الأدوار من تبويب الأدوار داخل الموظفين.",
    ],
    bodyEn: [
      "How to add an employee: open Staff → «+ Add Employee» → enter name, code, phone, hire date → pick shift (A / B / C) if needed → save.",
      "After saving: open «Login users» and create a login account within your contracted user limit; if the limit is reached, request an increase from the system owner.",
      "How to configure them: from the employee card edit salary/commission/shift, or enable a custom work schedule if their hours differ from the pharmacy shift.",
      "Team-wide settings: Settings → Employee Settings for attendance GPS, pharmacy roles, and payroll rules; Settings → Work Hours for the weekly work-day plan and A / B / C shifts; inventory alerts live under Store Settings.",
      "Attendance & profile: the employee uses My Profile to check in/out and request leave — managers see that under Staff/HR.",
      "Active users count toward your plan limit; admins customize role permissions in the Staff roles tab.",
    ],
    tipsAr: [
      "لو الحضور بالـ GPS مش شغال: راجع الإحداثيات ونطاق الأمتار من الإعدادات → إعدادات الموظفين.",
      "لو الموظف يتأخر دائماً: راجع «حد التأخير المسموح» لكل شيفت من الإعدادات → مواعيد العمل.",
    ],
    tipsEn: [
      "If GPS attendance fails: check coordinates and radius in Settings → Employee Settings.",
      "If staff are often marked late: review allowed lateness per shift in Settings → Work Hours.",
    ],
  },
  {
    id: "branches",
    icon: "🏢",
    titleAr: "الفروع والاشتراك",
    titleEn: "Branches & subscription",
    bodyAr: [
      "الباقة الأساسية: فرع واحد. الاحترافي والفاخر: فروع متعددة ونقل مخزون.",
      "غيّر الباقة من الإعدادات → الاشتراك أو زر «ترقية» أعلى الشاشة.",
      "مدير الفرع يرى فرعه فقط؛ المدير العام يتنقل بين الفروع من القائمة العلوية.",
    ],
    bodyEn: [
      "Basic: one branch. Professional/Premium: multiple branches and stock transfers.",
      "Change plan in Settings → Subscription or the Upgrade button in the top bar.",
      "Branch managers see their branch; org admin switches branches from the top bar.",
    ],
  },
  {
    id: "settings",
    icon: "⚙️",
    titleAr: "الإعدادات والنسخ الاحتياطي",
    titleEn: "Settings & backup",
    bodyAr: [
      "حدّث اسم الصيدلية، الهاتف، الشعار، وتنبيهات انتهاء الصلاحية.",
      "من الإعدادات يمكن تصدير نسخة احتياطية ومراجعة الاشتراك.",
      "للدعم الفني أو ترقية الباقة، استخدم بيانات التواصل في صفحة الاشتراك.",
    ],
    bodyEn: [
      "Update pharmacy name, phone, logo, and expiry alerts.",
      "Export backups and review subscription from Settings.",
      "Use subscription page contact details for support or upgrades.",
    ],
  },
  {
    id: "pilot-qa",
    icon: "✅",
    titleAr: "قائمة فحص قبل التشغيل (Pilot)",
    titleEn: "Pre-launch pilot checklist",
    bodyAr: [
      "قبل ربط صيدلية جديدة أو بعد أي تحديث مهم، نفّذ هذه الفحوصات يدوياً.",
      "تسجيل الدخول: أدمن + كاشير — وتأكد أن الكاشير لا يفتح الإعدادات أو صلاحيات الموظفين.",
      "نقطة البيع: افتح وردية → أضف دواء → أتمم البيع → طباعة PDF → جرّب مرتجع.",
      "المخزون: تأكد أن البيع يخصم والشراء يزيد الكمية.",
      "الحضور: سجّل حضور موظف (GPS أو QR) وتحقق من ظهوره في HR.",
      "الاشتراك: حالة التجربة/الباقة صحيحة وصفحات الباقة الأعلى مقفلة برسالة واضحة.",
    ],
    bodyEn: [
      "Before onboarding a new pharmacy or after a major release, run these manual checks.",
      "Sign-in: admin + cashier — cashier must not access Settings or staff permissions.",
      "POS: open shift → add item → complete sale → PDF → try a return.",
      "Inventory: sale deducts stock; purchase increases stock.",
      "Attendance: record employee check-in (GPS or QR) and verify in HR.",
      "Subscription: trial/plan status is correct and locked pages show a clear upgrade message.",
    ],
    tipsAr: ["من الطرفية: npm run qa:checklist — npm test — npm run build"],
    tipsEn: ["From terminal: npm run qa:checklist — npm test — npm run build"],
  },
];
