import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import { usePharmacySettings } from "../usePharmacySettings";
import { usePharmacyData } from "../usePharmacyData";
import { usePharmacyScopeKey } from "../../queries/usePharmacyScopeKey";
import { useMedicinesCatalogQuery } from "../../queries/useMedicinesCatalogQuery";
import { useInvoicesCatalogQuery } from "../../queries/useInvoicesCatalogQuery";
import type {
  ActivityLog,
  CustomerPayment,
  HeldInvoice,
  Invoice,
  Medicine,
  PharmacyCost,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  SubscriptionRequest,
  SystemUser,
} from "../../types";
import { isAllBranchesMode } from "../../constants/branches";
import {
  canShowOrgInventoryAlertsWithTier,
  canSwitchBranchesWithTier,
  resolveOrganizationTier,
} from "../../utils/subscriptionFeatures";
import { isSubscriptionWriteBlocked } from "../../utils/subscriptionAccess";
import { getSubscriptionStatus } from "../../utils/subscriptionStatus";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";
import type { AppSharedStateReturn } from "./shared";

type UseAppDataSliceInput = Pick<
  AppSharedStateReturn,
  "isArabic" | "onOpenInventoryExpiryView"
> &
  Pick<
    AppAuthSliceReturn,
    | "appUser"
    | "user"
    | "branches"
    | "setBranches"
    | "activeBranchId"
    | "getPharmacyId"
  >;

export function useAppDataSlice({
  isArabic,
  onOpenInventoryExpiryView,
  appUser,
  user,
  branches,
  setBranches,
  activeBranchId,
  getPharmacyId,
}: UseAppDataSliceInput) {
  const scopeKey = usePharmacyScopeKey(activeBranchId, appUser?.pharmacyId);
  const catalogEnabled = Boolean(appUser);

  const {
    medicines,
    setMedicines,
    refreshMedicinesFromDb,
  } = useMedicinesCatalogQuery(scopeKey, catalogEnabled);

  const { invoices, setInvoices } = useInvoicesCatalogQuery(scopeKey, catalogEnabled);

  const [orgAlertMedicines, setOrgAlertMedicines] = useState<Medicine[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [pharmacyCosts, setPharmacyCosts] = useState<PharmacyCost[]>([]);
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings | null>(null);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [pendingPharmacyLoginAccounts, setPendingPharmacyLoginAccounts] = useState<
    PharmacyLoginAccount[]
  >([]);
  const [pendingCustomRoles, setPendingCustomRoles] = useState<PharmacyCustomRole[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const heldInvoicesSetterRef = useRef<Dispatch<SetStateAction<HeldInvoice[]>>>(() => {});

  const appLogo = pharmacySettings?.logoBase64 || "/icon.svg";

  const orgSubscriptionTier = useMemo(
    () => resolveOrganizationTier(branches, appUser?.pharmacyId),
    [branches, appUser?.pharmacyId],
  );

  const subscriptionWriteBlocked = useMemo(
    () =>
      isSubscriptionWriteBlocked(
        appUser,
        getSubscriptionStatus(pharmacySettings).isSubscriptionExpired,
      ),
    [appUser, pharmacySettings],
  );

  const isViewingAllBranches = useMemo(
    () =>
      isAllBranchesMode(activeBranchId) &&
      canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length),
    [activeBranchId, appUser, orgSubscriptionTier, branches.length],
  );

  const showOrgInventoryAlerts = canShowOrgInventoryAlertsWithTier(
    appUser,
    orgSubscriptionTier,
    branches.length,
  );

  const addActivityLog = useCallback(
    async (data: {
      type: string;
      title: string;
      description: string;
      referenceType?: string;
      referenceId?: string;
      pharmacyId?: string;
    }) => {
      if (subscriptionWriteBlocked) return;
      try {
        const logId = Date.now();
        const logRecord: ActivityLog = {
          id: logId,
          type: data.type,
          title: data.title,
          description: data.description,
          referenceType: data.referenceType || "",
          referenceId: data.referenceId || "",
          pharmacyId: data.pharmacyId || getPharmacyId(),
          userId: user?.uid || "",
          userName: appUser?.name || "",
          createdAt: new Date().toISOString(),
        };
        await pharmacyService.addActivityLog(logRecord);
      } catch (error) {
        console.error("Activity log error:", error);
      }
    },
    [appUser?.name, getPharmacyId, subscriptionWriteBlocked, user?.uid],
  );

  const {
    settingsForm,
    setSettingsForm,
    handleLogoUpload,
    savePharmacySettings,
    handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest,
  } = usePharmacySettings({
    isArabic,
    appUser,
    pharmacySettings,
    setPharmacySettings,
    medicines,
    branches,
    getPharmacyId,
    addActivityLog,
    onOpenInventoryExpiryView,
  });

  const { refreshPurchasesFromDb, refreshActivityLogsFromDb, refreshPharmacyCostsFromDb, appDataCacheAt, reloadAppDataFromDb } =
    usePharmacyData({
      appUser,
      activeBranchId,
      branches,
      isViewingAllBranches,
      scopeKey,
      heldInvoicesSetterRef,
      setBranches,
      setPharmacySettings,
      setSettingsForm,
      setReturns,
      setPurchases,
      setCustomerPayments,
      setPharmacyCosts,
      setStockMovements,
      setActivityLogs,
      setSubscriptionRequests,
      setPendingPharmacyLoginAccounts,
      setSystemUsers,
    });

  useEffect(() => {
    if (!showOrgInventoryAlerts) {
      setOrgAlertMedicines([]);
      return;
    }

    let cancelled = false;
    const branchIds = branches.map((branch) => branch.id);

    void pharmacyService.getMedicinesForPharmacies(branchIds).then((rows) => {
      if (!cancelled) setOrgAlertMedicines(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [showOrgInventoryAlerts, branches]);

  return {
    medicines,
    setMedicines,
    orgAlertMedicines,
    setOrgAlertMedicines,
    invoices,
    setInvoices,
    stockMovements,
    setStockMovements,
    returns,
    setReturns,
    purchases,
    setPurchases,
    activityLogs,
    setActivityLogs,
    customerPayments,
    setCustomerPayments,
    pharmacyCosts,
    setPharmacyCosts,
    pharmacySettings,
    setPharmacySettings,
    appLogo,
    heldInvoicesSetterRef,
    refreshMedicinesFromDb,
    addActivityLog,
    settingsForm,
    setSettingsForm,
    handleLogoUpload,
    savePharmacySettings,
    handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest,
    refreshPurchasesFromDb,
    refreshActivityLogsFromDb,
    refreshPharmacyCostsFromDb,
    appDataCacheAt,
    reloadAppDataFromDb,
    subscriptionRequests,
    setSubscriptionRequests,
    pendingPharmacyLoginAccounts,
    setPendingPharmacyLoginAccounts,
    pendingCustomRoles,
    setPendingCustomRoles,
    systemUsers,
    setSystemUsers,
  };
}

export type AppDataSliceReturn = ReturnType<typeof useAppDataSlice>;
