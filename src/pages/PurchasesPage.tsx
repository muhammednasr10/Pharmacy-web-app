import { useCallback, useEffect, useMemo, useState } from "react";
import MedicineEntryGrid from "../components/MedicineEntryGrid";
import ReorderSuggestionsModal from "../components/ReorderSuggestionsModal";
import type { Medicine, PharmacySettings, PurchaseRecord } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import {
  consumeReorderModalFlag,
  consumeReorderPurchaseDraft,
  type ReorderPurchaseDraft,
} from "../utils/reorderSuggestions";

type PurchaseLineDraft = {
  key: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

type PurchaseGroup = {
  purchaseNumber: string;
  pharmacyId: string;
  supplierName: string;
  userName: string;
  date: string;
  createdAt: string;
  notes: string;
  items: PurchaseRecord[];
  totalCost: number;
  totalQuantity: number;
};

type PurchasesPageProps = {
  purchases: PurchaseRecord[];
  branches: PharmacySettings[];
  defaultBranchId: string;
  showBranchColumn?: boolean;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  canUsePurchases: boolean;
  canDeletePurchase?: boolean;
  isSubscriptionExpired: boolean;
  userId?: string;
  userName?: string;
  onActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  onRefreshMedicines: () => Promise<void>;
  onRefreshPurchases: () => Promise<void>;
  medicines?: Medicine[];
  fallbackSettings?: PharmacySettings | null;
  safeNumber: (value: unknown) => number;
  barcodeCSV: (value: unknown) => string;
  downloadCSV: (filename: string, rows: string[][]) => void;
};

const emptyItemForm = {
  barcode: "",
  name_ar: "",
  name_en: "",
  qty: 0,
  buyPrice: 0,
  price: 0,
  expiry: "",
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function groupPurchasesByNumber(
  records: PurchaseRecord[],
  safeNumber: (value: unknown) => number,
): PurchaseGroup[] {
  const map = new Map<string, PurchaseGroup>();

  for (const record of records) {
    const key = record.purchaseNumber || `legacy-${record.id}`;
    const existing = map.get(key);

    if (existing) {
      existing.items.push(record);
      existing.totalCost += safeNumber(record.totalCost);
      existing.totalQuantity += safeNumber(record.quantity);
      if (!existing.supplierName && record.supplierName)
        existing.supplierName = record.supplierName;
      if (!existing.notes && record.notes) existing.notes = record.notes;
    } else {
      map.set(key, {
        purchaseNumber: record.purchaseNumber || `#${record.id}`,
        pharmacyId: record.pharmacyId || "",
        supplierName: record.supplierName || "",
        userName: record.userName || "",
        date: record.date || "",
        createdAt: record.createdAt || "",
        notes: record.notes || "",
        items: [record],
        totalCost: safeNumber(record.totalCost),
        totalQuantity: safeNumber(record.quantity),
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt || b.date || 0).getTime() -
      new Date(a.createdAt || a.date || 0).getTime(),
  );
}

export default function PurchasesPage({
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
}: PurchasesPageProps) {
  const [allPurchases, setAllPurchases] = useState<PurchaseRecord[]>(purchases);
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

  useEffect(() => {
    if (consumeReorderModalFlag()) {
      setShowReorderModal(true);
    }

    const draft = consumeReorderPurchaseDraft();
    if (!draft) return;

    applyReorderDraft(draft);
  }, [defaultBranchId]);

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

  function getBranchLabel(branchId: string) {
    const branch = branchOptions.find((item) => item.id === branchId);
    if (!branch) return branchId || "-";
    return (isArabic ? branch.name : branch.name_en) || branch.name || branchId;
  }

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
          ? `تم حذف توريد رقم ${group.purchaseNumber} من فرع ${getBranchLabel(group.pharmacyId)}`
          : `Purchase ${group.purchaseNumber} deleted from branch ${getBranchLabel(group.pharmacyId)}`,
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
            : `تم تسجيل توريد رقم ${purchaseNumber} بـ ${draftItems.length} صنف للفرع ${getBranchLabel(targetBranchId)}`
          : isEditMode
            ? `Purchase ${purchaseNumber} updated (${draftItems.length} items)`
            : `Purchase ${purchaseNumber} saved with ${draftItems.length} items for branch ${getBranchLabel(targetBranchId)}`,
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
        ...(showBranchColumn ? [getBranchLabel(purchase.pharmacyId || "")] : []),
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

  return (
    <section className="card purchasesPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "المشتريات / توريد المخزون" : "Purchases / Stock Supply"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "سجل التوريدات حسب الفرع ورقم التوريد"
              : "Purchase history by branch and purchase number"}
          </p>
        </div>
        {canUsePurchases && (
          <div className="returnsHeaderBtns">
            <button
              type="button"
              className="editBtn"
              onClick={() => setShowReorderModal(true)}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "اقتراح من النواقص" : "Reorder suggestions"}
            </button>
            <button
              type="button"
              className="printFullBtn"
              onClick={openPurchaseModal}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل توريد جديد" : "New Purchase"}
            </button>
          </div>
        )}
      </div>

      <div className="cardHeader purchasesHistoryHeader">
        <h2>{isArabic ? "سجل المشتريات" : "Purchases History"}</h2>
        <button type="button" className="printBtn" onClick={exportPurchasesCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      <div className="filtersBar purchaseFiltersBar">
        <input
          value={purchaseSearch}
          onChange={(e) => setPurchaseSearch(e.target.value)}
          placeholder={
            isArabic
              ? "بحث برقم التوريد أو الدواء أو الباركود أو المورد"
              : "Search purchase no., medicine, barcode, or supplier"
          }
        />

        {showBranchColumn && branchOptions.length > 1 && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">{isArabic ? "كل الفروع" : "All branches"}</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {(isArabic ? branch.name : branch.name_en) || branch.name || branch.id}
              </option>
            ))}
          </select>
        )}

        <input
          type="date"
          value={purchaseFromDate}
          onChange={(e) => setPurchaseFromDate(e.target.value)}
        />

        <input
          type="date"
          value={purchaseToDate}
          onChange={(e) => setPurchaseToDate(e.target.value)}
        />

        <button
          type="button"
          className="clearCartBtn"
          onClick={() => {
            setPurchaseSearch("");
            setPurchaseFromDate("");
            setPurchaseToDate("");
            setBranchFilter("all");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredPurchaseGroups.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد مشتريات حتى الآن" : "No purchases yet"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "رقم التوريد" : "Purchase No."}</th>
                {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "عدد الأصناف" : "Items"}</th>
                <th>{isArabic ? "إجمالي الكمية" : "Total Qty"}</th>
                <th>{isArabic ? "إجمالي التكلفة" : "Total Cost"}</th>
                <th>{isArabic ? "المورد" : "Supplier"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseGroups.map((group) => (
                <tr key={group.purchaseNumber}>
                  <td>
                    <strong className="purchaseNumberTag">{group.purchaseNumber}</strong>
                  </td>
                  {showBranchColumn && <td>{getBranchLabel(group.pharmacyId)}</td>}
                  <td>{group.items.length}</td>
                  <td>{group.totalQuantity}</td>
                  <td>
                    {group.totalCost.toFixed(2)} {currency}
                  </td>
                  <td>{group.supplierName || "-"}</td>
                  <td>{group.userName || "-"}</td>
                  <td>{group.date || group.createdAt || "-"}</td>
                  <td>
                    <div className="actionButtons purchaseRowActions">
                      <button
                        type="button"
                        className="smallBtn"
                        onClick={() => setViewGroup(group)}
                      >
                        {isArabic ? "عرض" : "View"}
                      </button>
                      {canUsePurchases && (
                        <button
                          type="button"
                          className="editBtn"
                          disabled={isSubscriptionExpired || saving}
                          onClick={() => void openEditPurchaseModal(group)}
                        >
                          {t.edit}
                        </button>
                      )}
                      {canDeletePurchase && (
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={
                            isSubscriptionExpired || deletingPurchaseNumber === group.purchaseNumber
                          }
                          onClick={() => void handleDeletePurchase(group)}
                        >
                          {deletingPurchaseNumber === group.purchaseNumber
                            ? isArabic
                              ? "..."
                              : "..."
                            : t.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPurchaseModal && (
        <div className="modalOverlay" onClick={() => !saving && setShowPurchaseModal(false)}>
          <div className="invoiceModal purchaseModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {isEditMode
                    ? isArabic
                      ? "تعديل توريد"
                      : "Edit Purchase"
                    : isArabic
                      ? "تسجيل توريد جديد"
                      : "New Purchase"}
                </h2>
                <p>
                  {isEditMode
                    ? isArabic
                      ? "عدّل المورد والملاحظات والأصناف ثم احفظ"
                      : "Edit supplier, notes, and items then save"
                    : isArabic
                      ? "حدد الفرع وأضف الأصناف تحت نفس رقم التوريد"
                      : "Select branch and add items under one purchase number"}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                onClick={() => !saving && setShowPurchaseModal(false)}
              >
                ×
              </button>
            </div>

            <div className="purchaseMetaGrid">
              <div className="purchaseMetaField">
                <label>{isArabic ? "رقم التوريد" : "Purchase No."}</label>
                <input value={purchaseNumber} readOnly className="purchaseNumberReadonly" />
              </div>
              <div className="purchaseMetaField">
                <label>{isArabic ? "الفرع المستهدف" : "Target branch"}</label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  disabled={saving || isEditMode}
                >
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {(isArabic ? branch.name : branch.name_en) || branch.name || branch.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="purchaseMetaField">
                <label>{isArabic ? "اسم المورد" : "Supplier"}</label>
                <input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={isArabic ? "اسم المورد" : "Supplier name"}
                  disabled={saving}
                />
              </div>
              <div className="purchaseMetaField purchaseMetaFieldWide">
                <label>{isArabic ? "ملاحظات" : "Notes"}</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isArabic ? "ملاحظات اختيارية" : "Optional notes"}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="purchaseItemsSection">
              <h3>
                {editingDraftKey
                  ? isArabic
                    ? "تعديل صنف في التوريد"
                    : "Edit purchase item"
                  : isArabic
                    ? "إضافة صنف للتوريد"
                    : "Add item to purchase"}
              </h3>
              <div className="medicineForm purchaseModalForm">
                <p className="returnsSectionHint purchaseScannerHint">
                  {isArabic
                    ? "يمكنك مسح الباركود بالماسح الضوئي أو الكاميرا أثناء إدخال الأصناف"
                    : "Scan barcodes with a hardware scanner or camera while adding items"}
                </p>
                <MedicineEntryGrid
                  medicines={branchMedicines}
                  value={itemForm}
                  onChange={setItemForm}
                  isArabic={isArabic}
                  t={t}
                  disabled={saving}
                  qtyPlaceholder={isArabic ? "كمية التوريد" : "Purchase quantity"}
                  resetKey={`${itemLookupResetKey}-${editingDraftKey || "new"}`}
                  enableHardwareScanner
                />
              </div>
              <div className="purchaseAddItemActions">
                <button
                  type="button"
                  className={editingDraftKey ? "editBtn" : "printBtn purchaseAddItemBtn"}
                  onClick={addDraftItem}
                  disabled={saving}
                >
                  {editingDraftKey
                    ? isArabic
                      ? "حفظ تعديل الصنف"
                      : "Save item changes"
                    : isArabic
                      ? "+ إضافة للتوريد"
                      : "+ Add to purchase"}
                </button>
                {editingDraftKey && (
                  <button
                    type="button"
                    className="completeBtn"
                    onClick={cancelDraftItemEdit}
                    disabled={saving}
                  >
                    {isArabic ? "إلغاء التعديل" : "Cancel edit"}
                  </button>
                )}
              </div>
            </div>

            {draftItems.length > 0 && (
              <div className="purchaseDraftTableWrap">
                <h3>
                  {isArabic
                    ? `أصناف التوريد (${draftItems.length})`
                    : `Purchase items (${draftItems.length})`}
                </h3>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.medicine}</th>
                        <th>{t.barcode}</th>
                        <th>{t.qty}</th>
                        <th>{isArabic ? "شراء" : "Buy"}</th>
                        <th>{isArabic ? "بيع" : "Sell"}</th>
                        <th>{t.expiry}</th>
                        <th>{t.action}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftItems.map((item) => (
                        <tr key={item.key}>
                          <td>{isArabic ? item.name_ar : item.name_en}</td>
                          <td>{item.barcode}</td>
                          <td>{item.qty}</td>
                          <td>{item.buyPrice.toFixed(2)}</td>
                          <td>{item.price.toFixed(2)}</td>
                          <td>{item.expiry}</td>
                          <td>
                            <div className="actionButtons purchaseRowActions">
                              <button
                                type="button"
                                className="editBtn"
                                onClick={() => editDraftItem(item)}
                                disabled={saving}
                              >
                                {t.edit}
                              </button>
                              <button
                                type="button"
                                className="deleteSmallBtn"
                                onClick={() => {
                                  if (editingDraftKey === item.key) {
                                    cancelDraftItemEdit();
                                  }
                                  setDraftItems((prev) =>
                                    prev.filter((row) => row.key !== item.key),
                                  );
                                }}
                                disabled={saving}
                              >
                                {t.remove}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="modalActions">
              <button
                type="button"
                className="addMedicineBtn"
                onClick={() => void savePurchaseBatch()}
                disabled={isSubscriptionExpired || saving || draftItems.length === 0}
              >
                {saving
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isEditMode
                    ? isArabic
                      ? "حفظ التعديل"
                      : "Save Changes"
                    : isArabic
                      ? "حفظ التوريد"
                      : "Save Purchase"}
              </button>
              <button
                type="button"
                className="completeBtn"
                onClick={() => !saving && setShowPurchaseModal(false)}
                disabled={saving}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewGroup && (
        <div className="modalOverlay" onClick={() => setViewGroup(null)}>
          <div className="invoiceModal purchaseViewModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "أدوية التوريد" : "Purchase items"} — {viewGroup.purchaseNumber}
                </h2>
                <p className="returnsSectionHint">
                  {isArabic ? "الفرع:" : "Branch:"} {getBranchLabel(viewGroup.pharmacyId)}
                  {" · "}
                  {isArabic ? "المورد:" : "Supplier:"} {viewGroup.supplierName || "-"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={() => setViewGroup(null)}>
                ×
              </button>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.medicine}</th>
                    <th>{t.barcode}</th>
                    <th>{t.qty}</th>
                    <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
                    <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
                    <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewGroup.items.map((item) => (
                    <tr key={item.id}>
                      <td>{isArabic ? item.medicineName_ar : item.medicineName_en}</td>
                      <td>{item.barcode}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {safeNumber(item.buyPrice).toFixed(2)} {currency}
                      </td>
                      <td>
                        {safeNumber(item.sellPrice).toFixed(2)} {currency}
                      </td>
                      <td>
                        {safeNumber(item.totalCost).toFixed(2)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="purchaseViewSummary">
              <span>
                {isArabic ? "عدد الأصناف:" : "Items:"} {viewGroup.items.length}
              </span>
              <span>
                {isArabic ? "إجمالي الكمية:" : "Total qty:"} {viewGroup.totalQuantity}
              </span>
              <strong>
                {isArabic ? "إجمالي التكلفة:" : "Total cost:"} {viewGroup.totalCost.toFixed(2)}{" "}
                {currency}
              </strong>
            </div>

            <div className="modalActions">
              <button type="button" className="completeBtn" onClick={() => setViewGroup(null)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReorderSuggestionsModal
        isArabic={isArabic}
        open={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        medicines={medicines}
        branches={branchOptions}
        defaultBranchId={defaultBranchId}
        allowBranchPicker={showBranchColumn && branchOptions.length > 1}
        fallbackSettings={fallbackSettings}
        onApplyDraft={handleReorderDraft}
      />
    </section>
  );
}
