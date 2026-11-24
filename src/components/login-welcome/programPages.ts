export const PROGRAM_PAGES = [
  {
    key: "dashboard",
    ar: "لوحة التحكم",
    en: "Dashboard",
    descAr: "أول شاشة بعد الدخول — صورة سريعة عن شغل اليوم بدون تعقيد.",
    descEn: "Your home screen after login — a simple snapshot of today’s work.",
    pointsAr: [
      "تشوف مبيعات اليوم وعدد الفواتير في لمحة",
      "تنبيهات للنواقص والأدوية قرب انتهاء الصلاحية",
      "اختصارات لفتح البيع أو المخزون أو التقارير",
      "خطوات واضحة لو الصيدلية لسه جديدة",
    ],
    pointsEn: [
      "See today’s sales and invoice count at a glance",
      "Alerts for low stock and near-expiry medicines",
      "Shortcuts to POS, inventory, or reports",
      "Clear next steps for a new pharmacy",
    ],
    hasCheckbox: false,
  },
  {
    key: "inventory",
    ar: "إدارة المخزن",
    en: "Inventory",
    descAr: "مكان الأدوية كلها: تضيف، تعدّل، تجرد، وتتابع الرصيد والصلاحية.",
    descEn: "Where all medicines live: add, edit, count, and track stock and expiry.",
    pointsAr: [
      "إضافة دواء يدويًا أو استيراد قاعدة بيانات أدوية",
      "بحث بالاسم أو الباركود ومتابعة الكمية وسعر البيع والشراء",
      "جرد المخزون وتسجيل أي فرق بين الفعلي والنظام",
      "حركة المخزون: مبيعات، توريد، تعديلات، ونقل بين الفروع",
    ],
    pointsEn: [
      "Add medicines manually or import a drug catalog",
      "Search by name or barcode; track qty, buy and sell prices",
      "Run stock counts and record any differences",
      "See stock movements: sales, purchases, edits, and transfers",
    ],
    hasCheckbox: false,
  },
  {
    key: "pos",
    ar: "نقطة البيع",
    en: "POS",
    descAr: "شاشة البيع اليومية للكاشير — سريعة ومرتبة من فتح الوردية لحد الفاتورة.",
    descEn: "The daily cashier screen — fast from opening a shift to printing the receipt.",
    pointsAr: [
      "فتح وردية برصيد صندوق (والصفر مسموح)",
      "بيع بالباركود أو بالبحث بالاسم",
      "دفع نقدي أو فيزا أو محفظة أو آجل",
      "تعليق فاتورة والرجوع ليها، وإغلاق الوردية بتقرير الصندوق",
    ],
    pointsEn: [
      "Open a cashier shift with drawer cash (zero allowed)",
      "Sell by barcode scan or name search",
      "Pay with cash, card, wallet, or credit",
      "Hold invoices and close the shift with a cash report",
    ],
    hasCheckbox: false,
  },
  {
    key: "invoices",
    ar: "المبيعات",
    en: "Sales",
    descAr: "فواتير البيع والمرتجعات في مجموعة «الفواتير» داخل البرنامج — مراجعة وطباعة ومرتجع.",
    descEn: "Sales invoices and returns live under Invoices in the app — review, print, or return.",
    pointsAr: [
      "عرض الفواتير والبحث بالتاريخ أو طريقة الدفع",
      "فتح تفاصيل أي فاتورة وطباعتها من جديد",
      "عمل مرتجع على فاتورة ورجوع الكمية للمخزن",
      "متابعة إجماليات الفترة بسرعة",
    ],
    pointsEn: [
      "Browse invoices and filter by date or payment method",
      "Open any invoice and reprint it",
      "Create a return and restock quantities",
      "Check period totals quickly",
    ],
    hasCheckbox: false,
  },
  {
    key: "purchases",
    ar: "المشتريات",
    en: "Purchases",
    descAr: "تسجيل التوريد من الموردين ورفع كميات المخزن بأسعار الشراء الصحيحة.",
    descEn: "Record supplier deliveries and raise stock with the right buy prices.",
    pointsAr: [
      "إنشاء فاتورة توريد بأصناف وكميات",
      "تحديث سعر الشراء والكمية تلقائيًا في المخزن",
      "اقتراحات توريد للأصناف الناقصة",
      "سجل واضح لكل عمليات الشراء",
    ],
    pointsEn: [
      "Create a purchase invoice with items and quantities",
      "Buy price and stock quantity update automatically",
      "Reorder suggestions for low-stock items",
      "A clear history of all purchases",
    ],
    hasCheckbox: false,
  },
  {
    key: "reports",
    ar: "التقارير",
    en: "Reports",
    descAr: "تعرف شغلك بالأرقام: مبيعات، ربح، وتكاليف حسب الفترة اللي تختارها.",
    descEn: "See the numbers: sales, profit, and costs for any period you choose.",
    pointsAr: [
      "ملخص مبيعات اليوم أو الأسبوع أو الشهر",
      "مجمل الربح وتكاليف الشراء",
      "فلترة حسب طريقة الدفع أو الفرع",
      "تصدير التقرير عند الحاجة",
    ],
    pointsEn: [
      "Sales summary for today, week, or month",
      "Gross profit and purchase costs",
      "Filter by payment method or branch",
      "Export when you need a file",
    ],
    hasCheckbox: false,
  },
  {
    key: "customers",
    ar: "العملاء",
    en: "Customers",
    descAr: "دفتر عملاء بسيط: بيانات، مديونية، وتحصيل — كإضافة اختيارية بالاشتراك.",
    descEn: "A simple customer book: details, balances, and collections — as a paid subscription add-on.",
    pointsAr: [
      "حفظ بيانات العميل ورقم التليفون",
      "متابعة المديونية من البيع الآجل",
      "تسجيل تحصيل نقدي أو جزئي",
      "تُفعَّل من تشيك بوكس «العملاء» في حاسبة الاشتراك",
    ],
    pointsEn: [
      "Save customer name and phone",
      "Track credit balances from credit sales",
      "Record full or partial collections",
      "Enable from the Customers checkbox in the subscription calculator",
    ],
    hasCheckbox: true,
  },
  {
    key: "users",
    ar: "الموظفين",
    en: "Staff",
    descAr: "إدارة فريق الصيدلية: حسابات، صلاحيات، وحضور — إضافة بالاشتراك (مع بروفايلى بنفس السعر).",
    descEn: "Manage your team: accounts, permissions, and attendance — a paid add-on (My Profile included in the same price).",
    pointsAr: [
      "إنشاء حسابات للكاشير والمدير وموظفين آخرين",
      "تحديد صلاحيات كل دور (بيع، مخزون، تقارير…)",
      "متابعة الحضور والانصراف",
      "تشمل صفحة «بروفايلى» بدون سعر إضافي — تُفعَّل من تشيك بوكس الموظفين",
    ],
    pointsEn: [
      "Create accounts for cashiers, managers, and staff",
      "Set role permissions (sales, inventory, reports…)",
      "Track check-in and check-out",
      "Includes My Profile at no extra cost — enable from the Staff checkbox",
    ],
    hasCheckbox: true,
  },
  {
    key: "employeePortal",
    ar: "بروفايلى",
    en: "My Profile",
    descAr: "صفحة الموظف الشخصية: حضور، إذن، وإجازة — متعلّمة بالأحمر لأنها ضمن إضافة الموظفين بالاشتراك.",
    descEn: "Employee self-service: attendance, leave, and requests — marked red because it comes with the paid Staff add-on.",
    pointsAr: [
      "تسجيل الحضور والانصراف من الموبايل أو الجهاز",
      "طلب إجازة أو إذن ومتابعة الحالة",
      "عرض شيفت الموظف وخطة أيام العمل",
      "نفس تشيك بوكس «الموظفين» في الحاسبة — مفيش سعر لوحده",
    ],
    pointsEn: [
      "Check in and out from phone or desktop",
      "Request leave or early leave and track status",
      "See your shift and work-day plan",
      "Same Staff checkbox in the calculator — no separate price",
    ],
    hasCheckbox: true,
  },
  {
    key: "costs",
    ar: "الاستثمار",
    en: "Investment",
    descAr: "خطة الاستثمار والتكاليف التشغيلية ومتابعة العائد — إضافة اختيارية بالاشتراك.",
    descEn: "Investment plan, operating costs, and return tracking — a paid subscription add-on.",
    pointsAr: [
      "تسجيل خطط استثمار وتكاليف تشغيلية",
      "متابعة المنفذ مقابل المخطط شهريًا",
      "مؤشرات العائد وصافي الربح بعد التكاليف",
      "تُفعَّل من تشيك بوكس «الاستثمار» في حاسبة الاشتراك",
    ],
    pointsEn: [
      "Record investment plans and operating costs",
      "Track planned vs actual amounts monthly",
      "Return and net profit after costs indicators",
      "Enable from the Investment checkbox in the subscription calculator",
    ],
    hasCheckbox: true,
  },
  {
    key: "branches",
    ar: "الفروع والمخازن",
    en: "Branches & warehouses",
    descAr: "لو عندك أكتر من فرع: كل فرع له مخزنه — الإدارة والنقل من داخل إدارة المخزن في البرنامج.",
    descEn: "Multi-branch stock per location — manage and transfer from Inventory inside the app.",
    pointsAr: [
      "كل فرع له مخزون وفواتير منفصلة",
      "تبديل الفرع النشط من الشريط العلوي",
      "بيانات الفروع ونقل الأصناف من إدارة المخزن",
      "حد الفروع حسب الباقة",
    ],
    pointsEn: [
      "Each branch has its own stock and invoices",
      "Switch the active branch from the top bar",
      "Branch data and transfers live inside Inventory",
      "Branch limits follow your plan",
    ],
    hasCheckbox: false,
  },
  {
    key: "settings",
    ar: "الإعدادات",
    en: "Settings",
    descAr: "ضبط بيانات الصيدلية والاشتراك وتفضيلات التشغيل من مكان واحد.",
    descEn: "Pharmacy profile, subscription, and operating preferences in one place.",
    pointsAr: [
      "اسم الصيدلية والعنوان والتليفون",
      "متابعة الاشتراك والتجربة والترقية",
      "تفضيلات النظام وطرق الدفع المعروضة",
      "إعدادات تخص صلاحيات الفريق عند تفعيل الموظفين",
    ],
    pointsEn: [
      "Pharmacy name, address, and phone",
      "Subscription, trial, and upgrade status",
      "System preferences and payment methods shown",
      "Team permission settings when Staff is enabled",
    ],
    hasCheckbox: false,
  },
] as const;

export type ProgramPage = (typeof PROGRAM_PAGES)[number];
export type ProgramPageKey = ProgramPage["key"];

export function formatMonthlyPrice(amount: number, isArabic: boolean) {
  const value = Math.max(0, Math.round(amount));
  return isArabic
    ? `${value.toLocaleString("ar-EG")} ج.م / شهر`
    : `${value.toLocaleString("en-EG")} EGP / month`;
}

export function formatBillingPrice(
  amount: number,
  billingCycle: "monthly" | "yearly",
  isArabic: boolean,
) {
  const value = Math.max(0, Math.round(amount));
  if (billingCycle === "yearly") {
    return isArabic
      ? `${value.toLocaleString("ar-EG")} ج.م / سنة`
      : `${value.toLocaleString("en-EG")} EGP / year`;
  }
  return formatMonthlyPrice(value, isArabic);
}
