import { useCallback, useEffect, useMemo, useState } from "react";
import { appTranslations } from "../../i18n/appTranslations";
import { formatDateInput } from "../../utils/date";
import { useDisplayPreferences } from "../useDisplayPreferences";
import type { Lang, Medicine, Page, PaymentMethod } from "../../types";
import type { SettingsTab } from "../../pages/lazyPages";
import { getBranchLabel as formatBranchLabel } from "../../utils/branchLabel";
import { filterMedicinesForPharmacy } from "../../utils/medicineLookup";
import { isAllBranchesMode } from "../../constants/branches";
import {
  canShowOrgInventoryAlertsWithTier,
  canSwitchBranchesWithTier,
  canViewBranchBreakdownWithTier,
  getTierFeatures,
  getTierUpgradeNotice,
  getTierUpgradePrompt,
  resolveOrganizationTier,
} from "../../utils/subscriptionFeatures";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";

export function useAppSharedState() {
  const { themeMode, fontScale, resolvedTheme, setThemeMode, setFontScale, toggleTheme } =
    useDisplayPreferences();
  const [lang, setLang] = useState<Lang>("ar");
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [globalSearchFocusToken, setGlobalSearchFocusToken] = useState(0);
  const [customerSearchSeed, setCustomerSearchSeed] = useState("");
  const [customerPaymentModalRequest, setCustomerPaymentModalRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [posMessage, setPosMessage] = useState("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "low" | "expiring" | "expired"
  >("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [invoiceFromDate, setInvoiceFromDate] = useState("");
  const [invoiceToDate, setInvoiceToDate] = useState("");
  const [reportFrom, setReportFrom] = useState(formatDateInput(new Date()));
  const [reportTo, setReportTo] = useState(formatDateInput(new Date()));
  const [dashboardPeriod, setDashboardPeriod] = useState<"today" | "7days" | "month" | "custom">(
    "today",
  );
  const [dashboardFromDate, setDashboardFromDate] = useState(formatDateInput(new Date()));
  const [dashboardToDate, setDashboardToDate] = useState(formatDateInput(new Date()));

  const t = appTranslations[lang];
  const isArabic = lang === "ar";

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (activePage !== "settings") {
      setSettingsInitialTab(undefined);
    }
  }, [activePage]);

  function openSubscriptionSettings() {
    setSettingsInitialTab("subscription");
    setActivePage("settings");
  }

  const onOpenInventoryExpiryView = useCallback(() => {
    setActivePage("inventory");
    setInventoryStatusFilter("expiring");
    setQuery("");
  }, []);

  const goToCustomerPaymentForm = useCallback(() => {
    setActivePage("customers");
    setCustomerPaymentModalRequest((count) => count + 1);
  }, []);

  const focusGlobalSearch = useCallback(() => {
    setGlobalSearchFocusToken((token) => token + 1);
  }, []);

  return {
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    toggleTheme,
    lang,
    setLang,
    isArabic,
    t,
    activePage,
    setActivePage,
    settingsInitialTab,
    setSettingsInitialTab,
    openSubscriptionSettings,
    isMenuOpen,
    setIsMenuOpen,
    query,
    setQuery,
    globalSearchFocusToken,
    focusGlobalSearch,
    customerSearchSeed,
    setCustomerSearchSeed,
    customerPaymentModalRequest,
    setCustomerPaymentModalRequest,
    inventoryStatusFilter,
    setInventoryStatusFilter,
    invoiceSearch,
    setInvoiceSearch,
    invoicePaymentFilter,
    setInvoicePaymentFilter,
    invoiceFromDate,
    setInvoiceFromDate,
    invoiceToDate,
    setInvoiceToDate,
    reportFrom,
    setReportFrom,
    reportTo,
    setReportTo,
    dashboardPeriod,
    setDashboardPeriod,
    dashboardFromDate,
    setDashboardFromDate,
    dashboardToDate,
    setDashboardToDate,
    posMessage,
    setPosMessage,
    onOpenInventoryExpiryView,
    goToCustomerPaymentForm,
  };
}

export type AppSharedStateReturn = ReturnType<typeof useAppSharedState>;

export function useAppOrgContext(
  shared: Pick<AppSharedStateReturn, "isArabic">,
  auth: Pick<AppAuthSliceReturn, "appUser" | "branches" | "activeBranchId">,
  medicines: Medicine[],
) {
  const { isArabic } = shared;
  const { appUser, branches, activeBranchId } = auth;

  const writeBranchLabel = useMemo(() => {
    return formatBranchLabel(appUser?.pharmacyId, branches, isArabic);
  }, [branches, appUser?.pharmacyId, isArabic]);

  const resolveBranchLabel = useCallback(
    (branchId: string | undefined) => formatBranchLabel(branchId, branches, isArabic),
    [branches, isArabic],
  );

  const orgSubscriptionTier = useMemo(
    () => resolveOrganizationTier(branches, appUser?.pharmacyId),
    [branches, appUser?.pharmacyId],
  );

  const showBranchBreakdown = useMemo(
    () => canViewBranchBreakdownWithTier(appUser, orgSubscriptionTier, branches.length),
    [appUser, orgSubscriptionTier, branches.length],
  );

  const orgTierFeatures = useMemo(
    () => getTierFeatures(orgSubscriptionTier),
    [orgSubscriptionTier],
  );

  const tierUpgradePrompt = useMemo(
    () => getTierUpgradePrompt(appUser, orgSubscriptionTier, isArabic),
    [appUser, orgSubscriptionTier, isArabic],
  );

  const transferUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchTransfers",
        isArabic,
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic],
  );

  const branchBreakdownUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchBreakdownReports",
        isArabic,
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic],
  );

  const isViewingAllBranches = useMemo(
    () =>
      isAllBranchesMode(activeBranchId) &&
      canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length),
    [activeBranchId, appUser, orgSubscriptionTier, branches.length],
  );

  const posBranchId = useMemo(() => {
    if (activeBranchId && !isAllBranchesMode(activeBranchId)) {
      return activeBranchId;
    }
    return appUser?.pharmacyId || "default-pharmacy";
  }, [activeBranchId, appUser?.pharmacyId]);

  const branchMedicines = useMemo(
    () => filterMedicinesForPharmacy(medicines, posBranchId),
    [medicines, posBranchId],
  );

  const showOrgInventoryAlerts = canShowOrgInventoryAlertsWithTier(
    appUser,
    orgSubscriptionTier,
    branches.length,
  );

  return {
    writeBranchLabel,
    resolveBranchLabel,
    orgSubscriptionTier,
    showBranchBreakdown,
    orgTierFeatures,
    tierUpgradePrompt,
    transferUpgradeNotice,
    branchBreakdownUpgradeNotice,
    isViewingAllBranches,
    posBranchId,
    branchMedicines,
    showOrgInventoryAlerts,
  };
}

export type AppOrgContextReturn = ReturnType<typeof useAppOrgContext>;
