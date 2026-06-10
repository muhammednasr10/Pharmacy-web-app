import { useMemo } from "react";
import type { BranchInventoryAlertRow } from "../utils/inventoryAlerts";
import type { BranchReportRow } from "../utils/branchReports";
import type { BranchStockTransfer, Medicine, Page } from "../types";
import type { TierUpgradePrompt } from "../utils/subscriptionFeatures";

type PendingBranchTransferGroup = {
  transferNumber: string;
  items: BranchStockTransfer[];
  fromPharmacyId?: string;
  toPharmacyId?: string;
  createdAt?: string;
  status: string;
  totalQty: number;
};

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
  isTrialSubscription?: boolean;
  hasAdminRole: boolean;
  showBranchBreakdown?: boolean;
  dashboardBranchRows?: BranchReportRow[];
  showOrgInventoryAlerts?: boolean;
  branchInventoryAlertRows?: BranchInventoryAlertRow[];
  showBranchInAlertLists?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  onOpenBranchInventory?: (branchId: string) => void;
  onOpenSubscriptionSettings: () => void;
  onOpenPOS: () => void;
  onOpenPurchases: () => void;
  onOpenReorderSuggestions?: () => void;
  onOpenInventory: (filter: "all" | "low" | "expiring" | "expired") => void;
  onOpenCustomerPayments: () => void;
  onNavigate: (page: Page) => void;
  pendingBranchTransferGroups?: PendingBranchTransferGroup[];
  onApproveBranchTransfer?: (transferNumber: string) => void | Promise<void>;
  onRejectBranchTransfer?: (transferNumber: string) => void | Promise<void>;
  tierUpgradePrompt?: TierUpgradePrompt | null;
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
  isTrialSubscription = false,
  hasAdminRole,
  showBranchBreakdown = false,
  dashboardBranchRows = [],
  showOrgInventoryAlerts = false,
  branchInventoryAlertRows = [],
  showBranchInAlertLists = false,
  getBranchLabel,
  onOpenBranchInventory,
  onOpenSubscriptionSettings,
  onOpenPOS,
  onOpenPurchases,
  onOpenReorderSuggestions,
  onOpenInventory,
  onOpenCustomerPayments,
  onNavigate,
  pendingBranchTransferGroups = [],
  onApproveBranchTransfer,
  onRejectBranchTransfer,
  tierUpgradePrompt,
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

      {tierUpgradePrompt && (
        <section className="card subscriptionTierUpgradeCard">
          <div className="subscriptionTierUpgradeHeader">
            <div>
              <h3>{tierUpgradePrompt.title}</h3>
              <p className="returnsSectionHint">{tierUpgradePrompt.summary}</p>
            </div>
            <button type="button" className="completeBtn" onClick={onOpenSubscriptionSettings}>
              {tierUpgradePrompt.ctaLabel}
            </button>
          </div>
          <ul className="subscriptionTierFeatureList">
            {tierUpgradePrompt.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <p className="returnsSectionHint">
            {isArabic
              ? "يمكنك إرسال طلب ترقية مباشرة من قسم الاشتراك في الإعدادات."
              : "You can submit an upgrade request directly from Subscription in Settings."}
          </p>
        </section>
      )}

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

      {showOrgInventoryAlerts && branchInventoryAlertRows.length > 0 && (
        <section className="card branchReportBreakdown branchInventoryAlertBreakdown">
          <div className="cardHeader">
            <div>
              <h3>{isArabic ? "تنبيهات المخزون حسب الفرع" : "Inventory alerts by branch"}</h3>
              <p className="returnsSectionHint">
                {isArabic
                  ? "ملخص النواقص والصلاحيات لكل فرع — اضغط على الفرع لعرض التفاصيل"
                  : "Low stock and expiry summary per branch — click a branch for details"}
              </p>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الفرع" : "Branch"}</th>
                  <th>{isArabic ? "نواقص" : "Low stock"}</th>
                  <th>{isArabic ? "نفدت" : "Out of stock"}</th>
                  <th>{isArabic ? "قرب الانتهاء" : "Expiring"}</th>
                  <th>{isArabic ? "منتهية" : "Expired"}</th>
                  <th>{isArabic ? "إجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {branchInventoryAlertRows.map((row) => (
                  <tr
                    key={row.branchId}
                    className={row.totalAlertCount > 0 ? "branchInventoryAlertRow--active" : ""}
                  >
                    <td>
                      {onOpenBranchInventory ? (
                        <button
                          type="button"
                          className="branchInventoryAlertLink"
                          onClick={() => onOpenBranchInventory(row.branchId)}
                        >
                          {row.branchLabel}
                        </button>
                      ) : (
                        row.branchLabel
                      )}
                    </td>
                    <td>
                      <span className={row.lowStockCount > 0 ? "alertCountTag warn" : "mutedCell"}>
                        {row.lowStockCount}
                      </span>
                    </td>
                    <td>
                      <span className={row.outOfStockCount > 0 ? "alertCountTag danger" : "mutedCell"}>
                        {row.outOfStockCount}
                      </span>
                    </td>
                    <td>
                      <span className={row.expiringCount > 0 ? "alertCountTag warn" : "mutedCell"}>
                        {row.expiringCount}
                      </span>
                    </td>
                    <td>
                      <span className={row.expiredCount > 0 ? "alertCountTag danger" : "mutedCell"}>
                        {row.expiredCount}
                      </span>
                    </td>
                    <td>
                      <strong>{row.totalAlertCount}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showBranchBreakdown && dashboardBranchRows.length > 1 && (
        <section className="card branchReportBreakdown dashboardBranchBreakdown">
          <h3>{isArabic ? "مبيعات الفروع — الفترة الحالية" : "Branch sales — current period"}</h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الفرع" : "Branch"}</th>
                  <th>{isArabic ? "فواتير" : "Inv."}</th>
                  <th>{isArabic ? "مبيعات" : "Sales"}</th>
                  <th>{isArabic ? "ربح" : "Profit"}</th>
                </tr>
              </thead>
              <tbody>
                {dashboardBranchRows.map((row) => (
                  <tr key={row.branchId}>
                    <td>{row.branchLabel}</td>
                    <td>{row.invoiceCount}</td>
                    <td>
                      {formatMoney(row.salesTotal)} {t.currency}
                    </td>
                    <td>
                      {formatMoney(row.profitTotal)} {t.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canAccess("reports") && (
            <button type="button" className="smallBtn" onClick={() => onNavigate("reports")}>
              {isArabic ? "التقرير المفصّل" : "Full report"}
            </button>
          )}
        </section>
      )}

      {(isTrialSubscription || isSubscriptionExpired || isSubscriptionExpiringSoon) && (
        <section
          className={
            isSubscriptionExpired
              ? "subscriptionAlert danger"
              : isSubscriptionExpiringSoon
                ? "subscriptionAlert warning"
                : "subscriptionAlert info"
          }
        >
          <strong>
            {isSubscriptionExpired
              ? isArabic
                ? isTrialSubscription
                  ? "انتهت الفترة التجريبية"
                  : "الاشتراك منتهي"
                : isTrialSubscription
                  ? "Trial Ended"
                  : "Subscription Expired"
              : isTrialSubscription
                ? isArabic
                  ? "فترة تجريبية نشطة"
                  : "Active Free Trial"
                : isArabic
                  ? "الاشتراك قرب ينتهي"
                  : "Subscription Expiring Soon"}
          </strong>
          <span>
            {isSubscriptionExpired
              ? isArabic
                ? isTrialSubscription
                  ? "انتهت التجربة المجانية. اشترك للاستمرار في استخدام النظام."
                  : "يرجى تجديد الاشتراك لاستمرار استخدام النظام."
                : isTrialSubscription
                  ? "Your free trial has ended. Subscribe to keep using the system."
                  : "Please renew the subscription to continue using the system."
              : isTrialSubscription
                ? isArabic
                  ? `متبقي ${subscriptionDaysLeft} يوم على نهاية التجربة المجانية.`
                  : `${subscriptionDaysLeft} days left in your free trial.`
                : isArabic
                  ? `متبقي ${subscriptionDaysLeft} يوم على انتهاء الاشتراك.`
                  : `${subscriptionDaysLeft} days left until subscription ends.`}
          </span>
          {hasAdminRole && canAccess("settings") && (
            <div className="renewActions">
              <button type="button" className="renewBtn" onClick={onOpenSubscriptionSettings}>
                {isArabic
                  ? isTrialSubscription && !isSubscriptionExpired
                    ? "الاشتراك بعد التجربة"
                    : "طلب تجديد اشتراك"
                  : isTrialSubscription && !isSubscriptionExpired
                    ? "Subscribe after trial"
                    : "Request renewal"}
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

      {pendingBranchTransferGroups.length > 0 && onApproveBranchTransfer && onRejectBranchTransfer && (
        <section className="card dashboardPendingTransfers">
          <div className="cardHeader">
            <h2>{isArabic ? "طلبات نقل بانتظار الاعتماد" : "Pending transfer approvals"}</h2>
            <span className="badge warn">{pendingBranchTransferGroups.length}</span>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الرقم" : "No."}</th>
                  <th>{isArabic ? "من" : "From"}</th>
                  <th>{isArabic ? "إلى" : "To"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "الكمية" : "Qty"}</th>
                  <th>{t.date}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {pendingBranchTransferGroups.map((group) => (
                  <tr key={group.transferNumber}>
                    <td>{group.transferNumber}</td>
                    <td>{getBranchLabel ? getBranchLabel(group.fromPharmacyId) : group.fromPharmacyId}</td>
                    <td>{getBranchLabel ? getBranchLabel(group.toPharmacyId) : group.toPharmacyId}</td>
                    <td>{group.items.length}</td>
                    <td>{group.totalQty}</td>
                    <td>
                      {group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => void onApproveBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "اعتماد" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          onClick={() => void onRejectBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "رفض" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <>
                <div className="miniList">
                  {lowStockMedicines.slice(0, 5).map((medicine) => (
                    <div className="miniListItem" key={medicine.id}>
                      <span>
                        {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                          <>
                            <span className="miniListBranchTag">{getBranchLabel(medicine.pharmacyId)}</span>
                            {" · "}
                          </>
                        ) : null}
                        {isArabic ? medicine.name_ar : medicine.name_en}
                      </span>
                      <strong>{medicine.qty}</strong>
                    </div>
                  ))}
                </div>
                {onOpenReorderSuggestions && (
                  <button
                    type="button"
                    className="alertFooterBtn dashboardReorderBtn"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenReorderSuggestions();
                    }}
                  >
                    {isArabic ? "اقتراح توريد من النواقص" : "Reorder from low stock"}
                  </button>
                )}
              </>
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
                    <span>
                      {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                        <>
                          <span className="miniListBranchTag">{getBranchLabel(medicine.pharmacyId)}</span>
                          {" · "}
                        </>
                      ) : null}
                      {isArabic ? medicine.name_ar : medicine.name_en}
                    </span>
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
                    <span>
                      {showBranchInAlertLists && getBranchLabel && medicine.pharmacyId ? (
                        <>
                          <span className="miniListBranchTag">{getBranchLabel(medicine.pharmacyId)}</span>
                          {" · "}
                        </>
                      ) : null}
                      {isArabic ? medicine.name_ar : medicine.name_en}
                    </span>
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
