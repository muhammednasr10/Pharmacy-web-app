import { useEffect, useMemo, useState } from "react";
import type { BranchStockTransfer, Medicine, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { getBranchLabel } from "../utils/branchLabel";
import TransferBarcodeInput from "./TransferBarcodeInput";

type BranchTransferModalProps = {
  branches: PharmacySettings[];
  defaultFromBranchId: string;
  isArabic: boolean;
  userId?: string;
  userName?: string;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
  onPrintTransfer?: (records: BranchStockTransfer[]) => void;
};

type TransferDraftLine = {
  key: string;
  medicineId: number;
  quantity: number;
};

function formatTransferError(message: string, isArabic: boolean): string {
  const map: Record<string, [string, string]> = {
    branch_required: ["اختر الفرع المصدر والهدف", "Select source and target branches"],
    same_branch: ["لا يمكن النقل لنفس الفرع", "Cannot transfer to the same branch"],
    empty_items: ["أضف صنفاً واحداً على الأقل", "Add at least one item"],
    invalid_quantity: ["الكمية غير صحيحة", "Invalid quantity"],
    medicine_not_found: ["الدواء غير موجود في الفرع المصدر", "Medicine not found in source branch"],
    insufficient_stock: [
      "الكمية غير متوفرة في الفرع المصدر",
      "Insufficient stock in source branch",
    ],
    target_medicine_missing: [
      "تعذر إنشاء الدواء في الفرع الهدف",
      "Could not create medicine in target branch",
    ],
    duplicate_item: [
      "هذا الدواء مضاف بالفعل — عدّل الكمية من الجدول",
      "Medicine already added — edit quantity in the table",
    ],
    transfer_not_found: ["طلب النقل غير موجود", "Transfer request not found"],
    not_pending: ["هذا الطلب ليس بانتظار الاعتماد", "This request is not pending approval"],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  return message;
}

export default function BranchTransferModal({
  branches,
  defaultFromBranchId,
  isArabic,
  userId,
  userName,
  onClose,
  onComplete,
  onPrintTransfer,
}: BranchTransferModalProps) {
  const [fromBranchId, setFromBranchId] = useState(defaultFromBranchId);
  const [toBranchId, setToBranchId] = useState("");
  const [sourceMedicines, setSourceMedicines] = useState<Medicine[]>([]);
  const [pickMedicineId, setPickMedicineId] = useState("");
  const [pickQuantity, setPickQuantity] = useState("1");
  const [draftLines, setDraftLines] = useState<TransferDraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const targetOptions = useMemo(
    () => branches.filter((branch) => branch.id !== fromBranchId),
    [branches, fromBranchId],
  );

  const pickedMedicine = useMemo(
    () => sourceMedicines.find((row) => String(row.id) === pickMedicineId),
    [sourceMedicines, pickMedicineId],
  );

  const medicineById = useMemo(() => {
    const map = new Map<number, Medicine>();
    for (const medicine of sourceMedicines) {
      map.set(medicine.id, medicine);
    }
    return map;
  }, [sourceMedicines]);

  const draftTotalQty = useMemo(
    () => draftLines.reduce((sum, line) => sum + line.quantity, 0),
    [draftLines],
  );

  useEffect(() => {
    if (!toBranchId && targetOptions.length > 0) {
      setToBranchId(targetOptions[0].id);
    }
  }, [targetOptions, toBranchId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMedicines(true);
    setPickMedicineId("");
    setDraftLines([]);
    void pharmacyService.getMedicinesForPharmacy(fromBranchId).then((rows) => {
      if (cancelled) return;
      setSourceMedicines(rows.filter((row) => row.qty > 0));
      setLoadingMedicines(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fromBranchId]);

  function addOrUpdateDraftLine(medicineId: number, quantity: number) {
    const medicine = medicineById.get(medicineId);
    if (!medicine || quantity <= 0) {
      alert(formatTransferError("invalid_quantity", isArabic));
      return;
    }

    const existing = draftLines.find((line) => line.medicineId === medicineId);
    const nextQuantity = existing ? existing.quantity + quantity : quantity;

    if (nextQuantity > medicine.qty) {
      alert(formatTransferError("insufficient_stock", isArabic));
      return;
    }

    if (existing) {
      setDraftLines((prev) =>
        prev.map((line) =>
          line.medicineId === medicineId ? { ...line, quantity: nextQuantity } : line,
        ),
      );
      return;
    }

    setDraftLines((prev) => [
      ...prev,
      { key: `${medicineId}-${Date.now()}`, medicineId, quantity: nextQuantity },
    ]);
  }

  function addDraftLine() {
    if (!pickMedicineId) return;
    const medicineId = Number(pickMedicineId);
    const quantity = Math.floor(Number(pickQuantity));
    addOrUpdateDraftLine(medicineId, quantity);
    setPickMedicineId("");
    setPickQuantity("1");
  }

  function handleBarcodeScan(medicine: Medicine) {
    const quantity = Math.max(1, Math.floor(Number(pickQuantity)) || 1);
    addOrUpdateDraftLine(medicine.id, quantity);
  }

  function updateDraftQuantity(key: string, value: string) {
    const quantity = Math.floor(Number(value));
    setDraftLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const medicine = medicineById.get(line.medicineId);
        const maxQty = medicine?.qty ?? quantity;
        return { ...line, quantity: Math.max(1, Math.min(quantity || 1, maxQty)) };
      }),
    );
  }

  function removeDraftLine(key: string) {
    setDraftLines((prev) => prev.filter((line) => line.key !== key));
  }

  async function handleSubmit() {
    if (!fromBranchId || !toBranchId || draftLines.length === 0) return;
    setSubmitting(true);
    try {
      const results = await pharmacyService.executeBranchStockTransferBatch({
        fromPharmacyId: fromBranchId,
        toPharmacyId: toBranchId,
        items: draftLines.map((line) => ({
          medicineId: line.medicineId,
          quantity: line.quantity,
        })),
        notes,
        userId,
        userName,
        requireApproval,
      });
      await onComplete();
      onClose();
      const transferNumber = results[0]?.transferNumber || "";
      if (requireApproval) {
        alert(
          isArabic
            ? `تم إرسال طلب نقل ${results.length} صنف (رقم ${transferNumber}) — بانتظار اعتماد الفرع المستلم`
            : `Transfer request submitted for ${results.length} item(s) (${transferNumber}) — pending approval at receiving branch`,
        );
        return;
      }
      alert(
        isArabic
          ? `تم نقل ${results.length} صنف بنجاح (رقم ${transferNumber})`
          : `${results.length} item(s) transferred (${transferNumber})`,
      );
      if (onPrintTransfer && results.length > 0) {
        const shouldPrint = window.confirm(
          isArabic ? "هل تريد طباعة سند النقل؟" : "Print the transfer document?",
        );
        if (shouldPrint) onPrintTransfer(results);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "transfer_failed";
      alert(formatTransferError(message, isArabic));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modalOverlay">
      <div
        className="userFormPanel branchTransferModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "نقل مخزون بين الفروع" : "Transfer Stock Between Branches"}</h2>
            <p className="mutedText">
              {isArabic
                ? "اختر الفروع ثم امسح الباركود أو أضف الأصناف يدوياً"
                : "Select branches, scan barcodes, or add items manually"}
            </p>
          </div>
          <button className="closeBtn" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="userFormGrid">
          <label>
            <span>{isArabic ? "من فرع" : "From branch"}</span>
            <select value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {getBranchLabel(branch.id, branches, isArabic)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{isArabic ? "إلى فرع" : "To branch"}</span>
            <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)}>
              {targetOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {getBranchLabel(branch.id, branches, isArabic)}
                </option>
              ))}
            </select>
          </label>

          <div className="userFormFullWidth">
            <TransferBarcodeInput
              medicines={sourceMedicines}
              isArabic={isArabic}
              disabled={loadingMedicines || sourceMedicines.length === 0}
              onScan={handleBarcodeScan}
            />
          </div>

          <label className="userFormFullWidth branchTransferPickField">
            <span>{isArabic ? "إضافة صنف" : "Add item"}</span>
            <div className="branchTransferPickRow">
              <select
                value={pickMedicineId}
                disabled={loadingMedicines}
                onChange={(e) => setPickMedicineId(e.target.value)}
              >
                <option value="">
                  {loadingMedicines
                    ? isArabic
                      ? "جارٍ التحميل..."
                      : "Loading..."
                    : isArabic
                      ? "— اختر دواء —"
                      : "— Select medicine —"}
                </option>
                {sourceMedicines.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {(isArabic ? medicine.name_ar : medicine.name_en) || medicine.name_ar} —{" "}
                    {medicine.qty}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={pickedMedicine?.qty || undefined}
                value={pickQuantity}
                onChange={(e) => setPickQuantity(e.target.value)}
                aria-label={isArabic ? "الكمية" : "Quantity"}
              />
              <button
                type="button"
                className="smallBtn branchTransferAddBtn"
                disabled={!pickMedicineId || loadingMedicines}
                onClick={addDraftLine}
              >
                {isArabic ? "+ إضافة" : "+ Add"}
              </button>
            </div>
          </label>

          <label className="userFormFullWidth">
            <span>{isArabic ? "ملاحظات (اختياري)" : "Notes (optional)"}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <label className="userFormFullWidth branchTransferApprovalField">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />
            <span>
              {isArabic
                ? "طلب اعتماد الفرع المستلم قبل تنفيذ النقل"
                : "Require receiving branch approval before moving stock"}
            </span>
          </label>
        </div>

        {draftLines.length > 0 && (
          <div className="branchTransferDraftWrap">
            <h3>
              {isArabic
                ? `أصناف النقل (${draftLines.length}) — إجمالي ${draftTotalQty}`
                : `Transfer items (${draftLines.length}) — total qty ${draftTotalQty}`}
            </h3>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{isArabic ? "الدواء" : "Medicine"}</th>
                    <th>{isArabic ? "الباركود" : "Barcode"}</th>
                    <th>{isArabic ? "الكمية" : "Qty"}</th>
                    <th>{isArabic ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {draftLines.map((line) => {
                    const medicine = medicineById.get(line.medicineId);
                    return (
                      <tr key={line.key}>
                        <td>
                          {(isArabic ? medicine?.name_ar : medicine?.name_en) ||
                            medicine?.name_ar ||
                            "—"}
                        </td>
                        <td>{medicine?.barcode || "—"}</td>
                        <td>
                          <input
                            type="number"
                            className="branchTransferQtyInput"
                            min={1}
                            max={medicine?.qty || line.quantity}
                            value={line.quantity}
                            onChange={(e) => updateDraftQuantity(line.key, e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="deleteSmallBtn"
                            onClick={() => removeDraftLine(line.key)}
                          >
                            {isArabic ? "حذف" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modalActions">
          <button className="ghostBtn" type="button" onClick={onClose} disabled={submitting}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            className="smallBtn"
            type="button"
            disabled={submitting || draftLines.length === 0 || !toBranchId}
            onClick={() => void handleSubmit()}
          >
            {submitting
              ? "…"
              : requireApproval
                ? isArabic
                  ? `إرسال طلب (${draftLines.length})`
                  : `Submit request (${draftLines.length})`
                : isArabic
                  ? `تنفيذ النقل (${draftLines.length})`
                  : `Transfer (${draftLines.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
