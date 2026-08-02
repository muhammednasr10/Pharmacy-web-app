import { useCallback, useEffect, startTransition } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import { ALL_BRANCHES_ID, isAllBranchesMode } from "../constants/branches";
import { canViewOrgActivityLogs, isPharmacyManager, isSuperAdmin } from "../utils/roles";
import { mapPharmacySettingsToForm } from "../utils/pharmacySettingsForm";
import type {
  ActivityLog,
  AppUser,
  CustomerPayment,
  HeldInvoice,
  Invoice,
  Medicine,
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
  medicinesSeed: Medicine[];
  heldInvoicesSetterRef: MutableRefObject<Dispatch<SetStateAction<HeldInvoice[]>>>;
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
  setPharmacySettings: Dispatch<SetStateAction<PharmacySettings | null>>;
  setSettingsForm: Dispatch<
    SetStateAction<import("../utils/pharmacySettingsForm").SettingsFormState>
  >;
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  setInvoices: Dispatch<SetStateAction<Invoice[]>>;
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
  medicinesSeed,
  heldInvoicesSetterRef,
  setBranches,
  setPharmacySettings,
  setSettingsForm,
  setMedicines,
  setInvoices,
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
  useEffect(() => {
    const currentAppUser = appUser;
    if (!currentAppUser) return;

    const isAllBranches = isAllBranchesMode(activeBranchId);
    const scopedBranchId =
      activeBranchId && !isAllBranches ? activeBranchId : currentAppUser.pharmacyId;
    const settingsBranchId = isAllBranches
      ? currentAppUser.pharmacyId || "main"
      : scopedBranchId || "main";

    pharmacyService.setActivePharmacy(
      isAllBranches ? ALL_BRANCHES_ID : activeBranchId || currentAppUser.pharmacyId,
    );

    const cleanup: Array<() => void> = [];

    async function loadData(user: AppUser) {
      const branchesList = await pharmacyService.getPharmacies();
      setBranches(branchesList);
      pharmacyService.setOrganizationBranchIds(branchesList.map((branch) => branch.id));

      const pharmacySettings = await pharmacyService.getPharmacySettings(settingsBranchId);
      if (pharmacySettings) {
        setPharmacySettings(pharmacySettings);
        setSettingsForm(mapPharmacySettingsToForm(pharmacySettings));
      }

      if (isPharmacyManager(user) && !isAllBranches && scopedBranchId === "main") {
        const medicinesList = await pharmacyService.getMedicines();
        if (medicinesList.length === 0 && medicinesSeed.length > 0) {
          for (const medicine of medicinesSeed) {
            await pharmacyService.addMedicine(medicine);
          }
        }
      }

      const loadedMedicines = await pharmacyService.getMedicines();
      startTransition(() => {
        setMedicines(loadedMedicines);
      });
      setInvoices(await pharmacyService.getInvoices());
      setReturns(await pharmacyService.getReturns());
      setPurchases(await pharmacyService.getPurchases());
      setCustomerPayments(await pharmacyService.getCustomerPayments());
      try {
        setPharmacyCosts(await pharmacyService.getPharmacyCosts());
      } catch (costsError) {
        console.error("Load pharmacy costs error:", costsError);
        setPharmacyCosts([]);
      }
      setStockMovements(await pharmacyService.getStockMovements());
      if (isAllBranches && branchesList.length > 0 && canViewOrgActivityLogs(user)) {
        setActivityLogs(
          await pharmacyService.getActivityLogsForPharmacies(
            branchesList.map((branch) => branch.id),
            500,
          ),
        );
      } else {
        setActivityLogs(await pharmacyService.getActivityLogs());
      }
      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      if (isSuperAdmin(user)) {
        setPendingPharmacyLoginAccounts(
          await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true }),
        );
      }
      try {
        heldInvoicesSetterRef.current(await pharmacyService.getHeldInvoices(settingsBranchId));
      } catch (heldError) {
        console.error("Load held invoices error:", heldError);
        heldInvoicesSetterRef.current([]);
      }

      if (isSuperAdmin(user)) {
        setSystemUsers(await pharmacyService.getAllSystemUsers());
      } else if (isPharmacyManager(user)) {
        setSystemUsers(await pharmacyService.getSystemUsers(settingsBranchId));
      }
    }

    loadData(currentAppUser).catch((error) => {
      console.error("Initial data load error:", error);
    });

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
        startTransition(() => setMedicines(rows));
      }),
    );
    cleanup.push(pharmacyService.subscribeInvoices(setInvoices));
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
    medicinesSeed,
    setActivityLogs,
    setBranches,
    setCustomerPayments,
    setInvoices,
    setMedicines,
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
    refreshPurchasesFromDb,
    refreshActivityLogsFromDb,
    refreshPharmacyCostsFromDb,
  };
}
