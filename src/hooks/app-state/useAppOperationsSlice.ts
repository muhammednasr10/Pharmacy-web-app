import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import { getShiftDisplayName } from "../../utils/workSchedule";
import { useOnlineStatus } from "../useOnlineStatus";
import { usePosCart } from "../usePosCart";
import { usePosSales } from "../usePosSales";
import { useMedicineManagement } from "../useMedicineManagement";
import { useReturns } from "../useReturns";
import { useBranchOperations } from "../useBranchOperations";
import { useOfflinePosSync } from "../useOfflinePosSync";
import {
  getPaymentLabel as formatPaymentLabel,
  showSubscriptionExpiredAlert as alertSubscriptionExpired,
} from "../../utils/appLabels";
import {
  canApproveBranchStockTransfer,
} from "../../utils/roles";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
} from "../../utils/subscriptionFeatures";
import { isAllBranchesMode } from "../../constants/branches";
import type {
  BranchStockTransfer,
  CashierShift,
  Invoice,
  Medicine,
} from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";
import type { AppDataSliceReturn } from "./useAppDataSlice";
import type { AppOrgContextReturn, AppSharedStateReturn } from "./shared";
import type { useAppPermissions } from "../useAppPermissions";

type AppPermissionsReturn = ReturnType<typeof useAppPermissions>;

type UseAppOperationsSliceInput = Pick<
  AppSharedStateReturn,
  "isArabic" | "t" | "activePage" | "setActivePage" | "setIsMenuOpen"
> &
  Pick<
    AppAuthSliceReturn,
    "user" | "appUser" | "branches" | "activeBranchId" | "setActiveBranchId" | "getPharmacyId"
  > &
  Pick<
    AppDataSliceReturn,
    | "medicines"
    | "setMedicines"
    | "invoices"
    | "returns"
    | "setReturns"
    | "setStockMovements"
    | "pharmacySettings"
    | "appLogo"
    | "heldInvoicesSetterRef"
    | "refreshMedicinesFromDb"
    | "reloadAppDataFromDb"
    | "addActivityLog"
  > &
  Pick<AppOrgContextReturn, "branchMedicines" | "isViewingAllBranches"> & {
    orgSubscriptionTier: SubscriptionTier;
    canUseSystemActions: AppPermissionsReturn["canUseSystemActions"];
    canUsePOS: AppPermissionsReturn["canUsePOS"];
    canManageInventory: AppPermissionsReturn["canManageInventory"];
    canDeleteMedicine: AppPermissionsReturn["canDeleteMedicine"];
    canUseReturns: AppPermissionsReturn["canUseReturns"];
    canDeleteReturn: AppPermissionsReturn["canDeleteReturn"];
  };

export function useAppOperationsSlice({
  isArabic,
  t,
  activePage,
  setActivePage,
  setIsMenuOpen,
  user,
  appUser,
  branches,
  activeBranchId,
  setActiveBranchId,
  getPharmacyId,
  medicines,
  setMedicines,
  invoices,
  returns,
  setReturns,
  setStockMovements,
  pharmacySettings,
  appLogo,
  heldInvoicesSetterRef,
  refreshMedicinesFromDb,
  reloadAppDataFromDb,
  addActivityLog,
  branchMedicines,
  isViewingAllBranches,
  orgSubscriptionTier,
  canUseSystemActions,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  canUseReturns,
  canDeleteReturn,
}: UseAppOperationsSliceInput) {
  const isOnline = useOnlineStatus();
  const [branchTransfers, setBranchTransfers] = useState<BranchStockTransfer[]>([]);
  const [availabilityModal, setAvailabilityModal] = useState<{
    medicine: Medicine;
    rows: Array<{
      pharmacyId: string;
      qty: number;
      expiry?: string;
      price?: number;
    }>;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [currentWorkShiftId, setCurrentWorkShiftId] = useState<string>("");
  const [currentWorkShiftLabel, setCurrentWorkShiftLabel] = useState<string>("");
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const {
    cart,
    setCart,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    customerName,
    setCustomerName,
    subtotal,
    safeDiscount,
    total,
    cartItemsCount,
    cartTotalQty,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    resetCart,
  } = usePosCart({
    medicines: branchMedicines,
    isArabic,
    isViewingAllBranches,
    isOnline,
  });

  const refreshActiveCashierShift = useCallback(async () => {
    const pharmacyId = getPharmacyId();
    const uid = appUser?.uid;
    if (!pharmacyId || !uid || isAllBranchesMode(pharmacyId)) {
      setActiveCashierShift(null);
      return null;
    }
    const shift = await pharmacyService.getOpenCashierShift(pharmacyId, uid);
    setActiveCashierShift(shift);
    return shift;
  }, [appUser?.uid, getPharmacyId]);

  const branchTransferGroups = useMemo(() => {
    const grouped = new Map<string, BranchStockTransfer[]>();
    for (const row of branchTransfers) {
      const list = grouped.get(row.transferNumber) || [];
      list.push(row);
      grouped.set(row.transferNumber, list);
    }
    return Array.from(grouped.entries()).map(([transferNumber, items]) => ({
      transferNumber,
      items,
      fromPharmacyId: items[0]?.fromPharmacyId,
      toPharmacyId: items[0]?.toPharmacyId,
      createdAt: items[0]?.createdAt,
      status: items[0]?.status || "completed",
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }, [branchTransfers]);

  const pendingBranchTransferGroups = useMemo(() => {
    if (!canReviewBranchTransfersWithTier(appUser, orgSubscriptionTier, branches.length)) {
      return [];
    }
    return branchTransferGroups.filter(
      (group) =>
        group.status === "pending" &&
        group.toPharmacyId &&
        canApproveBranchStockTransfer(appUser, group.toPharmacyId),
    );
  }, [branchTransferGroups, appUser, orgSubscriptionTier, branches.length]);

  const completedBranchTransferGroups = useMemo(
    () => branchTransferGroups.filter((group) => group.status !== "pending"),
    [branchTransferGroups],
  );

  function getPaymentLabel(method: string) {
    return formatPaymentLabel(method, isArabic);
  }

  function showSubscriptionExpiredAlert() {
    alertSubscriptionExpired(isArabic);
  }

  const {
    refreshBranchTransfers,
    handleBranchTransferComplete,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    printBranchTransferRecords,
    switchBranch,
  } = useBranchOperations({
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
  });

  useEffect(() => {
    const shouldLoadOrgHistory =
      activePage === "branches" &&
      branches.length > 1 &&
      canManageOrgBranchesWithTier(appUser, orgSubscriptionTier);
    const shouldLoadPendingReview = canReviewBranchTransfersWithTier(
      appUser,
      orgSubscriptionTier,
      branches.length,
    );
    if (!shouldLoadOrgHistory && !shouldLoadPendingReview) return;
    void refreshBranchTransfers();
  }, [activePage, branches.length, appUser?.uid, activeBranchId, orgSubscriptionTier]);

  useEffect(() => {
    if (!appUser) {
      setCurrentWorkShiftId("");
      setCurrentWorkShiftLabel("");
      return;
    }
    void pharmacyService.resolveWorkShiftForUser(appUser).then((ctx) => {
      if (!ctx) {
        setCurrentWorkShiftId("");
        setCurrentWorkShiftLabel("");
        return;
      }
      setCurrentWorkShiftId(ctx.shiftId);
      setCurrentWorkShiftLabel(getShiftDisplayName(ctx.shiftId, ctx.shifts, isArabic));
    });
  }, [appUser, isArabic]);

  const {
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  } = useOfflinePosSync({
    isOnline,
    isArabic,
    appUser,
    activeBranchId,
    medicines: branchMedicines,
    setMedicines,
    activeCashierShift,
    getPharmacyId,
    refreshMedicinesFromDb,
    reloadAppDataFromDb,
    refreshActiveCashierShift,
  });

  const {
    isSelling,
    heldInvoices,
    setHeldInvoices,
    showHeldInvoicesModal,
    setShowHeldInvoicesModal,
    isHolding,
    isHeldInvoiceProcessing,
    printSavedInvoice,
    completeSale,
    refreshHeldInvoices,
    openHeldInvoicesModal,
    handleHoldInvoice,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
  } = usePosSales({
    isArabic,
    t,
    appUser,
    user,
    medicines,
    setMedicines,
    pharmacySettings,
    activeCashierShift,
    currentWorkShiftId,
    cart,
    discount,
    subtotal,
    safeDiscount,
    total,
    paymentMethod,
    customerName,
    setCart,
    setDiscount,
    setPaymentMethod,
    setCustomerName,
    resetCart,
    getPharmacyId,
    getPaymentLabel,
    canUseSystemActions,
    canUsePOS,
    showSubscriptionExpiredAlert,
    addActivityLog,
    refreshMedicinesFromDb,
    refreshActiveCashierShift,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  });

  heldInvoicesSetterRef.current = setHeldInvoices;

  const {
    newMedicine,
    setNewMedicine,
    editingMedicineId,
    saveMedicine,
    handleApplyStockCount,
    startEditMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    deleteMedicine,
  } = useMedicineManagement({
    isArabic,
    medicines,
    setMedicines,
    setStockMovements,
    appUser,
    user,
    getPharmacyId,
    addActivityLog,
    canUseSystemActions,
    canManageInventory,
    canDeleteMedicine,
    showSubscriptionExpiredAlert,
    onNavigateToInventory: () => setActivePage("inventory"),
  });

  const {
    selectedReturn,
    setSelectedReturn,
    returnInvoice,
    setReturnInvoice,
    returnQuantities,
    setReturnQuantities,
    isReturning,
    deletingReturnId,
    showInstantReturnModal,
    setShowInstantReturnModal,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    openInvoiceByNumber,
    openReturnModal,
    completeReturn,
    handleDeleteReturn,
    handleInstantReturnSuccess,
  } = useReturns({
    isArabic,
    t,
    returns,
    setReturns,
    invoices,
    appUser,
    user,
    discount,
    setDiscount,
    getPharmacyId,
    addActivityLog,
    canUseSystemActions,
    canUseReturns,
    canDeleteReturn,
    showSubscriptionExpiredAlert,
    refreshMedicinesFromDb,
    setStockMovements,
    onViewInvoice: setSelectedInvoice,
  });

  useEffect(() => {
    void refreshActiveCashierShift();
  }, [refreshActiveCashierShift]);

  return {
    isOnline,
    branchTransfers,
    availabilityModal,
    setAvailabilityModal,
    availabilityLoading,
    setAvailabilityLoading,
    currentWorkShiftId,
    currentWorkShiftLabel,
    activeCashierShift,
    setActiveCashierShift,
    selectedInvoice,
    setSelectedInvoice,
    cart,
    cartItemsCount,
    cartTotalQty,
    subtotal,
    total,
    discount,
    paymentMethod,
    customerName,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    setDiscount,
    setPaymentMethod,
    setCustomerName,
    pendingBranchTransferGroups,
    completedBranchTransferGroups,
    getPaymentLabel,
    refreshBranchTransfers,
    handleBranchTransferComplete,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    printBranchTransferRecords,
    switchBranch,
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    isSelling,
    heldInvoices,
    showHeldInvoicesModal,
    setShowHeldInvoicesModal,
    isHolding,
    isHeldInvoiceProcessing,
    printSavedInvoice,
    completeSale,
    openHeldInvoicesModal,
    handleHoldInvoice,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
    newMedicine,
    setNewMedicine,
    editingMedicineId,
    saveMedicine,
    handleApplyStockCount,
    startEditMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    deleteMedicine,
    selectedReturn,
    setSelectedReturn,
    returnInvoice,
    setReturnInvoice,
    returnQuantities,
    setReturnQuantities,
    isReturning,
    deletingReturnId,
    showInstantReturnModal,
    setShowInstantReturnModal,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    openInvoiceByNumber,
    openReturnModal,
    completeReturn,
    handleDeleteReturn,
    handleInstantReturnSuccess,
  };
}

export type AppOperationsSliceReturn = ReturnType<typeof useAppOperationsSlice>;
