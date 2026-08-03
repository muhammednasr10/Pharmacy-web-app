import { useMemo } from "react";
import { formatMoney } from "../../utils/formatMoney";
import type { DashboardPageProps, ModuleCard, QuickAction } from "./types";
import type { Page } from "../../types";

type UseDashboardModulesArgs = Pick<
  DashboardPageProps,
  | "allowedPages"
  | "isArabic"
  | "t"
  | "totalMedicinesCount"
  | "lowStockCount"
  | "dashboardSalesTotal"
  | "dashboardInvoicesCount"
  | "totalInvoicesCount"
  | "totalPurchasesCount"
  | "totalReturnsCount"
  | "totalCustomerRemainingDebt"
  | "totalCustomerPayments"
  | "dashboardProfitTotal"
  | "branchesCount"
  | "onOpenInventory"
  | "onOpenPOS"
  | "onOpenPurchases"
  | "onOpenCustomerPayments"
  | "onNavigate"
>;

export function useDashboardModules({
  allowedPages,
  isArabic,
  t,
  totalMedicinesCount,
  lowStockCount,
  dashboardSalesTotal,
  dashboardInvoicesCount,
  totalInvoicesCount,
  totalPurchasesCount,
  totalReturnsCount,
  totalCustomerRemainingDebt,
  totalCustomerPayments,
  dashboardProfitTotal,
  branchesCount,
  onOpenInventory,
  onOpenPOS,
  onOpenPurchases,
  onOpenCustomerPayments,
  onNavigate,
}: UseDashboardModulesArgs) {
  const canAccess = (page: Page) => allowedPages.includes(page);

  const modules = useMemo(() => {
    const cards: ModuleCard[] = [];

    if (canAccess("inventory")) {
      cards.push({
        key: "inventory",
        icon: "🧬",
        label: isArabic ? "الأدوية بالمخزون" : "Medicines in Stock",
        value: String(totalMedicinesCount),
        sub: isArabic ? `${lowStockCount} صنف ناقص` : `${lowStockCount} low stock`,
        tone: "green",
        onClick: () => onOpenInventory("all"),
      });
    }

    if (canAccess("pos")) {
      cards.push({
        key: "sales",
        icon: "💳",
        label: isArabic ? "مبيعات اليوم" : "Today's Sales",
        value: `${formatMoney(dashboardSalesTotal)} ${t.currency}`,
        sub: isArabic ? `${dashboardInvoicesCount} فاتورة` : `${dashboardInvoicesCount} invoices`,
        tone: "blue",
        onClick: onOpenPOS,
      });
    }

    if (canAccess("invoices")) {
      cards.push({
        key: "invoices",
        icon: "🧾",
        label: isArabic ? "إجمالي الفواتير" : "Total Invoices",
        value: String(totalInvoicesCount),
        tone: "indigo",
        onClick: () => onNavigate("invoices"),
      });
    }

    if (canAccess("purchases")) {
      cards.push({
        key: "purchases",
        icon: "📦",
        label: isArabic ? "عمليات التوريد" : "Purchases",
        value: String(totalPurchasesCount),
        tone: "teal",
        onClick: onOpenPurchases,
      });
    }

    if (canAccess("returns")) {
      cards.push({
        key: "returns",
        icon: "↩️",
        label: isArabic ? "المرتجعات" : "Returns",
        value: String(totalReturnsCount),
        tone: "orange",
        onClick: () => onNavigate("returns"),
      });
    }

    if (canAccess("customers")) {
      cards.push({
        key: "debts",
        icon: "👥",
        label: isArabic ? "مديونيات العملاء" : "Customer Debts",
        value: `${formatMoney(totalCustomerRemainingDebt)} ${t.currency}`,
        sub: isArabic
          ? `محصّل: ${formatMoney(totalCustomerPayments)} ${t.currency}`
          : `Collected: ${formatMoney(totalCustomerPayments)} ${t.currency}`,
        tone: "red",
        onClick: onOpenCustomerPayments,
      });
    }

    if (canAccess("reports")) {
      cards.push({
        key: "profit",
        icon: "📊",
        label: isArabic ? "ربح الفترة" : "Period Profit",
        value: `${formatMoney(dashboardProfitTotal)} ${t.currency}`,
        sub: isArabic ? "افتح التقارير" : "Open reports",
        tone: "green",
        onClick: () => onNavigate("reports"),
      });
    }

    if (canAccess("branches") && branchesCount > 1) {
      cards.push({
        key: "branches",
        icon: "🏢",
        label: isArabic ? "الفروع" : "Branches",
        value: String(branchesCount),
        tone: "indigo",
        onClick: () => onNavigate("branches"),
      });
    }

    return cards;
  }, [
    allowedPages,
    isArabic,
    t.currency,
    totalMedicinesCount,
    lowStockCount,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    totalInvoicesCount,
    totalPurchasesCount,
    totalReturnsCount,
    totalCustomerRemainingDebt,
    totalCustomerPayments,
    dashboardProfitTotal,
    branchesCount,
    onOpenInventory,
    onOpenPOS,
    onOpenPurchases,
    onOpenCustomerPayments,
    onNavigate,
  ]);

  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [];

    if (canAccess("employeePortal")) {
      actions.push({
        key: "employee-portal",
        title: isArabic ? "بروفايلى" : "My Profile",
        hint: isArabic ? "تسجيل حضور وطلبات" : "Check-in & requests",
        onClick: () => onNavigate("employeePortal"),
      });
    }

    if (canAccess("pos")) {
      actions.push({
        key: "pos",
        title: isArabic ? "بيع جديد" : "New Sale",
        hint: isArabic ? "افتح نقطة البيع" : "Open POS",
        onClick: onOpenPOS,
      });
    }

    if (canAccess("purchases")) {
      actions.push({
        key: "purchases",
        title: isArabic ? "توريد جديد" : "New Purchase",
        hint: isArabic ? "تسجيل مشتريات" : "Add stock supply",
        onClick: onOpenPurchases,
      });
    }

    if (canAccess("inventory")) {
      actions.push({
        key: "inventory",
        title: isArabic ? "إدارة المخزون" : "Manage Inventory",
        hint: isArabic ? "عرض وإضافة الأدوية" : "View and add medicines",
        onClick: () => onOpenInventory("all"),
      });

      actions.push({
        key: "low-stock",
        title: isArabic ? "عرض النواقص" : "Low Stock",
        hint: isArabic ? "الأدوية قليلة الكمية" : "Low quantity items",
        danger: true,
        onClick: () => onOpenInventory("low"),
      });
    }

    if (canAccess("customers")) {
      actions.push({
        key: "customers",
        title: isArabic ? "تحصيل عميل" : "Collect Payment",
        hint: isArabic ? "مديونيات العملاء" : "Customer debts",
        onClick: onOpenCustomerPayments,
      });
    }

    if (canAccess("reports")) {
      actions.push({
        key: "reports",
        title: isArabic ? "التقارير" : "Reports",
        hint: isArabic ? "ملخص مالي" : "Financial summary",
        onClick: () => onNavigate("reports"),
      });
    }

    return actions;
  }, [
    allowedPages,
    isArabic,
    onOpenPOS,
    onOpenPurchases,
    onOpenInventory,
    onOpenCustomerPayments,
    onNavigate,
  ]);

  return { modules, quickActions, canAccess };
}
