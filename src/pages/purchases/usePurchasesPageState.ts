import { useCallback, useEffect, useMemo, useState } from "react";
import type { Medicine, PharmacySettings } from "../../types";
import * as pharmacyService from "../../services/pharmacyService";
import { getBranchLabel } from "../../utils/branchLabel";
import {
  consumeReorderModalFlag,
  consumeReorderPurchaseDraft,
  type ReorderPurchaseDraft,
} from "../../utils/reorderSuggestions";
import { emptyItemForm, formatDateInput, groupPurchasesByNumber } from "./helpers";
import type { PurchaseGroup, PurchaseLineDraft, PurchasesPageProps } from "./types";

export function usePurchasesPageState(props: PurchasesPageProps) {
  const {
    purchases,
    branches,
    defaultBranchId,
    showBranchColumn = false,
    isArabic,
    t,
    currency,
    canUsePurchases,
    canDeletePurchase = false,
    isSubscriptionExpired,
    userId,
    userName,
    onActivityLog,
    onRefreshMedicines,
    onRefreshPurchases,
    medicines = [],
    fallbackSettings = null,
    safeNumber,
    barcodeCSV,
    downloadCSV,
  } = props;

  const [allPurchases, setAllPurchases] = useState(purchases);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseFromDate, setPurchaseFromDate] = useState("");
  const [purchaseToDate, setPurchaseToDate] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [viewGroup, setViewGroup] = useState<PurchaseGroup | null>(null);
  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [targetBranchId, setTargetBranchId] = useState(defaultBranchId);
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [draftItems, setDraftItems] = useState<PurchaseLineDraft[]>([]);
  const [branchMedicines, setBranchMedicines] = useState<Medicine[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDraftKey, setEditingDraftKey] = useState<string | null>(null);
  const [itemLookupResetKey, setItemLookupResetKey] = useState(0);
  const [deletingPurchaseNumber, setDeletingPurchaseNumber] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const branchOptions = useMemo(() => {
    if (branches.length > 0) return branches;
    return [
      { id: defaultBranchId, name: defaultBranchId, name_en: defaultBranchId } as PharmacySettings,
    ];
  }, [branches, defaultBranchId]);

  const loadPurchases = useCallback(async () => {
    const ids = branchOptions.map((branch) => branch.id);
    const rows = await pharmacyService.getPurchasesForPharmacies(ids);
    setAllPurchases(rows);
  }, [branchOptions]);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases, purchases]);

  function applyReorderDraft(draft: ReorderPurchaseDraft) {
    setIsEditMode(false);
    setEditingDraftKey(null);
    setPurchaseNumber(`PUR-${Date.now()}`);
    setTargetBranchId(draft.branchId || defaultBranchId);
    setSupplierName(draft.supplierName || "");
    setNotes(draft.notes || "");
    setItemForm(emptyItemForm);
    setDraftItems(
      draft.items.map((item, index) => ({
        key: `reorder-${index}-${Date.now()}`,
        ...item,
      })),
    );
    setItemLookupResetKey((key) => key + 1);
    setShowPurchaseModal(true);
  }

  useEffect(() => {
    if (consumeReorderModalFlag()) {
      setShowReorderModal(true);
    }

    const draft = consumeReorderPurchaseDraft();
    if (!draft) return;

    applyReorderDraft(draft);
  }, [defaultBranchId]);

  function handleReorderDraft(draft: ReorderPurchaseDraft) {
    setShowReorderModal(false);
    applyReorderDraft(draft);
  }

  useEffect(() => {
    if (!showPurchaseModal || !targetBranchId) return;
    void pharmacyService.getMedicinesForPharmacy(targetBranchId).then(setBranchMedicines);
  }, [showPurchaseModal, targetBranchId]);

  const purchaseGroups = useMemo(
    () => groupPurchasesByNumber(allPurchases, safeNumber),
    [allPurchases, safeNumber],
  );

  const filteredPurchaseGroups = useMemo(() => {
    const searchValue = purchaseSearch.trim().toLowerCase();

    return purchaseGroups.filter((group) => {
      const matchesBranch = branchFilter === "all" || group.pharmacyId === branchFilter;

      const matchesSearch =
        !searchValue ||
        group.purchaseNumber.toLowerCase().includes(searchValue) ||
        group.supplierName.toLowerCase().includes(searchValue) ||
        group.userName.toLowerCase().includes(searchValue) ||
        group.items.some(
          (item) =>
            String(item.medicineName_ar || "")
              .toLowerCase()
              .includes(searchValue) ||
            String(item.medicineName_en || "")
              .toLowerCase()
              .includes(searchValue) ||
            String(item.barcode || "")
              .toLowerCase()
              .includes(searchValue),
        );

      const groupDate = new Date(group.createdAt || group.date);
      const fromDate = purchaseFromDate ? new Date(`${purchaseFromDate}T00:00:00`) : null;
      const toDate = purchaseToDate ? new Date(`${purchaseToDate}T23:59:59`) : null;
      const matchesFrom = !fromDate || groupDate >= fromDate;
      const matchesTo = !toDate || groupDate <= toDate;

      return matchesBranch && matchesSearch && matchesFrom && matchesTo;
    });
  }, [purchaseGroups, purchaseSearch, purchaseFromDate, purchaseToDate, branchFilter]);

  const formatBranchLabel = (branchId: string) =>
    getBranchLabel(branchId, branchOptions, isArabic);

  function openPurchaseModal() {
    setIsEditMode(false);
    setEditingDraftKey(null);
    setPurchaseNumber(`PUR-${Date.now()}`);
    setTargetBranchId(defaultBranchId);
    setSupplierName("");
    setNotes("");
    setItemForm(emptyItemForm);
    setDraftItems([]);
    setItemLookupResetKey((key) => key + 1);
    setShowPurchaseModal(true);
  }

  async function openEditPurchaseModal(group: PurchaseGroup) {
    const branchId = group.pharmacyId || defaultBranchId;
    const branchMeds = await pharmacyService.getMedicinesForPharmacy(branchId);

    setIsEditMode(true);
    setEditingDraftKey(null);
    setPurchaseNumber(group.purchaseNumber);
    setTargetBranchId(branchId);
    setSupplierName(group.supplierName || "");
    setNotes(group.notes || "");
    setItemForm(emptyItemForm);
    setDraftItems(
      group.items.map((item, index) => {
        const barcode = String(item.barcode ?? "").trim();
        const medicine = branchMeds.find((row) => String(row.barcode ?? "").trim() === barcode);
        return {
          key: `edit-${item.id}-${index}`,
          barcode,
          name_ar: String(item.medicineName_ar ?? medicine?.name_ar ?? ""),
          name_en: String(item.medicineName_en ?? medicine?.name_en ?? ""),
          qty: safeNumber(item.quantity),
          buyPrice: safeNumber(item.buyPrice),
          price: safeNumber(item.sellPrice),
          expiry: medicine?.expiry || "",
        };
      }),
    );
    setBranchMedicines(branchMeds);
    setShowPurchaseModal(true);
  }

  async function handleDeletePurchase(group: PurchaseGroup) {
    if (!canUsePurchases || !canDeletePurchase || isSubscriptionExpired) return;

    const confirmed = window.confirm(
      isArabic
        ? `حذف توريد رقم ${group.purchaseNumber}؟\nسيتم خصم الكميات من مخزون الفرع.`
        : `Delete purchase ${group.purchaseNumber}?\nQuantities will be deducted from branch stock.`,
    );
    if (!confirmed) return;

    setDeletingPurchaseNumber(group.purchaseNumber);
    try {
      await pharmacyService.deletePurchaseBatch(
        group.purchaseNumber,
        group.pharmacyId || defaultBranchId,
        userId,
        userName,
      );

      await onActivityLog({
        type: "purchase_delete",
        title: isArabic ? "حذف توريد" : "Purchase Deleted",
        description: isArabic
          ? `تم حذف توريد رقم ${group.purchaseNumber} من فرع ${formatBranchLabel(group.pharmacyId)}`
          : `Purchase ${group.purchaseNumber} deleted from branch ${formatBranchLabel(group.pharmacyId)}`,
        referenceType: "purchase",
        referenceId: group.purchaseNumber,
      });

      if (viewGroup?.purchaseNumber === group.purchaseNumber) {
        setViewGroup(null);
      }

      await onRefreshMedicines();
      await onRefreshPurchases();
      await loadPurchases();
    } catch (error) {
      console.error("Delete purchase error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حذف التوريد"
            : "Could not delete purchase",
      );
    } finally {
      setDeletingPurchaseNumber(null);
    }
  }

  function editDraftItem(item: PurchaseLineDraft) {
    setEditingDraftKey(item.key);
    setItemLookupResetKey((key) => key + 1);
    setItemForm({
      barcode: item.barcode,
      name_ar: item.name_ar,
      name_en: item.name_en,
      qty: item.qty,
      buyPrice: item.buyPrice,
      price: item.price,
      expiry: item.expiry,
    });
  }

  function cancelDraftItemEdit() {
    setEditingDraftKey(null);
    setItemForm(emptyItemForm);
    setItemLookupResetKey((key) => key + 1);
  }

  function addDraftItem() {
    if (
      !itemForm.barcode ||
      !itemForm.name_ar ||
      !itemForm.name_en ||
      !itemForm.expiry ||
      itemForm.qty <= 0 ||
      itemForm.buyPrice < 0 ||
      itemForm.price <= 0
    ) {
      alert(
        isArabic
          ? editingDraftKey
            ? "أكمل بيانات الصنف قبل الحفظ"
            : "أكمل بيانات الصنف قبل الإضافة"
          : editingDraftKey
            ? "Complete item details before saving"
            : "Complete item details before adding",
      );
      return;
    }

    const nextItem: PurchaseLineDraft = {
      key: editingDraftKey || `${Date.now()}-${draftItems.length}`,
      barcode: itemForm.barcode.trim(),
      name_ar: itemForm.name_ar.trim(),
      name_en: itemForm.name_en.trim(),
      expiry: itemForm.expiry,
      qty: Number(itemForm.qty),
      buyPrice: Number(itemForm.buyPrice),
      price: Number(itemForm.price),
    };

    if (editingDraftKey) {
      setDraftItems((prev) => prev.map((row) => (row.key === editingDraftKey ? nextItem : row)));
      setEditingDraftKey(null);
    } else {
      setDraftItems((prev) => [...prev, nextItem]);
    }
    setItemForm(emptyItemForm);
    setItemLookupResetKey((key) => key + 1);
  }

  async function savePurchaseBatch() {
    if (saving) return;
    if (!targetBranchId) {
      alert(isArabic ? "اختر الفرع المستهدف" : "Select target branch");
      return;
    }
    if (draftItems.length === 0) {
      alert(
        isArabic ? "أضف صنفاً واحداً على الأقل للتوريد" : "Add at least one item to the purchase",
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        pharmacyId: targetBranchId,
        purchaseNumber,
        supplierName,
        notes,
        userId,
        userName,
        items: draftItems,
      };

      if (isEditMode) {
        await pharmacyService.replacePurchaseBatch(payload);
      } else {
        await pharmacyService.savePurchaseBatch(payload);
      }

      await onActivityLog({
        type: isEditMode ? "purchase_update" : "purchase",
        title: isEditMode
          ? isArabic
            ? "تعديل توريد"
            : "Purchase Updated"
          : isArabic
            ? "تسجيل توريد"
            : "Purchase Created",
        description: isArabic
          ? isEditMode
            ? `تم تعديل توريد رقم ${purchaseNumber} (${draftItems.length} صنف)`
            : `تم تسجيل توريد رقم ${purchaseNumber} بـ ${draftItems.length} صنف للفرع ${formatBranchLabel(targetBranchId)}`
          : isEditMode
            ? `Purchase ${purchaseNumber} updated (${draftItems.length} items)`
            : `Purchase ${purchaseNumber} saved with ${draftItems.length} items for branch ${formatBranchLabel(targetBranchId)}`,
        referenceType: "purchase",
        referenceId: purchaseNumber,
      });

      alert(
        isEditMode
          ? isArabic
            ? "تم تعديل التوريد بنجاح"
            : "Purchase updated successfully"
          : isArabic
            ? "تم تسجيل التوريد بنجاح"
            : "Purchase saved successfully",
      );
      setShowPurchaseModal(false);
      await onRefreshMedicines();
      await onRefreshPurchases();
      await loadPurchases();
    } catch (error) {
      console.error("Purchase batch error:", error);
      const message =
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ أثناء تسجيل التوريد"
            : "An error occurred while saving purchase";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  function exportPurchasesCSV() {
    const rows = [
      [
        isArabic ? "رقم التوريد" : "Purchase No.",
        ...(showBranchColumn ? [isArabic ? "الفرع" : "Branch"] : []),
        isArabic ? "اسم الدواء عربي" : "Arabic Medicine Name",
        isArabic ? "اسم الدواء إنجليزي" : "English Medicine Name",
        isArabic ? "الباركود" : "Barcode",
        isArabic ? "الكمية" : "Qty",
        isArabic ? "سعر الشراء" : "Buy Price",
        isArabic ? "سعر البيع" : "Sell Price",
        isArabic ? "إجمالي التكلفة" : "Total Cost",
        isArabic ? "المورد" : "Supplier",
        isArabic ? "ملاحظات" : "Notes",
        isArabic ? "المستخدم" : "User",
        isArabic ? "التاريخ" : "Date",
      ],
      ...allPurchases.map((purchase) => [
        purchase.purchaseNumber || `#${purchase.id}`,
        ...(showBranchColumn ? [formatBranchLabel(purchase.pharmacyId || "")] : []),
        purchase.medicineName_ar || "-",
        purchase.medicineName_en || "-",
        barcodeCSV(purchase.barcode),
        String(safeNumber(purchase.quantity)),
        safeNumber(purchase.buyPrice).toFixed(2),
        safeNumber(purchase.sellPrice).toFixed(2),
        safeNumber(purchase.totalCost).toFixed(2),
        purchase.supplierName || "-",
        purchase.notes || "-",
        purchase.userName || "-",
        purchase.date || "-",
      ]),
    ];

    downloadCSV(`purchases-${formatDateInput(new Date())}.csv`, rows);
  }

  function clearFilters() {
    setPurchaseSearch("");
    setPurchaseFromDate("");
    setPurchaseToDate("");
    setBranchFilter("all");
  }

  return {
    isArabic,
    t,
    currency,
    canUsePurchases,
    canDeletePurchase,
    isSubscriptionExpired,
    showBranchColumn,
    medicines,
    fallbackSettings,
    defaultBranchId,
    safeNumber,
    branchOptions,
    purchaseSearch,
    setPurchaseSearch,
    purchaseFromDate,
    setPurchaseFromDate,
    purchaseToDate,
    setPurchaseToDate,
    branchFilter,
    setBranchFilter,
    showPurchaseModal,
    setShowPurchaseModal,
    viewGroup,
    setViewGroup,
    purchaseNumber,
    targetBranchId,
    setTargetBranchId,
    supplierName,
    setSupplierName,
    notes,
    setNotes,
    itemForm,
    setItemForm,
    draftItems,
    setDraftItems,
    branchMedicines,
    saving,
    isEditMode,
    editingDraftKey,
    itemLookupResetKey,
    deletingPurchaseNumber,
    showReorderModal,
    setShowReorderModal,
    filteredPurchaseGroups,
    formatBranchLabel,
    openPurchaseModal,
    openEditPurchaseModal,
    handleDeletePurchase,
    editDraftItem,
    cancelDraftItemEdit,
    addDraftItem,
    savePurchaseBatch,
    exportPurchasesCSV,
    clearFilters,
    handleReorderDraft,
  };
}

export type PurchasesPageState = ReturnType<typeof usePurchasesPageState>;
