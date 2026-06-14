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
      "ادخل بالإيميل وكلمة المرور أو عبر Google من صفحة الدخول.",
      "تسجيل صيدلية جديدة يبدأ فترة تجريبية — أكمل بيانات الصيدلية من الإعدادات بعد الدخول.",
      "الموظف الجديد يسجّل دخوله مرة واحدة ثم يطلب من المدير ربط حسابه من تبويب الموظفين / حسابات الدخول.",
    ],
    bodyEn: [
      "Sign in with email and password or Google from the login page.",
      "New pharmacy registration starts a trial — complete pharmacy details in Settings after sign-in.",
      "New staff sign in once, then ask the manager to link their account from Staff / Login accounts.",
    ],
    tipsAr: ["استخدم بريداً حقيقياً (Gmail / Outlook) عند التسجيل."],
    tipsEn: ["Use a real email (Gmail / Outlook) when registering."],
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
      "أضف الموظفين من تبويب الموظفين، ثم اربط حساب الدخول (إيميل Google أو عادي).",
      "عدد المستخدمين النشطين محدود حسب باقة الاشتراك.",
      "المدير العام يعدّل صلاحيات الأدوار من تبويب صلاحيات الموظفين.",
    ],
    bodyEn: [
      "Add employees under Staff, then link login accounts (Google or email).",
      "Active users count toward your subscription plan limit.",
      "Pharmacy admin can customize role permissions in Staff permissions.",
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
];
