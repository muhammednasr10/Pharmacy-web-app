import type { ActivityLog } from "../types";

export const ACTIVITY_LOG_TYPE_OPTIONS = [
  "sale",
  "return",
  "instant_sale_return",
  "return_delete",
  "purchase",
  "purchase_delete",
  "customer_payment",
  "delete_customer_payment",
  "medicine_create",
  "medicine_update",
  "medicine_delete",
  "stock_count",
  "settings_update",
  "user_update",
  "cost_create",
  "cost_update",
  "cost_delete",
  "subscription_request",
  "subscription_renew",
  "hold_invoice",
  "resume_held_invoice",
  "delete_held_invoice",
  "login_account_request_approved",
  "login_account_request_rejected",
  "backup_export",
  "dashboard_export",
  "dashboard_print",
] as const;

export function getActivityTypeLabel(type: string, isArabic: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    sale: { ar: "بيع", en: "Sale" },
    return: { ar: "مرتجع", en: "Return" },
    instant_sale_return: { ar: "مرتجع سريع", en: "Instant Return" },
    return_delete: { ar: "حذف مرتجع", en: "Return Deleted" },
    purchase: { ar: "توريد", en: "Purchase" },
    purchase_delete: { ar: "حذف توريد", en: "Purchase Deleted" },
    customer_payment: { ar: "تحصيل عميل", en: "Customer Payment" },
    delete_customer_payment: { ar: "حذف تحصيل", en: "Payment Deleted" },
    medicine_create: { ar: "إضافة دواء", en: "Medicine Created" },
    medicine_update: { ar: "تعديل دواء", en: "Medicine Updated" },
    medicine_delete: { ar: "حذف دواء", en: "Medicine Deleted" },
    stock_count: { ar: "جرد مخزون", en: "Stock Count" },
    settings_update: { ar: "تعديل إعدادات", en: "Settings Updated" },
    user_update: { ar: "تعديل مستخدم", en: "User Updated" },
    cost_create: { ar: "تسجيل تكلفة", en: "Cost Recorded" },
    cost_update: { ar: "تعديل تكلفة", en: "Cost Updated" },
    cost_delete: { ar: "حذف تكلفة", en: "Cost Deleted" },
    subscription_request: { ar: "طلب اشتراك", en: "Subscription Request" },
    subscription_renew: { ar: "تجديد اشتراك", en: "Subscription Renewed" },
    hold_invoice: { ar: "تعليق فاتورة", en: "Invoice Held" },
    resume_held_invoice: { ar: "استئناف فاتورة", en: "Held Invoice Resumed" },
    delete_held_invoice: { ar: "حذف فاتورة معلقة", en: "Held Invoice Deleted" },
    login_account_request_approved: { ar: "اعتماد حساب دخول", en: "Login Account Approved" },
    login_account_request_rejected: { ar: "رفض حساب دخول", en: "Login Account Rejected" },
    backup_export: { ar: "تصدير نسخة احتياطية", en: "Backup Export" },
    dashboard_export: { ar: "تصدير الداشبورد", en: "Dashboard Export" },
    dashboard_print: { ar: "طباعة الداشبورد", en: "Dashboard Print" },
  };

  const entry = labels[type];
  if (entry) return isArabic ? entry.ar : entry.en;
  return type;
}

export type ActivityLogFilters = {
  search: string;
  type: string;
  branchId: string;
  userName: string;
  fromDate: string;
  toDate: string;
};

export function filterActivityLogs(logs: ActivityLog[], filters: ActivityLogFilters) {
  const searchValue = filters.search.trim().toLowerCase();

  return logs.filter((log) => {
    const matchesSearch =
      !searchValue ||
      String(log.title || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(log.description || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(log.referenceId || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(log.userName || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(log.type || "")
        .toLowerCase()
        .includes(searchValue);

    const matchesType = filters.type === "all" || log.type === filters.type;
    const matchesBranch = filters.branchId === "all" || (log.pharmacyId || "") === filters.branchId;
    const matchesUser = filters.userName === "all" || (log.userName || "") === filters.userName;

    const logDate = new Date(log.createdAt);
    const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
    const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;
    const matchesFrom = !fromDate || logDate >= fromDate;
    const matchesTo = !toDate || logDate <= toDate;

    return matchesSearch && matchesType && matchesBranch && matchesUser && matchesFrom && matchesTo;
  });
}

export function buildActivityLogSummary(logs: ActivityLog[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const typeCounts = new Map<string, number>();
  let todayCount = 0;

  logs.forEach((log) => {
    typeCounts.set(log.type, (typeCounts.get(log.type) || 0) + 1);
    const created = new Date(log.createdAt);
    if (!Number.isNaN(created.getTime()) && created >= today) {
      todayCount += 1;
    }
  });

  const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    total: logs.length,
    todayCount,
    uniqueUsers: new Set(logs.map((log) => log.userName).filter(Boolean)).size,
    topTypes,
  };
}

export function listActivityLogUsers(logs: ActivityLog[]) {
  return [...new Set(logs.map((log) => log.userName).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}
