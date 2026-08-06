import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as pharmacyService from "../services/pharmacyService";
import { ALL_BRANCHES_ID, isAllBranchesMode } from "../constants/branches";
import { medicinesSeed } from "../data/medicinesSeed";
import { canViewOrgActivityLogs, isPharmacyManager, isSuperAdmin } from "../utils/roles";
import { mapPharmacySettingsToForm } from "../utils/pharmacySettingsForm";
import {
  buildAppDataCacheKey,
  loadAppDataSnapshot,
  saveAppDataSnapshot,
  type AppDataSnapshot,
} from "../utils/offlinePosStorage";
import { invalidateInvoicesQueries, invalidateMedicinesQueries, pharmacyQueryKeys } from "../queries/queryKeys";
import { syncInvoicesQueryCache } from "../queries/useInvoicesCatalogQuery";
import { syncMedicinesQueryCache } from "../queries/useMedicinesCatalogQuery";
import { useOnlineStatus } from "./useOnlineStatus";
import type {
  ActivityLog,
  AppUser,
  CustomerPayment,
  HeldInvoice,
  PharmacyCost,
  PharmacyLoginAccount,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  SubscriptionRequest,
  SystemUser,
} from "../types";

type UsePharmacyDataOptions = {
  appUser: AppUser | null;
  activeBranchId: string | null;
  branches: PharmacySettings[];
  isViewingAllBranches: boolean;
  scopeKey: string;
  heldInvoicesSetterRef: MutableRefObject<Dispatch<SetStateAction<HeldInvoice[]>>>;
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
  setPharmacySettings: Dispatch<SetStateAction<PharmacySettings | null>>;
  setSettingsForm: Dispatch<
    SetStateAction<import("../utils/pharmacySettingsForm").SettingsFormState>
  >;
  setReturns: Dispatch<SetStateAction<ReturnRecord[]>>;
  setPurchases: Dispatch<SetStateAction<PurchaseRecord[]>>;
  setCustomerPayments: Dispatch<SetStateAction<CustomerPayment[]>>;
  setPharmacyCosts: Dispatch<SetStateAction<PharmacyCost[]>>;
  setStockMovements: Dispatch<SetStateAction<StockMovement[]>>;
  setActivityLogs: Dispatch<SetStateAction<ActivityLog[]>>;
  setSubscriptionRequests: Dispatch<SetStateAction<SubscriptionRequest[]>>;
  setPendingPharmacyLoginAccounts: Dispatch<SetStateAction<PharmacyLoginAccount[]>>;
  setSystemUsers: Dispatch<SetStateAction<SystemUser[]>>;
};

export function usePharmacyData({
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
}: UsePharmacyDataOptions) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [appDataCacheAt, setAppDataCacheAt] = useState<string | null>(null);
  const wasOfflineRef = useRef(false);
  const loadDataRef = useRef<((user: AppUser, offlineOnly?: boolean) => Promise<void>) | null>(
    null,
  );

  useEffect(() => {
    const currentAppUser = appUser;
    if (!currentAppUser) return;

    const isAllBranches = isAllBranchesMode(activeBranchId);
    const scopedBranchId =
      activeBranchId && !isAllBranches ? activeBranchId : currentAppUser.pharmacyId;
    const settingsBranchId = isAllBranches
      ? currentAppUser.pharmacyId || "main"
      : scopedBranchId || "main";
    const cacheKey = buildAppDataCacheKey(currentAppUser.uid, settingsBranchId);

    pharmacyService.setActivePharmacy(
      isAllBranches ? ALL_BRANCHES_ID : activeBranchId || currentAppUser.pharmacyId,
    );

    const cleanup: Array<() => void> = [];

    function applySnapshot(snapshot: AppDataSnapshot) {
      setBranches(snapshot.branches);
      pharmacyService.setOrganizationBranchIds(snapshot.branches.map((branch) => branch.id));
      if (snapshot.pharmacySettings) {
        setPharmacySettings(snapshot.pharmacySettings);
        setSettingsForm(mapPharmacySettingsToForm(snapshot.pharmacySettings));
      }
      syncMedicinesQueryCache(queryClient, scopeKey, snapshot.medicines);
      syncInvoicesQueryCache(queryClient, scopeKey, snapshot.invoices);
      setReturns(snapshot.returns);
      setPurchases(snapshot.purchases);
      setCustomerPayments(snapshot.customerPayments);
      setPharmacyCosts(snapshot.pharmacyCosts);
      setStockMovements(snapshot.stockMovements);
      setActivityLogs(snapshot.activityLogs);
      heldInvoicesSetterRef.current(snapshot.heldInvoices);
      setAppDataCacheAt(snapshot.updatedAt);
    }

    async function loadData(user: AppUser, offlineOnly = false) {
      if (offlineOnly || (typeof navigator !== "undefined" && !navigator.onLine)) {
        const cached = await loadAppDataSnapshot(cacheKey);
        if (cached) applySnapshot(cached);
        return;
      }

      try {
        const branchesList = await pharmacyService.getPharmacies();
        setBranches(branchesList);
        pharmacyService.setOrganizationBranchIds(branchesList.map((branch) => branch.id));

        const pharmacySettings = await pharmacyService.getPharmacySettings(settingsBranchId);
        if (pharmacySettings) {
          setPharmacySettings(pharmacySettings);
          setSettingsForm(mapPharmacySettingsToForm(pharmacySettings));
        }

        if (isPharmacyManager(user) && !isAllBranches && scopedBranchId === "main") {
          const medicinesList = await queryClient.fetchQuery({
            queryKey: pharmacyQueryKeys.medicines(scopeKey),
            queryFn: () => pharmacyService.getMedicines(),
          });
          if (medicinesList.length === 0 && medicinesSeed.length > 0) {
            for (const medicine of medicinesSeed) {
              await pharmacyService.addMedicine(medicine);
            }
            await invalidateMedicinesQueries(queryClient, scopeKey);
          }
        }

        const loadedMedicines = await queryClient.fetchQuery({
          queryKey: pharmacyQueryKeys.medicines(scopeKey),
          queryFn: () => pharmacyService.getMedicines(),
        });
        const invoices = await queryClient.fetchQuery({
          queryKey: pharmacyQueryKeys.invoices(scopeKey),
          queryFn: () => pharmacyService.getInvoices(),
        });
        const returns = await pharmacyService.getReturns();
        setReturns(returns);
        const purchases = await pharmacyService.getPurchases();
        setPurchases(purchases);
        const customerPayments = await pharmacyService.getCustomerPayments();
        setCustomerPayments(customerPayments);

        let pharmacyCosts: PharmacyCost[] = [];
        try {
          pharmacyCosts = await pharmacyService.getPharmacyCosts();
          setPharmacyCosts(pharmacyCosts);
        } catch (costsError) {
          console.error("Load pharmacy costs error:", costsError);
          setPharmacyCosts([]);
        }

        const stockMovements = await pharmacyService.getStockMovements();
        setStockMovements(stockMovements);

        let activityLogs: ActivityLog[] = [];
        if (isAllBranches && branchesList.length > 0 && canViewOrgActivityLogs(user)) {
          activityLogs = await pharmacyService.getActivityLogsForPharmacies(
            branchesList.map((branch) => branch.id),
            500,
          );
        } else {
          activityLogs = await pharmacyService.getActivityLogs();
        }
        setActivityLogs(activityLogs);
        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        if (isSuperAdmin(user)) {
          setPendingPharmacyLoginAccounts(
            await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true }),
          );
        }

        let heldInvoices: HeldInvoice[] = [];
        try {
          heldInvoices = await pharmacyService.getHeldInvoices(settingsBranchId);
          heldInvoicesSetterRef.current(heldInvoices);
        } catch (heldError) {
          console.error("Load held invoices error:", heldError);
          heldInvoicesSetterRef.current([]);
        }

        if (isSuperAdmin(user)) {
          setSystemUsers(await pharmacyService.getAllSystemUsers());
        } else if (isPharmacyManager(user)) {
          setSystemUsers(await pharmacyService.getSystemUsers(settingsBranchId));
        }

        const snapshot: AppDataSnapshot = {
          cacheKey,
          updatedAt: new Date().toISOString(),
          branches: branchesList,
          pharmacySettings: pharmacySettings ?? null,
          medicines: loadedMedicines,
          invoices,
          returns,
          purchases,
          customerPayments,
          pharmacyCosts,
          stockMovements,
          activityLogs,
          heldInvoices,
        };
        await saveAppDataSnapshot(snapshot);
        setAppDataCacheAt(snapshot.updatedAt);
      } catch (error) {
        console.error("Initial data load error:", error);
        const cached = await loadAppDataSnapshot(cacheKey);
        if (cached) applySnapshot(cached);
      }
    }

    loadDataRef.current = loadData;

    const startOffline = typeof navigator !== "undefined" && !navigator.onLine;
    void loadData(currentAppUser, startOffline);

    cleanup.push(
      pharmacyService.subscribePharmacies((rows) => {
        setBranches(rows);
        pharmacyService.setOrganizationBranchIds(rows.map((branch) => branch.id));
      }),
    );

    cleanup.push(
      pharmacyService.subscribePharmacySettings(settingsBranchId, (settings) => {
        setPharmacySettings(settings);
        setSettingsForm(mapPharmacySettingsToForm(settings));
      }),
    );

    cleanup.push(
      pharmacyService.subscribeMedicines((rows) => {
        syncMedicinesQueryCache(queryClient, scopeKey, rows);
      }),
    );
    cleanup.push(
      pharmacyService.subscribeInvoices((rows) => {
        syncInvoicesQueryCache(queryClient, scopeKey, rows);
      }),
    );
    cleanup.push(pharmacyService.subscribeReturns(setReturns));
    cleanup.push(pharmacyService.subscribePurchases(setPurchases));
    cleanup.push(pharmacyService.subscribeCustomerPayments(setCustomerPayments));
    cleanup.push(pharmacyService.subscribePharmacyCosts(setPharmacyCosts));
    cleanup.push(pharmacyService.subscribeStockMovements(setStockMovements));
    cleanup.push(pharmacyService.subscribeActivityLogs(setActivityLogs));
    cleanup.push(pharmacyService.subscribeSubscriptionRequests(setSubscriptionRequests));
    cleanup.push(
      pharmacyService.subscribeHeldInvoices(
        (rows) => heldInvoicesSetterRef.current(rows),
        settingsBranchId,
      ),
    );

    if (isPharmacyManager(currentAppUser)) {
      cleanup.push(pharmacyService.subscribeUsers(settingsBranchId, setSystemUsers));
    }

    return () => {
      cleanup.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    activeBranchId,
    appUser,
    heldInvoicesSetterRef,
    queryClient,
    scopeKey,
    setActivityLogs,
    setBranches,
    setCustomerPayments,
    setPendingPharmacyLoginAccounts,
    setPharmacyCosts,
    setPharmacySettings,
    setPurchases,
    setReturns,
    setSettingsForm,
    setStockMovements,
    setSubscriptionRequests,
    setSystemUsers,
  ]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (!wasOfflineRef.current || !appUser) return;
    wasOfflineRef.current = false;
    void loadDataRef.current?.(appUser);
  }, [isOnline, appUser]);

  const reloadAppDataFromDb = useCallback(async () => {
    if (!appUser) return;
    await loadDataRef.current?.(appUser);
  }, [appUser]);

  const refreshPurchasesFromDb = useCallback(async () => {
    setPurchases(await pharmacyService.getPurchases());
  }, [setPurchases]);

  const refreshActivityLogsFromDb = useCallback(async () => {
    if (isViewingAllBranches && branches.length > 0 && canViewOrgActivityLogs(appUser)) {
      setActivityLogs(
        await pharmacyService.getActivityLogsForPharmacies(
          branches.map((branch) => branch.id),
          500,
        ),
      );
      return;
    }
    setActivityLogs(await pharmacyService.getActivityLogs());
  }, [appUser, branches, isViewingAllBranches, setActivityLogs]);

  const refreshPharmacyCostsFromDb = useCallback(async () => {
    try {
      setPharmacyCosts(await pharmacyService.getPharmacyCosts());
    } catch (error) {
      console.error("Refresh pharmacy costs error:", error);
      setPharmacyCosts([]);
    }
  }, [setPharmacyCosts]);

  return {
    appDataCacheAt,
    reloadAppDataFromDb,
    refreshPurchasesFromDb,
    refreshActivityLogsFromDb,
    refreshPharmacyCostsFromDb,
  };
}
