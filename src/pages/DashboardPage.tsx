import type { Medicine, Page } from "../types";

type DashboardPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
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
  onRenewSubscription: (days: number) => void;
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

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DashboardPage({
  isArabic,
  t,
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
  onRenewSubscription,
  onOpenPOS,
  onOpenPurchases,
  onOpenInventory,
  onOpenCustomerPayments,
  onNavigate,
}: DashboardPageProps) {
  const modules: ModuleCard[] = [
    {
      key: "inventory",
      icon: "🧬",
      label: isArabic ? "الأدوية بالمخزون" : "Medicines in Stock",
      value: String(totalMedicinesCount),
      sub: isArabic ? `${lowStockCount} صنف ناقص` : `${lowStockCount} low stock`,
      tone: "green",
      onClick: () => onOpenInventory("all"),
    },
    {
      key: "sales",
      icon: "💳",
      label: isArabic ? "مبيعات الفترة" : "Period Sales",
      value: `${formatMoney(dashboardSalesTotal)} ${t.currency}`,
      sub: isArabic ? `${dashboardInvoicesCount} فاتورة` : `${dashboardInvoicesCount} invoices`,
      tone: "blue",
      onClick: onOpenPOS,
    },
    {
      key: "invoices",
      icon: "🧾",
      label: isArabic ? "إجمالي الفواتير" : "Total Invoices",
      value: String(totalInvoicesCount),
      tone: "indigo",
      onClick: () => onNavigate("invoices"),
    },
    {
      key: "purchases",
      icon: "📦",
      label: isArabic ? "عمليات التوريد" : "Purchases",
      value: String(totalPurchasesCount),
      tone: "teal",
      onClick: onOpenPurchases,
    },
    {
      key: "returns",
      icon: "↩️",
      label: isArabic ? "المرتجعات" : "Returns",
      value: String(totalReturnsCount),
      tone: "orange",
      onClick: () => onNavigate("returns"),
    },
    {
      key: "debts",
      icon: "👥",
      label: isArabic ? "مديونيات العملاء" : "Customer Debts",
      value: `${formatMoney(totalCustomerRemainingDebt)} ${t.currency}`,
      sub: isArabic
        ? `محصّل: ${formatMoney(totalCustomerPayments)} ${t.currency}`
        : `Collected: ${formatMoney(totalCustomerPayments)} ${t.currency}`,
      tone: "red",
      onClick: onOpenCustomerPayments,
    },
    {
      key: "profit",
      icon: "📊",
      label: isArabic ? "ربح الفترة" : "Period Profit",
      value: `${formatMoney(dashboardProfitTotal)} ${t.currency}`,
      sub: isArabic ? "افتح التقارير" : "Open reports",
      tone: "green",
      onClick: () => onNavigate("reports"),
    },
  ];

  if (branchesCount > 1) {
    modules.push({
      key: "branches",
      icon: "🏢",
      label: isArabic ? "الفروع" : "Branches",
      value: String(branchesCount),
      tone: "indigo",
      onClick: () => onNavigate("branches"),
    });
  }

  return (
    <div className="dashboardPage">
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
          {hasAdminRole && (
            <div className="renewActions">
              <button className="renewBtn" onClick={() => onRenewSubscription(30)}>
                {isArabic ? "30 يوم" : "30 Days"}
              </button>
              <button className="renewBtn" onClick={() => onRenewSubscription(90)}>
                {isArabic ? "3 شهور" : "3 Months"}
              </button>
              <button className="renewBtn" onClick={() => onRenewSubscription(365)}>
                {isArabic ? "سنة" : "1 Year"}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="quickActionsGrid">
        <button className="quickActionBtn" onClick={onOpenPOS}>
          <strong>{isArabic ? "بيع جديد" : "New Sale"}</strong>
          <span>{isArabic ? "افتح نقطة البيع" : "Open POS"}</span>
        </button>
        <button className="quickActionBtn" onClick={onOpenPurchases}>
          <strong>{isArabic ? "توريد جديد" : "New Purchase"}</strong>
          <span>{isArabic ? "تسجيل مشتريات" : "Add stock supply"}</span>
        </button>
        <button className="quickActionBtn" onClick={() => onOpenInventory("all")}>
          <strong>{isArabic ? "إضافة دواء" : "Add Medicine"}</strong>
          <span>{isArabic ? "إدارة المخزون" : "Manage inventory"}</span>
        </button>
        <button className="quickActionBtn danger" onClick={() => onOpenInventory("low")}>
          <strong>{isArabic ? "عرض النواقص" : "Low Stock"}</strong>
          <span>{isArabic ? "الأدوية قليلة الكمية" : "Low quantity items"}</span>
        </button>
      </section>

      <section className="alertsGrid">
        <div
          className="card alertCard clickableCard"
          onClick={() => onOpenInventory("low")}
        >
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

        <div
          className="card alertCard clickableCard"
          onClick={() => onOpenInventory("expiring")}
        >
          <div className="cardHeader">
            <h2>{isArabic ? "قرب انتهاء الصلاحية" : "Expiring Soon"}</h2>
            <span className="alertCountTag warn">{expiringCount}</span>
          </div>
          {expiringSoonMedicines.length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد أدوية قرب الانتهاء" : "No expiring medicines"}</p>
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

        <div
          className="card alertCard clickableCard"
          onClick={() => onOpenInventory("expired")}
        >
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
    </div>
  );
}
