import type { ReactNode } from "react";
import type { Medicine } from "../types";

type TopSellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type TopCashier = {
  cashierName: string;
  invoicesCount: number;
  totalSales: number;
};

type DashboardPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  dashboardPeriod: "today" | "7days" | "month" | "custom";
  onDashboardPeriodChange: (value: "today" | "7days" | "month" | "custom") => void;
  dashboardFromDate: string;
  dashboardToDate: string;
  onDashboardFromDateChange: (value: string) => void;
  onDashboardToDateChange: (value: string) => void;
  onExportSummary: () => Promise<void> | void;
  onPrintReport: () => Promise<void> | void;
  lowStockCount: number;
  expiredCount: number;
  expiringCount: number;
  totalCustomerRemainingDebt: number;
  dashboardSalesTotal: number;
  dashboardInvoicesCount: number;
  totalInvoicesCount: number;
  totalSalesAmount: number;
  dashboardProfitTotal: number;
  totalCustomerPayments: number;
  dashboardTopSellingMedicines: TopSellingMedicine[];
  dashboardTopCashiers: TopCashier[];
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
  inventoryOverview: ReactNode;
  cartPanel: ReactNode;
};

export default function DashboardPage({
  isArabic,
  t,
  dashboardPeriod,
  onDashboardPeriodChange,
  dashboardFromDate,
  dashboardToDate,
  onDashboardFromDateChange,
  onDashboardToDateChange,
  onExportSummary,
  onPrintReport,
  lowStockCount,
  expiredCount,
  expiringCount,
  totalCustomerRemainingDebt,
  dashboardSalesTotal,
  dashboardInvoicesCount,
  totalInvoicesCount,
  totalSalesAmount,
  dashboardProfitTotal,
  totalCustomerPayments,
  dashboardTopSellingMedicines,
  dashboardTopCashiers,
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
  inventoryOverview,
  cartPanel,
}: DashboardPageProps) {
  return (
    <div className="dashboardPage">
      <section className="dashboardFilters">
        <div>
          <h2>{isArabic ? "ملخص الفترة" : "Period Summary"}</h2>
          <p className="mutedText">
            {isArabic
              ? "اختر الفترة التي تريد عرض أرقامها"
              : "Choose the period you want to analyze"}
          </p>
        </div>

        <div className="filtersBar">
          <select
            value={dashboardPeriod}
            onChange={(e) =>
              onDashboardPeriodChange(
                e.target.value as "today" | "7days" | "month" | "custom"
              )
            }
          >
            <option value="today">{isArabic ? "اليوم" : "Today"}</option>
            <option value="7days">{isArabic ? "آخر 7 أيام" : "Last 7 days"}</option>
            <option value="month">{isArabic ? "الشهر الحالي" : "Current month"}</option>
            <option value="custom">{isArabic ? "فترة مخصصة" : "Custom period"}</option>
          </select>

          {dashboardPeriod === "custom" && (
            <>
              <input
                type="date"
                value={dashboardFromDate}
                onChange={(e) => onDashboardFromDateChange(e.target.value)}
              />

              <input
                type="date"
                value={dashboardToDate}
                onChange={(e) => onDashboardToDateChange(e.target.value)}
              />
            </>
          )}

          <button className="printBtn" onClick={onExportSummary}>
            {isArabic ? "تصدير ملخص الفترة" : "Export Summary"}
          </button>
          <button className="printFullBtn" onClick={onPrintReport}>
            {isArabic ? "طباعة تقرير الفترة" : "Print Report"}
          </button>
        </div>
      </section>

      <section className="statsGrid">
        <div className="statCard green">
          <span>{isArabic ? "مبيعات الفترة" : "Period Sales"}</span>
          <strong>
            {dashboardSalesTotal.toFixed(2)} {t.currency}
          </strong>
        </div>

        <div className="statCard blue">
          <span>{isArabic ? "فواتير الفترة" : "Period Invoices"}</span>
          <strong>{dashboardInvoicesCount}</strong>
        </div>

        <div
          className="statCard orange clickableCard"
          onClick={() => onOpenInventory("low")}
        >
          <span>{t.lowStock}</span>
          <strong>{lowStockCount}</strong>
        </div>

        <div
          className="statCard red clickableCard"
          onClick={() => onOpenInventory("expired")}
        >
          <span>{isArabic ? "منتهي الصلاحية" : "Expired"}</span>
          <strong>{expiredCount}</strong>
        </div>

        <div
          className="statCard orange clickableCard"
          onClick={() => onOpenInventory("expiring")}
        >
          <span>{t.expiringSoon}</span>
          <strong>{expiringCount}</strong>
        </div>

        <div
          className="statCard red clickableCard"
          onClick={onOpenCustomerPayments}
        >
          <span>{isArabic ? "مديونيات العملاء" : "Customer Debts"}</span>
          <strong>
            {totalCustomerRemainingDebt.toFixed(2)} {t.currency}
          </strong>
        </div>
      </section>

      <section className="quickActionsGrid">
        <button className="quickActionBtn" onClick={onOpenPOS}>
          <strong>{isArabic ? "بيع جديد" : "New Sale"}</strong>
          <span>{isArabic ? "افتح نقطة البيع" : "Open POS"}</span>
        </button>

        {(isSubscriptionExpired || isSubscriptionExpiringSoon) && (
          <section
            className={
              isSubscriptionExpired
                ? "subscriptionAlert danger"
                : "subscriptionAlert warning"
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

      <section className="ownerStatsGrid">
        <div className="ownerStatCard">
          <span>{isArabic ? "ربح الفترة" : "Period Profit"}</span>
          <strong>
            {dashboardProfitTotal.toFixed(2)} {t.currency}
          </strong>
        </div>

        <div className="ownerStatCard">
          <span>{isArabic ? "إجمالي الآجل المتبقي" : "Remaining Credit"}</span>
          <strong>
            {totalCustomerRemainingDebt.toFixed(2)} {t.currency}
          </strong>
        </div>

        <div className="ownerStatCard">
          <span>{isArabic ? "إجمالي التحصيلات" : "Total Payments"}</span>
          <strong>
            {totalCustomerPayments.toFixed(2)} {t.currency}
          </strong>
        </div>
      </section>

      <section className="ownerInsightsGrid">
        <div className="card alertCard">
          <div className="cardHeader">
            <h2>{isArabic ? "أفضل الأصناف بيعًا" : "Top Selling Items"}</h2>
          </div>

          {dashboardTopSellingMedicines.length === 0 ? (
            <p className="empty">
              {isArabic ? "لا توجد مبيعات كافية" : "No enough sales data"}
            </p>
          ) : (
            <div className="miniList">
              {dashboardTopSellingMedicines.map((item) => (
                <div className="miniListItem" key={item.medicineId}>
                  <span>{isArabic ? item.name_ar : item.name_en}</span>
                  <strong>
                    {item.quantity} / {item.total.toFixed(2)} {t.currency}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card alertCard">
          <div className="cardHeader">
            <h2>{isArabic ? "أفضل الكاشيرين" : "Top Cashiers"}</h2>
          </div>

          {dashboardTopCashiers.length === 0 ? (
            <p className="empty">
              {isArabic ? "لا توجد مبيعات كافية" : "No enough sales data"}
            </p>
          ) : (
            <div className="miniList">
              {dashboardTopCashiers.map((cashier) => (
                <div className="miniListItem" key={cashier.cashierName}>
                  <span>{cashier.cashierName}</span>
                  <strong>
                    {cashier.invoicesCount} / {cashier.totalSales.toFixed(2)} {t.currency}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="alertsGrid">
        <div className="card alertCard">
          <div className="cardHeader">
            <h2>{isArabic ? "أدوية ناقصة" : "Low Stock Medicines"}</h2>
          </div>

          {lowStockMedicines.length === 0 ? (
            <p className="empty">
              {isArabic ? "لا توجد نواقص حالياً" : "No low stock medicines"}
            </p>
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

        <div className="card alertCard">
          <div className="cardHeader">
            <h2>{isArabic ? "قرب انتهاء الصلاحية" : "Expiring Soon"}</h2>
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

        <div className="card alertCard">
          <div className="cardHeader">
            <h2>{isArabic ? "أدوية منتهية" : "Expired Medicines"}</h2>
          </div>

          {expiredMedicines.length === 0 ? (
            <p className="empty">
              {isArabic ? "لا توجد أدوية منتهية" : "No expired medicines"}
            </p>
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

      <section className="dashboardSummary">
        <div className="card summaryCard">
          <h3>{t.salesSummary}</h3>
          <div className="summaryGrid">
            <div>
              <span>{t.loadedInvoices}</span>
              <strong>{totalInvoicesCount}</strong>
            </div>
            <div>
              <span>{t.loadedSales}</span>
              <strong>{totalSalesAmount.toFixed(2)} {t.currency}</strong>
            </div>
            <div>
              <span>{t.lowStock}</span>
              <strong>{lowStockCount}</strong>
            </div>
            <div>
              <span>{t.expiringSoon}</span>
              <strong>{expiringCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="workGrid">
        <div className="card">
          <div className="cardHeader">
            <h2>{t.inventory}</h2>
          </div>
          {inventoryOverview}
        </div>
        <div className="card posCard">
          <div className="cardHeader">
            <h2>{t.pos}</h2>
          </div>
          {cartPanel}
        </div>
      </section>
    </div>
  );
}
