import { useMemo, useState } from "react";
import type { Medicine } from "../types";
import { formatDateInput } from "../utils/date";

type MedicineTableProps = {
  medicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  showManagementActions: boolean;
  showColumnFilters?: boolean;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
};

type StockFilter = "all" | "low" | "expiring" | "expired";

export default function MedicineTable({
  medicines,
  t,
  isArabic,
  currency,
  showManagementActions,
  showColumnFilters = false,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  onAddToCart,
  onEditMedicine,
  onDeleteMedicine,
}: MedicineTableProps) {
  const [nameFilter, setNameFilter] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState("");
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [buyMin, setBuyMin] = useState("");
  const [buyMax, setBuyMax] = useState("");
  const [sellMin, setSellMin] = useState("");
  const [sellMax, setSellMax] = useState("");

  const todayValue = formatDateInput(new Date());
  const expiringLimit = new Date();
  expiringLimit.setDate(expiringLimit.getDate() + 30);
  const expiringLimitValue = formatDateInput(expiringLimit);

  const filteredMedicines = useMemo(() => {
    const nameQ = nameFilter.trim().toLowerCase();
    const barcodeQ = barcodeFilter.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const displayName = (isArabic ? medicine.name_ar : medicine.name_en) || "";
      const matchesName =
        !nameQ ||
        medicine.name_ar.toLowerCase().includes(nameQ) ||
        medicine.name_en.toLowerCase().includes(nameQ) ||
        displayName.toLowerCase().includes(nameQ);

      const matchesBarcode = !barcodeQ || medicine.barcode.toLowerCase().includes(barcodeQ);

      const qty = medicine.qty;
      const minQ = qtyMin !== "" ? Number(qtyMin) : null;
      const maxQ = qtyMax !== "" ? Number(qtyMax) : null;
      const matchesQty =
        (minQ === null || qty >= minQ) && (maxQ === null || qty <= maxQ);

      const expiry = medicine.expiry || "";
      const matchesExpiryRange =
        (!expiryFrom || (expiry && expiry >= expiryFrom)) &&
        (!expiryTo || (expiry && expiry <= expiryTo));

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && qty <= 20) ||
        (stockFilter === "expired" && expiry && expiry < todayValue) ||
        (stockFilter === "expiring" &&
          expiry &&
          expiry >= todayValue &&
          expiry <= expiringLimitValue);

      const buy = medicine.buyPrice || 0;
      const sell = medicine.price || 0;
      const bMin = buyMin !== "" ? Number(buyMin) : null;
      const bMax = buyMax !== "" ? Number(buyMax) : null;
      const sMin = sellMin !== "" ? Number(sellMin) : null;
      const sMax = sellMax !== "" ? Number(sellMax) : null;
      const matchesBuy = (bMin === null || buy >= bMin) && (bMax === null || buy <= bMax);
      const matchesSell = (sMin === null || sell >= sMin) && (sMax === null || sell <= sMax);

      return (
        matchesName &&
        matchesBarcode &&
        matchesQty &&
        matchesExpiryRange &&
        matchesStock &&
        matchesBuy &&
        matchesSell
      );
    });
  }, [
    medicines,
    nameFilter,
    barcodeFilter,
    qtyMin,
    qtyMax,
    expiryFrom,
    expiryTo,
    stockFilter,
    buyMin,
    buyMax,
    sellMin,
    sellMax,
    isArabic,
    todayValue,
    expiringLimitValue,
  ]);

  const hasActiveFilters =
    nameFilter ||
    barcodeFilter ||
    qtyMin ||
    qtyMax ||
    expiryFrom ||
    expiryTo ||
    stockFilter !== "all" ||
    buyMin ||
    buyMax ||
    sellMin ||
    sellMax;

  function clearFilters() {
    setNameFilter("");
    setBarcodeFilter("");
    setQtyMin("");
    setQtyMax("");
    setExpiryFrom("");
    setExpiryTo("");
    setStockFilter("all");
    setBuyMin("");
    setBuyMax("");
    setSellMin("");
    setSellMax("");
  }

  return (
    <>
      {showColumnFilters && hasActiveFilters && (
        <div className="tableFilterMeta">
          <span>
            {isArabic
              ? `عرض ${filteredMedicines.length} من ${medicines.length}`
              : `Showing ${filteredMedicines.length} of ${medicines.length}`}
          </span>
          <button type="button" className="clearCartBtn" onClick={clearFilters}>
            {isArabic ? "مسح فلاتر الأعمدة" : "Clear column filters"}
          </button>
        </div>
      )}

      <div className="tableWrap">
        <table className={showColumnFilters ? "tableWithFilters" : ""}>
          <thead>
            <tr>
              <th>{t.medicine}</th>
              <th>{t.barcode}</th>
              <th>{t.qty}</th>
              <th>{t.expiry}</th>
              <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
              <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
              <th>{isArabic ? "الربح" : "Profit"}</th>
              <th>{t.action}</th>
            </tr>
            {showColumnFilters && (
              <tr className="tableFilterRow">
                <th>
                  <input
                    className="colFilterInput"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder={isArabic ? "بحث..." : "Search..."}
                  />
                </th>
                <th>
                  <input
                    className="colFilterInput"
                    value={barcodeFilter}
                    onChange={(e) => setBarcodeFilter(e.target.value)}
                    placeholder={isArabic ? "باركود..." : "Barcode..."}
                  />
                </th>
                <th>
                  <div className="colFilterRange">
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      value={qtyMin}
                      onChange={(e) => setQtyMin(e.target.value)}
                      placeholder={isArabic ? "من" : "Min"}
                    />
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      value={qtyMax}
                      onChange={(e) => setQtyMax(e.target.value)}
                      placeholder={isArabic ? "إلى" : "Max"}
                    />
                  </div>
                </th>
                <th>
                  <select
                    className="colFilterSelect"
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                  >
                    <option value="all">{isArabic ? "الكل" : "All"}</option>
                    <option value="low">{isArabic ? "ناقص" : "Low"}</option>
                    <option value="expiring">{isArabic ? "قرب الانتهاء" : "Expiring"}</option>
                    <option value="expired">{isArabic ? "منتهي" : "Expired"}</option>
                  </select>
                  <div className="colFilterRange colFilterRangeDates">
                    <input
                      className="colFilterInput"
                      type="date"
                      value={expiryFrom}
                      onChange={(e) => setExpiryFrom(e.target.value)}
                      title={isArabic ? "صلاحية من" : "Expiry from"}
                    />
                    <input
                      className="colFilterInput"
                      type="date"
                      value={expiryTo}
                      onChange={(e) => setExpiryTo(e.target.value)}
                      title={isArabic ? "صلاحية إلى" : "Expiry to"}
                    />
                  </div>
                </th>
                <th>
                  <div className="colFilterRange">
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      step="0.01"
                      value={buyMin}
                      onChange={(e) => setBuyMin(e.target.value)}
                      placeholder={isArabic ? "من" : "Min"}
                    />
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      step="0.01"
                      value={buyMax}
                      onChange={(e) => setBuyMax(e.target.value)}
                      placeholder={isArabic ? "إلى" : "Max"}
                    />
                  </div>
                </th>
                <th>
                  <div className="colFilterRange">
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      step="0.01"
                      value={sellMin}
                      onChange={(e) => setSellMin(e.target.value)}
                      placeholder={isArabic ? "من" : "Min"}
                    />
                    <input
                      className="colFilterInput"
                      type="number"
                      min={0}
                      step="0.01"
                      value={sellMax}
                      onChange={(e) => setSellMax(e.target.value)}
                      placeholder={isArabic ? "إلى" : "Max"}
                    />
                  </div>
                </th>
                <th />
                <th />
              </tr>
            )}
          </thead>
          <tbody>
            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  {isArabic ? "لا توجد نتائج مطابقة للفلاتر" : "No rows match the filters"}
                </td>
              </tr>
            ) : (
              filteredMedicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
                  <td>{medicine.barcode}</td>
                  <td>
                    <span className={medicine.qty <= 20 ? "badge danger" : "badge ok"}>
                      {medicine.qty}
                    </span>
                  </td>
                  <td>{medicine.expiry}</td>
                  <td>
                    {(medicine.buyPrice || 0).toFixed(2)} {currency}
                  </td>
                  <td>
                    {(medicine.price || 0).toFixed(2)} {currency}
                  </td>
                  <td>
                    {((medicine.price || 0) - (medicine.buyPrice || 0)).toFixed(2)} {currency}
                  </td>
                  <td>
                    <div className="actionButtons">
                      {canUsePOS && (
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => onAddToCart(medicine)}
                        >
                          {t.add}
                        </button>
                      )}
                      {showManagementActions && canManageInventory && (
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => onEditMedicine(medicine)}
                        >
                          {isArabic ? "تعديل" : "Edit"}
                        </button>
                      )}
                      {showManagementActions && canDeleteMedicine && (
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          onClick={() => onDeleteMedicine(medicine)}
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
