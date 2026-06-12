import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, BranchStockTransfer, PharmacySettings, StockMovement } from "../types";
import { branchPreferenceStorageKey } from "../constants/branches";
import { formatBranchTransferActionError } from "../utils/branchTransferErrors";

type UseBranchOperationsOptions = {
  isArabic: boolean;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  branches: PharmacySettings[];
  pharmacySettings: PharmacySettings | null;
  appLogo: string;
  activeBranchId: string | null;
  setBranchTransfers: Dispatch<SetStateAction<BranchStockTransfer[]>>;
  setActiveBranchId: Dispatch<SetStateAction<string | null>>;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
  refreshMedicinesFromDb: () => Promise<void>;
  setStockMovements: Dispatch<SetStateAction<StockMovement[]>>;
  resetCart: () => void;
};

export function useBranchOperations({
  isArabic,
  appUser,
  user,
  branches,
  pharmacySettings,
  appLogo,
  activeBranchId,
  setBranchTransfers,
  setActiveBranchId,
  setIsMenuOpen,
  refreshMedicinesFromDb,
  setStockMovements,
  resetCart,
}: UseBranchOperationsOptions) {
  const refreshBranchTransfers = useCallback(async () => {
    setBranchTransfers(await pharmacyService.getBranchStockTransfers());
  }, [setBranchTransfers]);

  const printBranchTransferRecords = useCallback(
    async (records: BranchStockTransfer[]) => {
      const { buildBranchTransferPrintParams, printBranchTransferPDF } =
        await import("../utils/branchTransferPrint");
      const params = buildBranchTransferPrintParams({
        records,
        branches,
        isArabic,
        pharmacySettings,
        logoBase64: appLogo,
      });
      if (!params) return;
      printBranchTransferPDF(params);
    },
    [appLogo, branches, isArabic, pharmacySettings],
  );

  const handleBranchTransferComplete = useCallback(async () => {
    await refreshMedicinesFromDb();
    setStockMovements(await pharmacyService.getStockMovements());
    await refreshBranchTransfers();
  }, [refreshBranchTransfers, refreshMedicinesFromDb, setStockMovements]);

  const handleApproveBranchTransfer = useCallback(
    async (transferNumber: string) => {
      const confirmed = window.confirm(
        isArabic
          ? `اعتماد طلب النقل ${transferNumber} وتنفيذ حركة المخزون؟`
          : `Approve transfer ${transferNumber} and move stock?`,
      );
      if (!confirmed) return;
      try {
        const results = await pharmacyService.approveBranchStockTransferBatch({
          transferNumber,
          userId: user?.uid,
          userName: appUser?.name,
        });
        await handleBranchTransferComplete();
        alert(
          isArabic
            ? `تم اعتماد النقل (${results.length} صنف)`
            : `Transfer approved (${results.length} item(s))`,
        );
        const shouldPrint = window.confirm(
          isArabic ? "هل تريد طباعة سند النقل؟" : "Print the transfer document?",
        );
        if (shouldPrint) printBranchTransferRecords(results);
      } catch (error) {
        const message = error instanceof Error ? error.message : "approve_failed";
        alert(formatBranchTransferActionError(message, isArabic));
      }
    },
    [appUser?.name, handleBranchTransferComplete, isArabic, printBranchTransferRecords, user?.uid],
  );

  const handleRejectBranchTransfer = useCallback(
    async (transferNumber: string) => {
      const rejectionReason = window.prompt(
        isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):",
      );
      if (rejectionReason === null) return;
      try {
        await pharmacyService.rejectBranchStockTransferBatch({
          transferNumber,
          userId: user?.uid,
          userName: appUser?.name,
          rejectionReason,
        });
        await refreshBranchTransfers();
        alert(isArabic ? "تم رفض طلب النقل" : "Transfer request rejected");
      } catch (error) {
        const message = error instanceof Error ? error.message : "reject_failed";
        alert(formatBranchTransferActionError(message, isArabic));
      }
    },
    [appUser?.name, isArabic, refreshBranchTransfers, user?.uid],
  );

  const switchBranch = useCallback(
    (id: string) => {
      const current = activeBranchId || appUser?.pharmacyId;
      if (id === current) return;
      setActiveBranchId(id);
      pharmacyService.setActivePharmacy(id);
      if (appUser?.uid) {
        localStorage.setItem(branchPreferenceStorageKey(appUser.uid), id);
      }
      resetCart();
      setIsMenuOpen(false);
    },
    [
      activeBranchId,
      appUser?.pharmacyId,
      appUser?.uid,
      resetCart,
      setActiveBranchId,
      setIsMenuOpen,
    ],
  );

  return {
    refreshBranchTransfers,
    handleBranchTransferComplete,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    printBranchTransferRecords,
    switchBranch,
  };
}
