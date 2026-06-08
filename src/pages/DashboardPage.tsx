import { useMemo } from "react";
import type { Medicine, Page } from "../types";

type DashboardPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  allowedPages: Page[];
  lowStockCount: number;
  expiredCount: number;
  expiringCount: number;
  totalCustomerRemainingDebt: number;
  totalCustomerPayments: number;
  dashboardSalesTotal: number;
  dashboardInvoicesCount: number;
  dashboardProfitTotal: number;
  totalInvoicesCount: number;
  totalMedicinesCount: number;
  totalPurchasesCount: number;
  totalReturnsCount: number;
  branchesCount: number;
  lowStockMedicines: Medicine[];
  expiringSoonMedicines: Medicine[];
  expiredMedicines: Medicine[];
  subscriptionDaysLeft: number | null;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  hasAdminRole: boolean;
  onOpenSubscriptionSettings: () => void;
  onOpenPOS: () => void;
  onOpenPurchases: () => void;
  onOpenInventory: (filter: "all" | "low" | "expiring" | "expired") => void;
  onOpenCustomerPayments: () => void;
  onNavigate: (page: Page) => void;
};

type ModuleCard = {
  key: string;
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone: string;
  onClick: () => void;
};

type QuickAction = {
  key: string;
  title: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
};

function formatMoney(value: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DashboardPage({
  isArabic,
  t,
  allowedPages,
  lowStockCount,
  expiredCount,
  expiringCount,
  totalCustomerRemainingDebt,
  totalCustomerPayments,
  dashboardSalesTotal,
  dashboardInvoicesCount,
  dashboardProfitTotal,
  totalInvoicesCount,
  totalMedicinesCount,
  totalPurchasesCount,
  totalReturnsCount,
  branchesCount,
  lowStockMedicines,
  expiringSoonMedicines,
  expiredMedicines,
  subscriptionDaysLeft,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  hasAdminRole,
  onOpenSubscriptionSettings,
  onOpenPOS,
  onOpenPurchases,
  onOpenInventory,
  onOpenCustomerPayments,
  onNavigate,
}: DashboardPageProps) {
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
        title: isArabic ? "حضوري" : "My Attendance",
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

  const showInventoryAlerts = canAccess("inventory");

  return (
    <div className="dashboardPage">
      <section className="card dashboardIntro">
        <h2>{isArabic ? "لوحة التحكم" : "Dashboard"}</h2>
        <p className="returnsSectionHint">
          {isArabic
            ? "ملخص سريع حسب صلاحياتك — اضغط على أي بطاقة للانتقال"
            : "Quick summary for your role — click any card to navigate"}
        </p>
      </section>

      {modules.length > 0 ? (
        <section className="moduleGrid">
          {modules.map((mod) => (
            <button
              type="button"
              className={`moduleCard tone-${mod.tone}`}
              key={mod.key}
              onClick={mod.onClick}
            >
              <span className="moduleIcon">{mod.icon}</span>
              <span className="moduleLabel">{mod.label}</span>
              <strong className="moduleValue">{mod.value}</strong>
              {mod.sub && <span className="moduleSub">{mod.sub}</span>}
            </button>
          ))}
        </section>
      ) : (
        <section className="card">
          <p className="empty">
            {isArabic ? "لا توجد بطاقات متاحة لدورك الحالي" : "No dashboard cards for your role"}
          </p>
        </section>
      )}

      {(isSubscriptionExpired || isSubscriptionExpiringSoon) && (
        <section
          className={
            isSubscriptionExpired ? "subscriptionAlert danger" : "subscriptionAlert warning"
          }
        >
          <strong>
            {isSubscriptionExpired
              ? isArabic
                ? "الاشتراك منتهي"
                : "Subscription Expired"
              : isArabic
                ? "الاشتراك قرب ينتهي"
                : "Subscription Expiring Soon"}
          </strong>
          <span>
            {isSubscriptionExpired
              ? isArabic
                ? "يرجى تجديد الاشتراك لاستمرار استخدام النظام."
                : "Please renew the subscription to continue using the system."
              : isArabic
                ? `متبقي ${subscriptionDaysLeft} يوم على انتهاء الاشتراك.`
                : `${subscriptionDaysLeft} days left until subscription ends.`}
          </span>
          {hasAdminRole && canAccess("settings") && (
            <div className="renewActions">
              <button type="button" className="renewBtn" onClick={onOpenSubscriptionSettings}>
                {isArabic ? "طلب تجديد اشتراك" : "Request renewal"}
              </button>
            </div>
          )}
        </section>
      )}

      {quickActions.length > 0 && (
        <section className="quickActionsGrid">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={action.danger ? "quickActionBtn danger" : "quickActionBtn"}
              onClick={action.onClick}
            >
              <strong>{action.title}</strong>
              <span>{action.hint}</span>
            </button>
          ))}
        </section>
      )}

      {showInventoryAlerts && (
        <section className="alertsGrid">
          <div className="card alertCard clickableCard" onClick={() => onOpenInventory("low")}>
            <div className="cardHeader">
              <h2>{isArabic ? "أدوية ناقصة" : "Low Stock Medicines"}</h2>
              <span className="alertCountTag warn">{lowStockCount}</span>
            </div>
            {lowStockMedicines.length === 0 ? (
              <p className="empty">{isArabic ? "لا توجد نواقص حالياً" : "No low stock medicines"}</p>
            ) : (
              <div className="miniList">
                {lowStockMedicines.slice(0, 5).map((medicine) => (
                  <div className="miniListItem" key={medicine.id}>
                    <span>{isArabic ? medicine.name_ar : medicine.name_en}</span>
                    <strong>{medicine.qty}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card alertCard clickableCard" onClick={() => onOpenInventory("expiring")}>
            <div className="cardHeader">
              <h2>{isArabic ? "قرب انتهاء الصلاحية" : "Expiring Soon"}</h2>
              <span className="alertCountTag warn">{expiringCount}</span>
            </div>
            {expiringSoonMedicines.length === 0 ? (
              <p className="empty">
                {isArabic ? "لا توجد أدوية قرب الانتهاء" : "No expiring medicines"}
              </p>
            ) : (
              <div className="miniList">
                {expiringSoonMedicines.slice(0, 5).map((medicine) => (
                  <div className="miniListItem" key={medicine.id}>
                    <span>{isArabic ? medicine.name_ar : medicine.name_en}</span>
                    <strong>{medicine.expiry}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card alertCard clickableCard" onClick={() => onOpenInventory("expired")}>
            <div className="cardHeader">
              <h2>{isArabic ? "أدوية منتهية" : "Expired Medicines"}</h2>
              <span className="alertCountTag danger">{expiredCount}</span>
            </div>
            {expiredMedicines.length === 0 ? (
              <p className="empty">{isArabic ? "لا توجد أدوية منتهية" : "No expired medicines"}</p>
            ) : (
              <div className="miniList">
                {expiredMedicines.slice(0, 5).map((medicine) => (
                  <div className="miniListItem dangerText" key={medicine.id}>
                    <span>{isArabic ? medicine.name_ar : medicine.name_en}</span>
                    <strong>{medicine.expiry}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
