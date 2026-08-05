import { useEffect, useMemo, useRef, useState } from "react";
import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import type { AppUser, CustomerDebt, Invoice, Medicine, Page, PharmacySettings } from "../types";
import { canSwitchOrganizationBranches, getRoleLabel, isSuperAdmin } from "../utils/roles";
import type { TierUpgradePrompt } from "../utils/subscriptionFeatures";
import type { GlobalSearchResult } from "../utils/globalSearch";
import { ALL_BRANCHES_ID } from "../constants/branches";
import BranchScopeSelect from "./BranchScopeSelect";
import TopbarGlobalSearch from "./TopbarGlobalSearch";
import CustomerSupportPanel from "./CustomerSupportPanel";

export type InventoryAlertFilter = "low" | "expiring" | "expired";

type SystemAlertKind = "subscription" | "offline-sales" | "admin-pending";

type SystemAlertRow = {
  id: SystemAlertKind;
  dot: string;
  labelAr: string;
  labelEn: string;
  count: number;
  detailAr: string;
  detailEn: string;
  onClick: () => void;
};

type TopbarProps = {
  title: string;
  subtitle?: string;
  pharmacyLogo?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  subscriptionTier?: SubscriptionTier;
  tierUpgradePrompt?: TierUpgradePrompt | null;
  onOpenSubscriptionSettings?: () => void;
  appUser: AppUser | null;
  isArabic: boolean;
  t: Record<string, string>;
  lang: string;
  onToggleLang: () => void;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  globalSearchAllowedPages: Page[];
  medicines: Medicine[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  canSearchMedicines: boolean;
  canSearchInvoices: boolean;
  canSearchCustomers: boolean;
  onGlobalSearchSelect: (result: GlobalSearchResult) => void;
  globalSearchFocusToken?: number;
  onLogout: () => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  lowStockCount: number;
  expiringCount: number;
  expiredCount: number;
  alertTotal: number;
  isSubscriptionExpiringSoon?: boolean;
  isSubscriptionExpired?: boolean;
  subscriptionDaysLeft?: number;
  pendingOfflineSalesCount?: number;
  adminPendingCount?: number;
  onAlertNavigate: (filter: InventoryAlertFilter) => void;
  onOpenPos?: () => void;
  onOpenTenants?: () => void;
  branches: Pick<PharmacySettings, "id" | "name" | "name_en" | "organizationId">[];
  activeBranchId: string | null;
  onSwitchBranch: (id: string) => void;
  allowBranchSwitch?: boolean;
  userPhotoBase64?: string;
};

const INVENTORY_ALERT_META: Record<
  InventoryAlertFilter,
  { dot: string; labelAr: string; labelEn: string; detailAr: string; detailEn: string }
> = {
  low: {
    dot: "#f79009",
    labelAr: "أدوية ناقصة",
    labelEn: "Low stock medicines",
    detailAr: "اضغط لعرض النواقص في المخزون",
    detailEn: "Tap to view low stock in inventory",
  },
  expired: {
    dot: "#f04438",
    labelAr: "أدوية منتهية الصلاحية",
    labelEn: "Expired medicines",
    detailAr: "اضغط لعرض الأدوية المنتهية",
    detailEn: "Tap to view expired medicines",
  },
  expiring: {
    dot: "#2e90fa",
    labelAr: "أدوية قرب انتهاء الصلاحية",
    labelEn: "Expiring soon",
    detailAr: "اضغط لعرض الأدوية القريبة من الانتهاء",
    detailEn: "Tap to view medicines expiring soon",
  },
};

export default function Topbar({
  title,
  subtitle = "",
  pharmacyLogo = "",
  pharmacyPhone = "",
  pharmacyAddress = "",
  subscriptionTier = "basic",
  tierUpgradePrompt = null,
  onOpenSubscriptionSettings,
  appUser,
  isArabic,
  t,
  onToggleLang,
  resolvedTheme,
  onToggleTheme,
  globalSearchAllowedPages,
  medicines,
  invoices,
  customerDebts,
  canSearchMedicines,
  canSearchInvoices,
  canSearchCustomers,
  onGlobalSearchSelect,
  globalSearchFocusToken = 0,
  onLogout,
  onToggleMenu,
  isMenuOpen,
  lowStockCount,
  expiringCount,
  expiredCount,
  alertTotal,
  isSubscriptionExpiringSoon = false,
  isSubscriptionExpired = false,
  subscriptionDaysLeft = 0,
  pendingOfflineSalesCount = 0,
  adminPendingCount = 0,
  onAlertNavigate,
  onOpenPos,
  onOpenTenants,
  branches,
  activeBranchId,
  onSwitchBranch,
  allowBranchSwitch,
  userPhotoBase64 = "",
}: TopbarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!alertsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [alertsOpen]);

  const navigateInventory = (filter: InventoryAlertFilter) => {
    onAlertNavigate(filter);
    setAlertsOpen(false);
  };

  const inventorySummaryRows: Array<{ filter: InventoryAlertFilter; count: number }> = [
    { filter: "low", count: lowStockCount },
    { filter: "expired", count: expiredCount },
    { filter: "expiring", count: expiringCount },
  ];

  const systemAlerts = useMemo((): SystemAlertRow[] => {
    const rows: SystemAlertRow[] = [];

    if (isSubscriptionExpired || isSubscriptionExpiringSoon) {
      rows.push({
        id: "subscription",
        dot: isSubscriptionExpired ? "#f04438" : "#f79009",
        labelAr: isSubscriptionExpired ? "انتهى الاشتراك" : "الاشتراك ينتهي قريباً",
        labelEn: isSubscriptionExpired ? "Subscription expired" : "Subscription ending soon",
        count: isSubscriptionExpired ? 1 : Math.max(subscriptionDaysLeft, 1),
        detailAr: isSubscriptionExpired
          ? "اضغط لتجديد الاشتراك من الإعدادات"
          : `باقي ${Math.max(subscriptionDaysLeft, 0)} يوم — اضغط للتجديد`,
        detailEn: isSubscriptionExpired
          ? "Tap to renew from settings"
          : `${Math.max(subscriptionDaysLeft, 0)} days left — tap to renew`,
        onClick: () => {
          onOpenSubscriptionSettings?.();
          setAlertsOpen(false);
        },
      });
    }

    if (pendingOfflineSalesCount > 0) {
      rows.push({
        id: "offline-sales",
        dot: "#7a5af8",
        labelAr: "مبيعات بانتظار المزامنة",
        labelEn: "Sales pending sync",
        count: pendingOfflineSalesCount,
        detailAr: "اضغط لفتح نقطة البيع ومزامنة المبيعات",
        detailEn: "Tap to open POS and sync sales",
        onClick: () => {
          onOpenPos?.();
          setAlertsOpen(false);
        },
      });
    }

    if (adminPendingCount > 0) {
      rows.push({
        id: "admin-pending",
        dot: "#12b76a",
        labelAr: "طلبات إدارية معلّقة",
        labelEn: "Pending admin requests",
        count: adminPendingCount,
        detailAr: "اضغط لمراجعة طلبات الصيدليات والحسابات",
        detailEn: "Tap to review pharmacy and account requests",
        onClick: () => {
          onOpenTenants?.();
          setAlertsOpen(false);
        },
      });
    }

    return rows;
  }, [
    adminPendingCount,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    onOpenPos,
    onOpenSubscriptionSettings,
    onOpenTenants,
    pendingOfflineSalesCount,
    subscriptionDaysLeft,
  ]);

  const hasSystemAlerts = systemAlerts.length > 0;

  const canSwitchBranches =
    allowBranchSwitch ?? canSwitchOrganizationBranches(appUser, branches.length);
  const showBranchSwitch = (isSuperAdmin(appUser) || canSwitchBranches) && branches.length > 0;
  const branchSelectValue = activeBranchId || appUser?.pharmacyId || branches[0]?.id || "";
  const showSubscriptionTier = !isSuperAdmin(appUser);
  const tierBadgeClass = `saasTierBadge ${subscriptionTier}`;
  const hasUserPhoto = Boolean(userPhotoBase64?.trim());

  const alertBellNode = (
    <div className="alertBell" ref={alertRef}>
      <button
        type="button"
        className={`topbarIconBtn alertBellBtn ${alertsOpen ? "open" : ""}`}
        onClick={() => setAlertsOpen((value) => !value)}
        aria-label={isArabic ? "التنبيهات" : "Notifications"}
        aria-expanded={alertsOpen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6c0 .5-.2 1-.6 1.4L4 15.4c-.6.6-.2 1.6.7 1.6h14.6c.9 0 1.3-1 .7-1.6l-1.4-1.4a2 2 0 0 1-.6-1.4V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 19a2.5 2.5 0 0 0 5 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {alertTotal > 0 && (
          <span className="alertBadge">{alertTotal > 99 ? "99+" : alertTotal}</span>
        )}
      </button>

      {alertsOpen && (
        <div className="alertDropdown" dir={isArabic ? "rtl" : "ltr"}>
          <div className="alertDropdownHeader">
            <strong>{isArabic ? "التنبيهات" : "Notifications"}</strong>
            <span>
              {alertTotal} {isArabic ? "تنبيه مخزون" : "inventory alerts"}
            </span>
          </div>

          <ul className="alertList alertSummaryList">
            {inventorySummaryRows.map(({ filter, count }) => {
              const meta = INVENTORY_ALERT_META[filter];
              return (
                <li key={filter}>
                  <button
                    type="button"
                    className="alertRow alertSummaryRow"
                    onClick={() => navigateInventory(filter)}
                    disabled={count <= 0}
                  >
                    <span className="alertDot" style={{ background: meta.dot }} />
                    <span className="alertText">
                      <span className="alertName">{isArabic ? meta.labelAr : meta.labelEn}</span>
                      <span className="alertDetail">
                        {isArabic ? meta.detailAr : meta.detailEn}
                      </span>
                    </span>
                    <span className={`alertSummaryCount ${count > 0 ? "hasAlerts" : "zero"}`}>
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}

            {systemAlerts.map((alert) => (
              <li key={alert.id}>
                <button type="button" className="alertRow alertSummaryRow" onClick={alert.onClick}>
                  <span className="alertDot" style={{ background: alert.dot }} />
                  <span className="alertText">
                    <span className="alertName">{isArabic ? alert.labelAr : alert.labelEn}</span>
                    <span className="alertDetail">{isArabic ? alert.detailAr : alert.detailEn}</span>
                  </span>
                  <span className="alertSummaryCount hasAlerts">{alert.count}</span>
                </button>
              </li>
            ))}
          </ul>

          {alertTotal === 0 && !hasSystemAlerts ? (
            <div className="alertEmpty alertSummaryEmpty">
              {isArabic ? "لا توجد تنبيهات أخرى حالياً 🎉" : "No other alerts right now 🎉"}
            </div>
          ) : null}

          <div className="alertDropdownFooter">
            <button type="button" className="alertFooterBtn" onClick={() => navigateInventory("low")}>
              {isArabic ? "فتح المخزون" : "Open inventory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="topbar">
      <button
        className={`menuBtn ${isMenuOpen ? "open" : ""}`}
        onClick={onToggleMenu}
        type="button"
        aria-label={
          isArabic
            ? isMenuOpen
              ? "إغلاق القائمة"
              : "فتح القائمة"
            : isMenuOpen
              ? "Close menu"
              : "Open menu"
        }
        aria-expanded={isMenuOpen}
      >
        <span className="menuBtnLine" />
        <span className="menuBtnLine" />
        <span className="menuBtnLine" />
      </button>

      <div className="topbarIdentityCard">
        <div className="topbarPharmacyBlock">
          <div className="topbarPharmacyAvatar logoImageBox" aria-hidden="true">
            {pharmacyLogo ? <img src={pharmacyLogo} alt="" /> : title.trim().charAt(0) || "P"}
          </div>
          <div className="topbarPharmacyContent">
            <span className="topbarSectionLabel topbarPharmacyLabel">
              {isArabic ? "الصيدلية" : "Pharmacy"}
            </span>
            <div className="topbarPharmacyTitleRow">
              <h1 className="topbarPharmacyName">{title}</h1>
              {showSubscriptionTier && (
                <div className="topbarPharmacyTier">
                  <span className={tierBadgeClass}>
                    {getSubscriptionTierLabel(subscriptionTier, isArabic)}
                  </span>
                  {tierUpgradePrompt && onOpenSubscriptionSettings ? (
                    <button
                      type="button"
                      className="topbarTierUpgradeBtn"
                      onClick={onOpenSubscriptionSettings}
                    >
                      {isArabic ? "ترقية" : "Upgrade"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {subtitle ? <p className="topbarPharmacySubtitle">{subtitle}</p> : null}
            {(pharmacyPhone || pharmacyAddress) && (
              <div className="topbarPharmacyMeta">
                {pharmacyPhone && (
                  <div className="topbarPharmacyMetaItem">
                    <span className="topbarPharmacyMetaIcon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M9.5 7h5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="topbarPharmacyMetaText" dir="ltr">
                      {pharmacyPhone}
                    </span>
                  </div>
                )}
                {pharmacyAddress && (
                  <div className="topbarPharmacyMetaItem">
                    <span className="topbarPharmacyMetaIcon" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </span>
                    <span className="topbarPharmacyMetaText">{pharmacyAddress}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="topbarIdentityDivider topbarIdentityDivider--actions" aria-hidden="true" />

        <div className="topbarControlsBlock">
          <div className="topbarActionRow topbarActionRow--controls">
            {showBranchSwitch && (
              <div className="topbarControlGroup">
                <span className="topbarSectionLabel">{isArabic ? "التحكم" : "Controls"}</span>
                <div className="topbarControlItems">
                  <label
                    className="topbarMetaChip topbarBranchChip"
                    title={isArabic ? "الفرع النشط" : "Active branch"}
                  >
                    <svg
                      className="topbarMetaIcon"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 20V8l8-4 8 4v12"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 20v-6h6v6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <BranchScopeSelect
                      pharmacies={branches}
                      value={branchSelectValue}
                      onChange={onSwitchBranch}
                      isArabic={isArabic}
                      includeAllBranches={canSwitchBranches}
                      aria-label={isArabic ? "الفرع النشط" : "Active branch"}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="topbarSearchColumn">
              <div className="topbarAccountInline">
                <div className="topbarAccountInlineMain">
                  {hasUserPhoto ? (
                    <div className="topbarAccountAvatar hasPhoto" aria-hidden="true">
                      <img src={userPhotoBase64} alt="" />
                    </div>
                  ) : null}
                  <span className="topbarAccountField">
                    <span className="topbarAccountFieldLabel">
                      {isArabic ? "اسم المستخدم" : "Username"}
                    </span>
                    <strong className="topbarAccountName">{appUser?.name}</strong>
                  </span>
                  <span className="topbarAccountField">
                    <span className="topbarAccountFieldLabel">{isArabic ? "الدور" : "Role"}</span>
                    <strong className="topbarAccountRoleValue">
                      {appUser ? getRoleLabel(appUser.role, isArabic) : ""}
                    </strong>
                  </span>
                </div>
                <div className="topbarAlertsSlot">{alertBellNode}</div>
              </div>
              <TopbarGlobalSearch
                isArabic={isArabic}
                t={t}
                allowedPages={globalSearchAllowedPages}
                medicines={medicines}
                invoices={invoices}
                customerDebts={customerDebts}
                canSearchMedicines={canSearchMedicines}
                canSearchInvoices={canSearchInvoices}
                canSearchCustomers={canSearchCustomers}
                onSelect={onGlobalSearchSelect}
                focusToken={globalSearchFocusToken}
              />
            </div>

            <div className="topbarUtilityStack">
              <div className="topbarUtilityIcons">
                <CustomerSupportPanel
                  isArabic={isArabic}
                  variant="topbar"
                  pharmacyName={title}
                  userName={appUser?.name || appUser?.email || undefined}
                  userEmail={appUser?.email}
                  userRole={appUser?.role}
                />

                <button
                  type="button"
                  className="topbarIconBtn topbarActionChip topbarActionChip--theme topbarActionChip--iconOnly"
                  onClick={onToggleTheme}
                  title={
                    isArabic
                      ? resolvedTheme === "dark"
                        ? "الوضع الفاتح"
                        : "الوضع الداكن"
                      : resolvedTheme === "dark"
                        ? "Light mode"
                        : "Dark mode"
                  }
                  aria-label={
                    isArabic
                      ? resolvedTheme === "dark"
                        ? "التبديل إلى الوضع الفاتح"
                        : "التبديل إلى الوضع الداكن"
                      : resolvedTheme === "dark"
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                  }
                >
                  <span className="topbarThemeIcon" aria-hidden="true">
                    {resolvedTheme === "dark" ? "☀️" : "🌙"}
                  </span>
                </button>

                <button
                  type="button"
                  className="topbarIconBtn topbarActionChip topbarActionChip--lang topbarActionChip--iconOnly"
                  onClick={onToggleLang}
                  title={t.langButton}
                  aria-label={t.langButton}
                >
                  <svg
                    className="topbarMetaIcon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                className="topbarActionChip topbarActionChip--logout topbarUtilityLogout"
                onClick={onLogout}
              >
                <svg
                  className="topbarMetaIcon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 12H3m0 0 3-3M3 12l3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{isArabic ? "تسجيل خروج" : "Logout"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
