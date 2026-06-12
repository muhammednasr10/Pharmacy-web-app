import { useEffect, useMemo, useState } from "react";
import type { Medicine, StockMovement } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import {
  buildMedicineStockSummary,
  getMovementReference,
  getMovementTypeLabel,
} from "../utils/stockMovements";

type MedicineStockDetailModalProps = {
  medicine: Medicine;
  pharmacyId: string;
  isArabic: boolean;
  onClose: () => void;
};

type SummaryCard = {
  key: keyof ReturnType<typeof buildMedicineStockSummary>;
  labelAr: string;
  labelEn: string;
  tone: "in" | "out" | "neutral";
};

const summaryCards: SummaryCard[] = [
  { key: "purchased", labelAr: "توريد", labelEn: "Purchases", tone: "in" },
  { key: "manualIn", labelAr: "إضافة يدوية", labelEn: "Manual Add", tone: "in" },
  { key: "returns", labelAr: "مرتجع", labelEn: "Returns", tone: "in" },
  { key: "sold", labelAr: "بيع", labelEn: "Sales", tone: "out" },
  { key: "wastage", labelAr: "هالك", labelEn: "Wastage", tone: "out" },
  { key: "adjustmentsOut", labelAr: "خصم / تسوية", labelEn: "Deductions", tone: "out" },
];

export default function MedicineStockDetailModal({
  medicine,
  pharmacyId,
  isArabic,
  onClose,
}: MedicineStockDetailModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMovements() {
      setLoading(true);
      setError("");
      try {
        const rows = await pharmacyService.getStockMovementsForMedicine(medicine.id, pharmacyId);
        if (active) {
          setMovements(rows);
        }
      } catch (loadError) {
        console.error("Load medicine stock movements error:", loadError);
        if (active) {
          setError(isArabic ? "تعذر تحميل حركات المخزون" : "Could not load stock movements");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMovements();
    return () => {
      active = false;
    };
  }, [medicine.id, pharmacyId, isArabic]);

  const summary = useMemo(() => buildMedicineStockSummary(movements), [movements]);

  const totalIn = summary.purchased + summary.manualIn + summary.returns;
  const totalOut = summary.sold + summary.wastage + summary.adjustmentsOut;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="invoiceModal medicineStockDetailModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "تفاصيل كمية المخزون" : "Stock Quantity Details"}</h2>
            <p className="returnsSectionHint">
              {isArabic ? medicine.name_ar : medicine.name_en}
              {" · "}
              {isArabic ? "الباركود:" : "Barcode:"} {medicine.barcode}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="medicineStockCurrentQty">
          <span>{isArabic ? "الكمية الحالية في المخزن" : "Current stock quantity"}</span>
          <strong>{medicine.qty}</strong>
        </div>

        <div className="medicineStockSummaryGrid">
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className={`medicineStockSummaryCard is${card.tone === "in" ? "In" : card.tone === "out" ? "Out" : "Neutral"}`}
            >
              <span>{isArabic ? card.labelAr : card.labelEn}</span>
              <strong>{summary[card.key]}</strong>
            </div>
          ))}
        </div>

        <div className="medicineStockTotalsRow">
          <span>
            {isArabic ? "إجمالي الوارد:" : "Total in:"}{" "}
            <strong className="stockInTotal">+{totalIn}</strong>
          </span>
          <span>
            {isArabic ? "إجمالي الصادر:" : "Total out:"}{" "}
            <strong className="stockOutTotal">-{totalOut}</strong>
          </span>
          <span>
            {isArabic ? "صافي الحركات:" : "Net movements:"} <strong>{totalIn - totalOut}</strong>
          </span>
        </div>

        <h3 className="medicineStockHistoryTitle">
          {isArabic ? "سجل حركات هذا الدواء" : "Movement history for this medicine"}
        </h3>

        {loading ? (
          <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
        ) : error ? (
          <p className="empty">{error}</p>
        ) : movements.length === 0 ? (
          <p className="empty">
            {isArabic
              ? "لا توجد حركات مسجلة لهذا الدواء بعد"
              : "No stock movements recorded for this medicine yet"}
          </p>
        ) : (
          <div className="tableWrap medicineStockHistoryTable">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التغيير" : "Change"}</th>
                  <th>{isArabic ? "قبل" : "Before"}</th>
                  <th>{isArabic ? "بعد" : "After"}</th>
                  <th>{isArabic ? "المرجع" : "Reference"}</th>
                  <th>{isArabic ? "المستخدم" : "User"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement, index) => (
                  <tr key={`${movement.id ?? movement.createdAt}-${index}`}>
                    <td>{getMovementTypeLabel(movement.type, isArabic)}</td>
                    <td>
                      <span
                        className={
                          Number(movement.quantityChange) < 0 ? "badge danger" : "badge ok"
                        }
                      >
                        {Number(movement.quantityChange) > 0
                          ? `+${movement.quantityChange}`
                          : movement.quantityChange}
                      </span>
                    </td>
                    <td>{movement.qtyBefore}</td>
                    <td>{movement.qtyAfter}</td>
                    <td>{getMovementReference(movement, isArabic)}</td>
                    <td>{movement.userName || "-"}</td>
                    <td>
                      {movement.createdAt ? new Date(movement.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modalActions">
          <button type="button" className="completeBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
