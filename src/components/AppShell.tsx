import type { ReactNode } from "react";
import AppNavBar from "./AppNavBar";
import BranchScopeBanner from "./BranchScopeBanner";
import PreviewDeployBanner from "./PreviewDeployBanner";
import Sidebar from "./Sidebar";
import Topbar, { type AlertItem } from "./Topbar";
import type { AppTranslation } from "../i18n/appTranslations";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import { canSwitchBranchesWithTier } from "../utils/subscriptionFeatures";
import type { AppUser, Lang, Page, PharmacySettings } from "../types";

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
  onOpenGlobalSearch: () => void;
  onLogout: () => void;
  onToggleMenu: () => void;
  onSwitchBranch: (branchId: string) => void;
  onSelectPage: (page: Page) => void;
  onAlertNavigate: (filter: "low" | "expiring" | "expired") => void;
  onCloseMenu: () => void;
  resolveBranchLabel: (branchId?: string) => string;
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
  onOpenGlobalSearch,
  onLogout,
  onToggleMenu,
  onSwitchBranch,
  onSelectPage,
  onAlertNavigate,
  onCloseMenu,
  resolveBranchLabel,
  children,
  modals,
}: AppShellProps) {
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
            appUser={appUser}
            isArabic={isArabic}
            t={t}
            lang={lang}
            onToggleLang={onToggleLang}
            resolvedTheme={resolvedTheme}
            onToggleTheme={onToggleTheme}
            onOpenGlobalSearch={onOpenGlobalSearch}
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
          />

          <AppNavBar
            activePage={displayPage}
            allowedPages={allowedPages}
            isArabic={isArabic}
            t={t}
            pageBadges={adminNavBadges}
            onSelectPage={onSelectPage}
          />
        </div>

        <PreviewDeployBanner isArabic={isArabic} />

        <BranchScopeBanner
          isArabic={isArabic}
          appUser={appUser}
          branchLabel={resolveBranchLabel(appUser?.pharmacyId)}
        />

        {children}
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
