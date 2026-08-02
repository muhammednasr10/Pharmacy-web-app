import { useEffect, useMemo, useState } from "react";
import type { Medicine, PharmacySettings } from "../types";
import { MEDICINE_TABLE_PAGE_SIZE } from "../constants/medicineCatalog";
import {
  buildReorderSuggestions,
  suggestionsToPurchaseDraft,
  type ReorderPurchaseDraft,
  type ReorderSuggestion,
} from "../utils/reorderSuggestions";
import BranchScopeSelect from "./BranchScopeSelect";

type ReorderSuggestionsModalProps = {
  isArabic: boolean;
  open: boolean;
  onClose: () => void;
  medicines: Medicine[];
  branches: PharmacySettings[];
  defaultBranchId: string;
  allowBranchPicker?: boolean;
  fallbackSettings?: PharmacySettings | null;
  onApplyDraft: (draft: ReorderPurchaseDraft) => void;
};

function formatMoney(value: number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ReorderSuggestionsModal({
  isArabic,
  open,
  onClose,
  medicines,
  branches,
  defaultBranchId,
  allowBranchPicker = false,
  fallbackSettings = null,
  onApplyDraft,
}: ReorderSuggestionsModalProps) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [qtyOverrides, setQtyOverrides] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    setBranchId(defaultBranchId);
    setQtyOverrides({});
  }, [open, defaultBranchId]);

  const suggestions = useMemo(
    () =>
      buildReorderSuggestions({
        medicines,
        branches,
        fallbackSettings,
        isArabic,
        branchId: allowBranchPicker ? branchId : defaultBranchId,
      }),
    [medicines, branches, fallbackSettings, isArabic, allowBranchPicker, branchId, defaultBranchId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(suggestions.map((item) => item.medicineId)));
    setPage(0);
  }, [open, suggestions]);

  const totalPages = Math.max(1, Math.ceil(suggestions.length / MEDICINE_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSuggestions = useMemo(
    () =>
      suggestions.slice(
        safePage * MEDICINE_TABLE_PAGE_SIZE,
        (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
      ),
    [suggestions, safePage],
  );

  const selectedSuggestions = useMemo(() => {
    return suggestions
      .filter((item) => selectedIds.has(item.medicineId))
      .map((item) => ({
        ...item,
        suggestedQty: Math.max(1, Math.floor(qtyOverrides[item.medicineId] ?? item.suggestedQty)),
        estimatedCost:
          Math.max(1, Math.floor(qtyOverrides[item.medicineId] ?? item.suggestedQty)) *
          item.buyPrice,
      }));
  }, [qtyOverrides, selectedIds, suggestions]);

  const totalEstimatedCost = selectedSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0);
  const totalSuggestedQty = selectedSuggestions.reduce((sum, item) => sum + item.suggestedQty, 0);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function toggleItem(medicineId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(medicineId)) next.delete(medicineId);
      else next.add(medicineId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(suggestions.map((item) => item.medicineId)) : new Set());
  }

  function handleApply() {
    if (selectedSuggestions.length === 0) {
      alert(isArabic ? "اختر صنفاً واحداً على الأقل" : "Select at least one item");
      return;
    }

    const targetBranchId = allowBranchPicker ? branchId : defaultBranchId;
    const draft = suggestionsToPurchaseDraft(selectedSuggestions, {
      branchId: targetBranchId,
      notes: isArabic
        ? `مسودة توريد من النواقص — ${selectedSuggestions.length} صنف`
        : `Reorder draft from low stock — ${selectedSuggestions.length} items`,
    });
    onApplyDraft(draft);
  }

  function exportCsv() {
    const header = [
      isArabic ? "الدواء" : "Medicine",
      isArabic ? "الفرع" : "Branch",
      isArabic ? "الباركود" : "Barcode",
      isArabic ? "الكمية الحالية" : "Current qty",
      isArabic ? "الحد" : "Threshold",
      isArabic ? "كمية مقترحة" : "Suggested qty",
      isArabic ? "سعر الشراء" : "Buy price",
      isArabic ? "تكلفة تقديرية" : "Est. cost",
    ];
    const rows = suggestions.map((item) => [
      item.name_ar,
      item.branchLabel,
      item.barcode,
      String(item.currentQty),
      String(item.threshold),
      String(qtyOverrides[item.medicineId] ?? item.suggestedQty),
      String(item.buyPrice),
      String((qtyOverrides[item.medicineId] ?? item.suggestedQty) * item.buyPrice),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reorder-suggestions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modalOverlay">
      <div
        className="modalCard reorderSuggestionsModal"
        dir={isArabic ? "rtl" : "ltr"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stockCountHeader">
          <div>
            <h2>{isArabic ? "اقتراح توريد من النواقص" : "Reorder from low stock"}</h2>
            <p className="mutedText">
              {isArabic
                ? "كميات مقترحة لرفع المخزون إلى ضعف حد النقص (بحد أدنى 10 وحدات)"
                : "Suggested qty to reach 2× low-stock threshold (min target 10 units)"}
            </p>
          </div>
          <button type="button" className="smallBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {allowBranchPicker && branches.length > 1 && (
          <label className="reorderBranchPicker">
            <span>{isArabic ? "الفرع" : "Branch"}</span>
            <BranchScopeSelect
              pharmacies={branches}
              value={branchId}
              onChange={setBranchId}
              isArabic={isArabic}
            />
          </label>
        )}

        <div className="stockCountSummaryRow">
          <span>
            {isArabic ? "نواقص" : "Low stock"}: {suggestions.length}
          </span>
          <span>
            {isArabic ? "محدد" : "Selected"}: {selectedSuggestions.length}
          </span>
          <span>
            {isArabic ? "كمية مقترحة" : "Suggested qty"}: {totalSuggestedQty}
          </span>
          <span>
            {isArabic ? "تكلفة تقديرية" : "Est. cost"}: {formatMoney(totalEstimatedCost)}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد نواقص في هذا الفرع حالياً" : "No low stock items in this branch"}
          </p>
        ) : (
          <div className="stockCountTableWrap">
            <table className="stockCountTable reorderSuggestionsTable">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === suggestions.length && suggestions.length > 0}
                      onChange={(event) => toggleAll(event.target.checked)}
                      aria-label={isArabic ? "تحديد الكل" : "Select all"}
                    />
                  </th>
                  <th>{isArabic ? "الدواء" : "Medicine"}</th>
                  {allowBranchPicker && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                  <th>{isArabic ? "الحالي" : "Current"}</th>
                  <th>{isArabic ? "الحد" : "Min"}</th>
                  <th>{isArabic ? "مقترح" : "Order"}</th>
                  <th>{isArabic ? "تكلفة" : "Cost"}</th>
                </tr>
              </thead>
              <tbody>
                {pageSuggestions.map((item) => (
                  <ReorderSuggestionRow
                    key={item.medicineId}
                    item={item}
                    isArabic={isArabic}
                    showBranch={allowBranchPicker}
                    selected={selectedIds.has(item.medicineId)}
                    qty={qtyOverrides[item.medicineId] ?? item.suggestedQty}
                    onToggle={() => toggleItem(item.medicineId)}
                    onQtyChange={(qty) =>
                      setQtyOverrides((prev) => ({ ...prev, [item.medicineId]: qty }))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {suggestions.length > MEDICINE_TABLE_PAGE_SIZE && (
          <div className="medicineTablePagination">
            <span className="medicineTablePaginationMeta">
              {isArabic
                ? `${safePage * MEDICINE_TABLE_PAGE_SIZE + 1}–${Math.min(
                    (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
                    suggestions.length,
                  )} من ${suggestions.length.toLocaleString()}`
                : `${safePage * MEDICINE_TABLE_PAGE_SIZE + 1}–${Math.min(
                    (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
                    suggestions.length,
                  )} of ${suggestions.length.toLocaleString()}`}
            </span>
            <div className="medicineTablePaginationActions">
              <button
                type="button"
                className="editBtn"
                disabled={safePage <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                {isArabic ? "السابق" : "Previous"}
              </button>
              <span className="medicineTablePaginationPage">
                {isArabic
                  ? `صفحة ${safePage + 1} / ${totalPages}`
                  : `Page ${safePage + 1} / ${totalPages}`}
              </span>
              <button
                type="button"
                className="editBtn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              >
                {isArabic ? "التالي" : "Next"}
              </button>
            </div>
          </div>
        )}

        <div className="stockCountActions">
          <button
            type="button"
            className="editBtn"
            onClick={exportCsv}
            disabled={suggestions.length === 0}
          >
            {isArabic ? "تصدير CSV" : "Export CSV"}
          </button>
          <button
            type="button"
            className="completeBtn"
            disabled={selectedSuggestions.length === 0}
            onClick={handleApply}
          >
            {isArabic ? "إنشاء مسودة توريد" : "Create purchase draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReorderSuggestionRow({
  item,
  isArabic,
  showBranch,
  selected,
  qty,
  onToggle,
  onQtyChange,
}: {
  item: ReorderSuggestion;
  isArabic: boolean;
  showBranch: boolean;
  selected: boolean;
  qty: number;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
}) {
  const estimatedCost = Math.max(1, Math.floor(qty)) * item.buyPrice;

  return (
    <tr>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td>
        <strong>{isArabic ? item.name_ar : item.name_en || item.name_ar}</strong>
        <div className="mutedText">{item.barcode || "—"}</div>
      </td>
      {showBranch && <td>{item.branchLabel}</td>}
      <td className={item.currentQty <= 0 ? "textDanger" : ""}>{item.currentQty}</td>
      <td>{item.threshold}</td>
      <td>
        <input
          type="number"
          min="1"
          className="stockCountQtyInput"
          value={qty}
          onChange={(event) => onQtyChange(Number(event.target.value))}
        />
      </td>
      <td>{formatMoney(estimatedCost)}</td>
    </tr>
  );
}
