export const PROGRAM_PAGES = [
  {
    key: "dashboard",
    ar: "لوحة التحكم",
    en: "Dashboard",
    descAr: "ملخص اليوم: مبيعات، تنبيهات مخزون، وخطوات البداية.",
    descEn: "Today's overview: sales, stock alerts, and getting-started steps.",
    hasCheckbox: false,
  },
  {
    key: "inventory",
    ar: "إدارة المخزن",
    en: "Inventory",
    descAr: "إضافة الأدوية، الجرد، الاستيراد، ومتابعة الصلاحية والرصيد.",
    descEn: "Add medicines, stock counts, import, expiry and quantity tracking.",
    hasCheckbox: false,
  },
  {
    key: "pos",
    ar: "نقطة البيع",
    en: "POS",
    descAr: "بيع سريع بالباركود أو الاسم، مع الورديات والدفع النقدي/الفيزا.",
    descEn: "Fast sales by barcode or name, with shifts and cash/card payment.",
    hasCheckbox: false,
  },
  {
    key: "invoices",
    ar: "المبيعات",
    en: "Sales",
    descAr: "سجل الفواتير والبحث والطباعة ومتابعة طرق الدفع.",
    descEn: "Invoice history, search, printing, and payment methods.",
    hasCheckbox: false,
  },
  {
    key: "purchases",
    ar: "المشتريات",
    en: "Purchases",
    descAr: "تسجيل توريد الأدوية للمخزن وتحديث الأسعار والكميات.",
    descEn: "Record stock purchases and update prices and quantities.",
    hasCheckbox: false,
  },
  {
    key: "customers",
    ar: "العملاء",
    en: "Customers",
    descAr: "CRM بسيط: بيانات العملاء والمديونيات والتحصيل.",
    descEn: "Simple CRM: customer data, debts, and collections.",
    hasCheckbox: false,
  },
  {
    key: "reports",
    ar: "التقارير",
    en: "Reports",
    descAr: "مبيعات وأرباح وتكاليف حسب الفترة والطريقة والفرع.",
    descEn: "Sales, profit, and costs by period, method, and branch.",
    hasCheckbox: false,
  },
  {
    key: "users",
    ar: "الموظفين",
    en: "Staff",
    descAr: "حسابات الموظفين والصلاحيات — تُفعَّل كإضافة في الحاسبة.",
    descEn: "Staff accounts and permissions — enabled as a calculator add-on.",
    hasCheckbox: true,
  },
  {
    key: "branches",
    ar: "الفروع والمخازن",
    en: "Branches & warehouses",
    descAr: "تبديل الفرع من الشريط العلوي، وبيانات الفروع ونقل المخزون من إدارة المخزن.",
    descEn: "Switch branch from the top bar; branch data and stock transfers live in Inventory.",
    hasCheckbox: false,
  },
  {
    key: "settings",
    ar: "الإعدادات",
    en: "Settings",
    descAr: "بيانات الصيدلية والاشتراك وتفضيلات النظام.",
    descEn: "Pharmacy profile, subscription, and system preferences.",
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
