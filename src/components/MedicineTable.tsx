import { useMemo, useState } from "react";
import type { Medicine } from "../types";
import { formatDateInput } from "../utils/date";
import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getExpiryLimitValue,
} from "../utils/inventoryAlerts";

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
  addToCartLabel?: string;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
};

type StockFilter = "all" | "low" | "expiring" | "expired";

const stockFilterOptions: { value: StockFilter; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "low", ar: "ناقص", en: "Low stock" },
  { value: "expiring", ar: "قرب الانتهاء", en: "Expiring" },
  { value: "expired", ar: "منتهي", en: "Expired" },
];

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
  addToCartLabel,
  onEditMedicine,
  onDeleteMedicine,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const todayValue = formatDateInput(new Date());
  const expiringLimitValue = getExpiryLimitValue(expiringSoonDays);

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
        (stockFilter === "low" && qty <= lowStockThreshold) ||
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
    lowStockThreshold,
    expiringSoonDays,
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

  const hasAdvancedFilters =
    qtyMin || qtyMax || expiryFrom || expiryTo || buyMin || buyMax || sellMin || sellMax;

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

  function renderRangeField(
    label: string,
    minValue: string,
    maxValue: string,
    onMinChange: (value: string) => void,
    onMaxChange: (value: string) => void,
    options?: { type?: "number" | "date"; step?: string }
  ) {
    const inputType = options?.type || "number";

    return (
      <div className="inventoryFilterRangeCard">
        <span className="inventoryFilterRangeLabel">{label}</span>
        <div className="inventoryFilterRangeInputs">
          <input
            className="inventoryFilterInput"
            type={inputType}
            min={inputType === "number" ? 0 : undefined}
            step={options?.step}
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder={isArabic ? "من" : "Min"}
          />
          <span className="inventoryFilterRangeSep">{isArabic ? "→" : "→"}</span>
          <input
            className="inventoryFilterInput"
            type={inputType}
            min={inputType === "number" ? 0 : undefined}
            step={options?.step}
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder={isArabic ? "إلى" : "Max"}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {showColumnFilters && (
        <div className="inventoryFilterPanel">
          <div className="inventoryFilterTop">
            <div className="inventoryFilterIntro">
              <h4>{isArabic ? "بحث وتصفية المخزون" : "Search & filter inventory"}</h4>
              <span className="inventoryFilterCount">
                {isArabic
                  ? `${filteredMedicines.length} من ${medicines.length} صنف`
                  : `${filteredMedicines.length} of ${medicines.length} items`}
              </span>
            </div>
            {hasActiveFilters && (
              <button type="button" className="inventoryFilterClearBtn" onClick={clearFilters}>
                {isArabic ? "مسح الفلاتر" : "Clear filters"}
              </button>
            )}
          </div>

          <div className="inventoryFilterMain">
            <div className="inventoryFilterField inventoryFilterFieldWide">
              <label>{isArabic ? "بحث بالاسم" : "Search by name"}</label>
              <input
                className="inventoryFilterInput"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder={isArabic ? "اكتب اسم الدواء..." : "Type medicine name..."}
              />
            </div>
            <div className="inventoryFilterField">
              <label>{t.barcode}</label>
              <input
                className="inventoryFilterInput"
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
                placeholder={isArabic ? "رقم الباركود..." : "Barcode number..."}
              />
            </div>
            <div className="inventoryFilterField inventoryFilterFieldChips">
              <label>{isArabic ? "حالة المخزون" : "Stock status"}</label>
              <div className="inventoryFilterChips">
                {stockFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      stockFilter === option.value
                        ? "inventoryFilterChip isActive"
                        : "inventoryFilterChip"
                    }
                    onClick={() => setStockFilter(option.value)}
                  >
                    {isArabic ? option.ar : option.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="inventoryFilterAdvancedToggle">
            <button
              type="button"
              className="inventoryFilterAdvancedBtn"
              onClick={() => setShowAdvancedFilters((open) => !open)}
              aria-expanded={showAdvancedFilters}
            >
              <span>{isArabic ? "فلاتر متقدمة" : "Advanced filters"}</span>
              {hasAdvancedFilters && <span className="inventoryFilterAdvancedDot" />}
              <span className={`inventoryFilterChevron ${showAdvancedFilters ? "isOpen" : ""}`}>
                ▾
              </span>
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="inventoryFilterAdvanced">
              {renderRangeField(
                t.qty,
                qtyMin,
                qtyMax,
                setQtyMin,
                setQtyMax
              )}
              {renderRangeField(
                t.expiry,
                expiryFrom,
                expiryTo,
                setExpiryFrom,
                setExpiryTo,
                { type: "date" }
              )}
              {renderRangeField(
                isArabic ? "سعر الشراء" : "Buy price",
                buyMin,
                buyMax,
                setBuyMin,
                setBuyMax,
                { step: "0.01" }
              )}
              {renderRangeField(
                isArabic ? "سعر البيع" : "Sell price",
                sellMin,
                sellMax,
                setSellMin,
                setSellMax,
                { step: "0.01" }
              )}
            </div>
          )}
        </div>
      )}

      <div className="tableWrap">
        <table>
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
                    <span className={medicine.qty <= lowStockThreshold ? "badge danger" : "badge ok"}>
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
                          {addToCartLabel || t.add}
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
