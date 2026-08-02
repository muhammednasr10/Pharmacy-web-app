import type { CustomerDebt, Invoice, Medicine, Page } from "../types";
import { buildNavigationItems } from "./navigation";
import { pageIcons } from "./navigation";
import { medicineMatchesInventorySearch } from "./medicineLookup";

export type GlobalSearchResultType = "page" | "medicine" | "invoice" | "customer";

export type GlobalSearchResult =
  | {
      id: string;
      type: "page";
      title: string;
      subtitle?: string;
      icon: string;
      page: Page;
    }
  | {
      id: string;
      type: "medicine";
      title: string;
      subtitle?: string;
      icon: string;
      medicine: Medicine;
      searchText: string;
    }
  | {
      id: string;
      type: "invoice";
      title: string;
      subtitle?: string;
      icon: string;
      invoice: Invoice;
    }
  | {
      id: string;
      type: "customer";
      title: string;
      subtitle?: string;
      icon: string;
      customerName: string;
    };

const PAGE_KEYWORDS: Partial<Record<Page, string[]>> = {
  dashboard: ["لوحة", "home", "رئيسية"],
  inventory: ["مخزون", "stock", "أدوية", "medicines"],
  pos: ["بيع", "كاشير", "cashier", "نقطة"],
  invoices: ["فواتير", "فاتورة", "مبيعات", "sales"],
  returns: ["مرتجع", "return"],
  purchases: ["مشتريات", "شراء", "purchase"],
  costs: ["تكاليف", "مصروف", "costs"],
  customers: ["عملاء", "عميل", "customer", "ديون"],
  reports: ["تقارير", "report"],
  stockMovements: ["حركة", "movement"],
  activityLogs: ["سجل", "نشاط", "audit", "log"],
  users: ["موظف", "مستخدم", "staff", "hr"],
  branches: ["فرع", "فروع", "branch"],
  tenants: ["saas", "صيدليات", "tenant"],
  sqlMigrations: ["sql", "migration", "قاعدة"],
  settings: ["إعدادات", "settings", "اشتراك"],
  userGuide: ["دليل", "مساعدة", "help", "guide", "اختصارات", "shortcuts"],
  hr: ["موارد", "حضور", "hr"],
  employeePortal: ["حضوري", "portal", "attendance"],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matches(value: string, query: string) {
  return normalize(value).includes(normalize(query));
}

type BuildGlobalSearchOptions = {
  query: string;
  isArabic: boolean;
  t: Record<string, string>;
  allowedPages: Page[];
  medicines: Medicine[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  canSearchMedicines: boolean;
  canSearchInvoices: boolean;
  canSearchCustomers: boolean;
};

export function buildGlobalSearchResults({
  query,
  isArabic,
  t,
  allowedPages,
  medicines,
  invoices,
  customerDebts,
  canSearchMedicines,
  canSearchInvoices,
  canSearchCustomers,
}: BuildGlobalSearchOptions): GlobalSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  for (const item of buildNavigationItems(allowedPages, isArabic, t)) {
    const keywords = PAGE_KEYWORDS[item.page] || [];
    const haystack = [item.label, item.page, ...keywords].join(" ");
    if (!matches(haystack, q)) continue;
    results.push({
      id: `page-${item.page}`,
      type: "page",
      title: item.label,
      subtitle: isArabic ? "انتقال إلى الصفحة" : "Go to page",
      icon: pageIcons[item.page] || "•",
      page: item.page,
    });
  }

  if (canSearchMedicines) {
    medicines
      .filter((medicine) => medicineMatchesInventorySearch(medicine, q))
      .slice(0, 8)
      .forEach((medicine) => {
        results.push({
          id: `medicine-${medicine.id}`,
          type: "medicine",
          title: isArabic ? medicine.name_ar : medicine.name_en || medicine.name_ar,
          subtitle: [
            medicine.barcode,
            isArabic ? `الكمية: ${medicine.qty}` : `Qty: ${medicine.qty}`,
          ].join(" · "),
          icon: "💊",
          medicine,
          searchText: isArabic ? medicine.name_ar : medicine.name_en || medicine.name_ar,
        });
      });
  }

  if (canSearchInvoices) {
    invoices
      .filter((invoice) => {
        const number = String(invoice.invoiceNumber || invoice.id || "");
        const customer = String(invoice.customerName || "");
        const cashier = String((invoice as Invoice & { cashierName?: string }).cashierName || "");
        return matches(number, q) || matches(customer, q) || matches(cashier, q);
      })
      .slice(0, 8)
      .forEach((invoice) => {
        results.push({
          id: `invoice-${invoice.invoiceNumber || invoice.id}`,
          type: "invoice",
          title: `${isArabic ? "فاتورة" : "Invoice"} #${invoice.invoiceNumber || invoice.id}`,
          subtitle: [
            invoice.customerName || (isArabic ? "بدون عميل" : "No customer"),
            invoice.total != null ? `${invoice.total}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          icon: "🧾",
          invoice,
        });
      });
  }

  if (canSearchCustomers) {
    customerDebts
      .filter((row) => matches(row.customerName, q))
      .slice(0, 8)
      .forEach((row) => {
        results.push({
          id: `customer-${row.customerName}`,
          type: "customer",
          title: row.customerName,
          subtitle: isArabic
            ? `متبقي: ${row.remainingDebt ?? 0}`
            : `Remaining: ${row.remainingDebt ?? 0}`,
          icon: "👤",
          customerName: row.customerName,
        });
      });
  }

  return results;
}

export function groupGlobalSearchResults(results: GlobalSearchResult[]) {
  const groups: {
    id: GlobalSearchResultType;
    labelAr: string;
    labelEn: string;
    items: GlobalSearchResult[];
  }[] = [
    { id: "page", labelAr: "الصفحات", labelEn: "Pages", items: [] },
    { id: "medicine", labelAr: "الأدوية", labelEn: "Medicines", items: [] },
    { id: "invoice", labelAr: "الفواتير", labelEn: "Invoices", items: [] },
    { id: "customer", labelAr: "العملاء", labelEn: "Customers", items: [] },
  ];

  for (const result of results) {
    const group = groups.find((row) => row.id === result.type);
    group?.items.push(result);
  }

  return groups.filter((group) => group.items.length > 0);
}
