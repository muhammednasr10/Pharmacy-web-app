import { useMemo, useState } from "react";
import type { StockMovement } from "../types";
import { formatDateInput } from "../utils/date";
import { barcodeCSV, downloadCSV } from "../utils/csvExport";
import { getMovementTypeLabel } from "../utils/stockMovementLabels";

type StockMovementsPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  movements: StockMovement[];
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
};

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function StockMovementsPage({
  isArabic,
  t,
  movements,
  showBranchColumn = false,
  getBranchLabel,
}: StockMovementsPageProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredMovements = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesSearch =
        !searchValue ||
        String(movement.medicineName_ar || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.medicineName_en || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.barcode || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.invoiceNumber || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.returnNumber || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.purchaseNumber || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(movement.userName || "")
          .toLowerCase()
          .includes(searchValue);

      const matchesType = typeFilter === "all" || movement.type === typeFilter;

      const movementDate = new Date(movement.createdAt || "");
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
      const matchesFrom = !from || movementDate >= from;
      const matchesTo = !to || movementDate <= to;

      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });
  }, [movements, search, typeFilter, fromDate, toDate]);

  function exportCsv() {
    const rows = [
      [
        isArabic ? "نوع الحركة" : "Movement Type",
        isArabic ? "اسم الدواء عربي" : "Arabic Medicine Name",
        isArabic ? "اسم الدواء إنجليزي" : "English Medicine Name",
        isArabic ? "الباركود" : "Barcode",
        isArabic ? "الكمية قبل" : "Qty Before",
        isArabic ? "التغيير" : "Change",
        isArabic ? "الكمية بعد" : "Qty After",
        isArabic ? "رقم الفاتورة" : "Invoice No.",
        isArabic ? "رقم المرتجع" : "Return No.",
        isArabic ? "رقم التوريد" : "Purchase No.",
        isArabic ? "المورد" : "Supplier",
        isArabic ? "المستخدم" : "User",
        isArabic ? "التاريخ" : "Date",
      ],
      ...filteredMovements.map((movement) => [
        getMovementTypeLabel(movement.type, isArabic),
        movement.medicineName_ar || "-",
        movement.medicineName_en || "-",
        barcodeCSV(movement.barcode),
        safeNumber(movement.qtyBefore),
        safeNumber(movement.quantityChange),
        safeNumber(movement.qtyAfter),
        movement.invoiceNumber || "-",
        movement.returnNumber || "-",
        movement.purchaseNumber || "-",
        movement.supplierName || "-",
        movement.userName || "-",
        movement.createdAt ? new Date(movement.createdAt).toLocaleString() : "-",
      ]),
    ];
    downloadCSV(`stock-movements-${formatDateInput(new Date())}.csv`, rows);
  }

  return (
    <section className="card stockMovementsPage">
      <div className="cardHeader">
        <h2>{isArabic ? "حركة المخزون" : "Stock Movements"}</h2>
        <button type="button" className="printBtn" onClick={exportCsv}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      <div className="filtersBar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            isArabic
              ? "بحث بالدواء أو الباركود أو رقم الفاتورة أو المستخدم"
              : "Search medicine, barcode, invoice, or user"
          }
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">{isArabic ? "كل الحركات" : "All movements"}</option>
          <option value="sale">{getMovementTypeLabel("sale", isArabic)}</option>
          <option value="return">{getMovementTypeLabel("return", isArabic)}</option>
          <option value="purchase">{getMovementTypeLabel("purchase", isArabic)}</option>
          <option value="medicine_create">
            {getMovementTypeLabel("medicine_create", isArabic)}
          </option>
          <option value="medicine_update">
            {getMovementTypeLabel("medicine_update", isArabic)}
          </option>
          <option value="medicine_delete">
            {getMovementTypeLabel("medicine_delete", isArabic)}
          </option>
          <option value="branch_transfer_out">
            {getMovementTypeLabel("branch_transfer_out", isArabic)}
          </option>
          <option value="branch_transfer_in">
            {getMovementTypeLabel("branch_transfer_in", isArabic)}
          </option>
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <button
          type="button"
          className="clearCartBtn"
          onClick={() => {
            setSearch("");
            setTypeFilter("all");
            setFromDate("");
            setToDate("");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredMovements.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد حركات مخزون حتى الآن" : "No stock movements yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "الدواء" : "Medicine"}</th>
                <th>{t.barcode}</th>
                <th>{isArabic ? "قبل" : "Before"}</th>
                <th>{isArabic ? "التغيير" : "Change"}</th>
                <th>{isArabic ? "بعد" : "After"}</th>
                <th>{isArabic ? "الفاتورة" : "Invoice"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement, index) => (
                <tr
                  key={`${movement.pharmacyId || "main"}-${movement.createdAt}-${movement.medicineId}-${index}`}
                >
                  {showBranchColumn && (
                    <td>
                      {getBranchLabel ? getBranchLabel(movement.pharmacyId) : movement.pharmacyId}
                    </td>
                  )}
                  <td>{getMovementTypeLabel(movement.type, isArabic)}</td>
                  <td>{isArabic ? movement.medicineName_ar : movement.medicineName_en}</td>
                  <td>{movement.barcode}</td>
                  <td>{movement.qtyBefore}</td>
                  <td>
                    <span
                      className={
                        safeNumber(movement.quantityChange) < 0 ? "badge danger" : "badge ok"
                      }
                    >
                      {safeNumber(movement.quantityChange) > 0
                        ? `+${movement.quantityChange}`
                        : movement.quantityChange}
                    </span>
                  </td>
                  <td>{movement.qtyAfter}</td>
                  <td>{movement.invoiceNumber || "-"}</td>
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
    </section>
  );
}
