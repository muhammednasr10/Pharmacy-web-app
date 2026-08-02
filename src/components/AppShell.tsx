import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import ErrorBoundary from "./ErrorBoundary";
import AppNavBar from "./AppNavBar";
import BranchScopeBanner from "./BranchScopeBanner";
import PreviewDeployBanner from "./PreviewDeployBanner";
import Sidebar from "./Sidebar";
import Topbar, { type AlertItem } from "./Topbar";
import type { AppTranslation } from "../i18n/appTranslations";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import { canSwitchBranchesWithTier, type TierUpgradePrompt } from "../utils/subscriptionFeatures";
import type { AppUser, CustomerDebt, Invoice, Lang, Medicine, Page, PharmacySettings } from "../types";
import type { GlobalSearchResult } from "../utils/globalSearch";
import { getPageLabel, pageIcons } from "../utils/navigation";
import * as pharmacyService from "../services/pharmacyService";

export type AppShellProps = {
  isArabic: boolean;
  lang: Lang;
  t: AppTranslation;
  resolvedTheme: "light" | "dark";
  displayPage: Page;
  allowedPages: Page[];
  adminNavBadges?: Partial<Record<Page, number>>;
  topbarPharmacyTitle: string;
  writeBranchLabel: string;
  isViewingAllBranches: boolean;
  branchesCount: number;
  pharmacySettings: PharmacySettings | null;
  appLogo: string;
  appUser: AppUser | null;
  orgSubscriptionTier: SubscriptionTier;
  branches: PharmacySettings[];
  activeBranchId: string | null;
  alertItems: AlertItem[];
  alertTotal: number;
  isMenuOpen: boolean;
  onToggleLang: () => void;
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
  onSwitchBranch: (branchId: string) => void;
  onSelectPage: (page: Page) => void;
  onAlertNavigate: (filter: "low" | "expiring" | "expired") => void;
  onCloseMenu: () => void;
  resolveBranchLabel: (branchId?: string) => string;
  onOpenSubscriptionSettings: () => void;
  tierUpgradePrompt: TierUpgradePrompt | null;
  children: ReactNode;
  modals?: ReactNode;
};

export default function AppShell({
  isArabic,
  lang,
  t,
  resolvedTheme,
  displayPage,
  allowedPages,
  adminNavBadges,
  topbarPharmacyTitle,
  writeBranchLabel,
  isViewingAllBranches,
  branchesCount,
  pharmacySettings,
  appLogo,
  appUser,
  orgSubscriptionTier,
  branches,
  activeBranchId,
  alertItems,
  alertTotal,
  isMenuOpen,
  onToggleLang,
  onToggleTheme,
  globalSearchAllowedPages,
  medicines,
  invoices,
  customerDebts,
  canSearchMedicines,
  canSearchInvoices,
  canSearchCustomers,
  onGlobalSearchSelect,
  globalSearchFocusToken,
  onLogout,
  onToggleMenu,
  onSwitchBranch,
  onSelectPage,
  onAlertNavigate,
  onCloseMenu,
  resolveBranchLabel,
  onOpenSubscriptionSettings,
  tierUpgradePrompt,
  children,
  modals,
}: AppShellProps) {
  const [userPhotoBase64, setUserPhotoBase64] = useState("");

  useEffect(() => {
    if (!appUser) {
      setUserPhotoBase64("");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [employees, accounts, loginRequests, catalogAccounts] = await Promise.all([
          pharmacyService.getEmployees(),
          pharmacyService.getSystemUsers(appUser.pharmacyId),
          pharmacyService.getPharmacyLoginAccountRequests(appUser.pharmacyId),
          pharmacyService.getPharmacyLoginAccounts(appUser.pharmacyId),
        ]);
        if (cancelled) return;

        const linked = pharmacyService.resolveLinkedEmployeeFromData(
          appUser,
          employees,
          accounts,
          loginRequests,
          catalogAccounts,
        );
        setUserPhotoBase64(linked?.photoBase64?.trim() || "");
      } catch {
        if (!cancelled) setUserPhotoBase64("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser?.uid, appUser?.employeeId, appUser?.pharmacyId]);

  const activeBranchDisplay = resolveBranchDisplay(
    appUser?.pharmacyId,
    branches,
    isArabic,
  );
  const topbarSubtitle = isViewingAllBranches
    ? isArabic
      ? `عرض مجمّع لـ ${branchesCount} فروع — التسجيل على فرع: ${writeBranchLabel}`
      : `Combined view of ${branchesCount} branches — writes go to: ${writeBranchLabel}`
    : "";

  return (
    <div className="app" dir={isArabic ? "rtl" : "ltr"}>
      <main className="content">
        <div className="appStickyHeader">
          <Topbar
            title={topbarPharmacyTitle}
            subtitle={topbarSubtitle}
            pharmacyPhone={pharmacySettings?.phone || ""}
            pharmacyAddress={pharmacySettings?.address || ""}
            pharmacyLogo={appLogo}
            subscriptionTier={orgSubscriptionTier}
            tierUpgradePrompt={tierUpgradePrompt}
            onOpenSubscriptionSettings={onOpenSubscriptionSettings}
            appUser={appUser}
            isArabic={isArabic}
            t={t}
            lang={lang}
            onToggleLang={onToggleLang}
            resolvedTheme={resolvedTheme}
            onToggleTheme={onToggleTheme}
            globalSearchAllowedPages={globalSearchAllowedPages}
            medicines={medicines}
            invoices={invoices}
            customerDebts={customerDebts}
            canSearchMedicines={canSearchMedicines}
            canSearchInvoices={canSearchInvoices}
            canSearchCustomers={canSearchCustomers}
            onGlobalSearchSelect={onGlobalSearchSelect}
            globalSearchFocusToken={globalSearchFocusToken}
            onLogout={onLogout}
            onToggleMenu={onToggleMenu}
            isMenuOpen={isMenuOpen}
            branches={branches}
            activeBranchId={activeBranchId}
            onSwitchBranch={onSwitchBranch}
            allowBranchSwitch={canSwitchBranchesWithTier(
              appUser,
              orgSubscriptionTier,
              branches.length,
            )}
            alertItems={alertItems}
            alertTotal={alertTotal}
            onAlertNavigate={onAlertNavigate}
            userPhotoBase64={userPhotoBase64}
          />

          <AppNavBar
            activePage={displayPage}
            allowedPages={allowedPages}
            isArabic={isArabic}
            t={t}
            pageBadges={adminNavBadges}
            onSelectPage={onSelectPage}
          />

          <div className="mobilePageBar" aria-label={isArabic ? "الصفحة الحالية" : "Current page"}>
            <span className="mobilePageBarIcon" aria-hidden="true">
              {pageIcons[displayPage]}
            </span>
            <span className="mobilePageBarLabel">{getPageLabel(displayPage, isArabic, t)}</span>
          </div>
        </div>

        <PreviewDeployBanner isArabic={isArabic} />

        <BranchScopeBanner
          isArabic={isArabic}
          appUser={appUser}
          branchDisplay={activeBranchDisplay}
        />

        <ErrorBoundary isArabic={isArabic}>
          {children}
        </ErrorBoundary>
      </main>

      <Sidebar
        activePage={displayPage}
        allowedPages={allowedPages}
        isArabic={isArabic}
        t={t}
        pharmacyName={
          isArabic
            ? pharmacySettings?.name || "صيدلية Focus"
            : pharmacySettings?.name_en || "Focus Pharmacy"
        }
        pharmacyPhone={pharmacySettings?.phone || (isArabic ? "نظام إدارة" : "Management System")}
        pharmacyLogo={appLogo}
        isOpen={isMenuOpen}
        onCloseMenu={onCloseMenu}
        pageBadges={adminNavBadges}
        onSelectPage={(page) => {
          onSelectPage(page);
          onCloseMenu();
        }}
      />

      {modals}
    </div>
  );
}
