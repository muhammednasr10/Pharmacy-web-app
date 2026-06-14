import { useMemo, useState } from "react";
import type { Medicine, PharmacySettings } from "../types";
import { formatDateInput } from "../utils/date";
import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getExpiryLimitValue,
  getExpiringSoonDaysForBranch,
  getLowStockThresholdForBranch,
} from "../utils/inventoryAlerts";
import {
  medicineMatchesInventorySearch,
  resolveMedicineActiveIngredient,
  resolveMedicineArabicName,
  resolveMedicineEnglishName,
} from "../utils/medicineLookup";

type MedicineTableProps = {
  medicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  showManagementActions: boolean;
  showColumnFilters?: boolean;
  showSplitNameColumns?: boolean;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart?: (medicine: Medicine) => void;
  addToCartLabel?: string;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  onViewStockDetail?: (medicine: Medicine) => void;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  branchAwareAlerts?: boolean;
  branches?: PharmacySettings[];
  fallbackSettings?: PharmacySettings | null;
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
  showSplitNameColumns,
  showBranchColumn = false,
  getBranchLabel,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  onAddToCart,
  addToCartLabel,
  onEditMedicine,
  onDeleteMedicine,
  onViewStockDetail,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
  branchAwareAlerts = false,
  branches = [],
  fallbackSettings = null,
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

  const splitNameColumns = showSplitNameColumns ?? showColumnFilters;
  const tableColumnCount =
    (showBranchColumn ? 1 : 0) + (splitNameColumns ? 3 : 1) + 7;

  const todayValue = formatDateInput(new Date());
  const defaultExpiringLimitValue = getExpiryLimitValue(expiringSoonDays);

  const resolveLowStockThreshold = (medicine: Medicine) =>
    branchAwareAlerts
      ? getLowStockThresholdForBranch(medicine.pharmacyId, branches, fallbackSettings)
      : lowStockThreshold;

  const resolveExpiringLimitValue = (medicine: Medicine) =>
    branchAwareAlerts
      ? getExpiryLimitValue(
          getExpiringSoonDaysForBranch(medicine.pharmacyId, branches, fallbackSettings),
        )
      : defaultExpiringLimitValue;

  const filteredMedicines = useMemo(() => {
    const nameQ = nameFilter.trim();

    return medicines.filter((medicine) => {
      const matchesName = medicineMatchesInventorySearch(medicine, nameQ);

      const barcodeQ = barcodeFilter.trim().toLowerCase();
      const matchesBarcode = !barcodeQ || medicine.barcode.toLowerCase().includes(barcodeQ);

      const qty = medicine.qty;
      const minQ = qtyMin !== "" ? Number(qtyMin) : null;
      const maxQ = qtyMax !== "" ? Number(qtyMax) : null;
      const matchesQty = (minQ === null || qty >= minQ) && (maxQ === null || qty <= maxQ);

      const expiry = medicine.expiry || "";
      const matchesExpiryRange =
        (!expiryFrom || (expiry && expiry >= expiryFrom)) &&
        (!expiryTo || (expiry && expiry <= expiryTo));

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && qty <= resolveLowStockThreshold(medicine)) ||
        (stockFilter === "expired" && expiry && expiry < todayValue) ||
        (stockFilter === "expiring" &&
          expiry &&
          expiry >= todayValue &&
          expiry <= resolveExpiringLimitValue(medicine));

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
    defaultExpiringLimitValue,
    lowStockThreshold,
    expiringSoonDays,
    branchAwareAlerts,
    branches,
    fallbackSettings,
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
    options?: { type?: "number" | "date"; step?: string },
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
              <label>{isArabic ? "بحث بالاسم أو المادة الفعالة" : "Search by name or active ingredient"}</label>
              <input
                className="inventoryFilterInput"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder={
                  isArabic
                    ? "مثال: paracetamol أو بانادول..."
                    : "e.g. Paracetamol or Panadol..."
                }
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
              {renderRangeField(t.qty, qtyMin, qtyMax, setQtyMin, setQtyMax)}
              {renderRangeField(t.expiry, expiryFrom, expiryTo, setExpiryFrom, setExpiryTo, {
                type: "date",
              })}
              {renderRangeField(
                isArabic ? "سعر الشراء" : "Buy price",
                buyMin,
                buyMax,
                setBuyMin,
                setBuyMax,
                { step: "0.01" },
              )}
              {renderRangeField(
                isArabic ? "سعر البيع" : "Sell price",
                sellMin,
                sellMax,
                setSellMin,
                setSellMax,
                { step: "0.01" },
              )}
            </div>
          )}
        </div>
      )}

      <div className={`tableWrap${splitNameColumns ? " medicineTableSplitNames" : ""}`}>
        <table>
          {splitNameColumns && (
            <colgroup>
              {showBranchColumn && <col className="medicineColBranch" />}
              <col className="medicineColNameAr" />
              <col className="medicineColNameEn" />
              <col className="medicineColIngredient" />
              <col className="medicineColBarcode" />
              <col className="medicineColQty" />
              <col className="medicineColExpiry" />
              <col className="medicineColBuy" />
              <col className="medicineColSell" />
              <col className="medicineColProfit" />
              <col className="medicineColAction" />
            </colgroup>
          )}
          <thead>
            <tr>
              {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
              {splitNameColumns ? (
                <>
                  <th className="medicineNameCell medicineNameCellAr">
                    {isArabic ? "الدواء بالعربي" : "Medicine (Arabic)"}
                  </th>
                  <th className="medicineNameCell medicineNameCellEn">
                    {isArabic ? "الدواء بالإنجليزي" : "Medicine (English)"}
                  </th>
                  <th className="medicineNameCell medicineNameCellIngredient">
                    {isArabic ? "المادة الفعالة" : "Active ingredient"}
                  </th>
                </>
              ) : (
                <th>{t.medicine}</th>
              )}
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
                <td colSpan={tableColumnCount} className="empty">
                  {isArabic ? "لا توجد نتائج مطابقة للفلاتر" : "No rows match the filters"}
                </td>
              </tr>
            ) : (
              filteredMedicines.map((medicine) => (
                <tr key={`${medicine.pharmacyId || "main"}-${medicine.id}`}>
                  {showBranchColumn && (
                    <td>
                      {getBranchLabel
                        ? getBranchLabel(medicine.pharmacyId)
                        : medicine.pharmacyId || "—"}
                    </td>
                  )}
                  {splitNameColumns ? (
                    <>
                      <td
                        className="medicineNameCell medicineNameCellAr"
                        title={resolveMedicineArabicName(medicine)}
                      >
                        {resolveMedicineArabicName(medicine) || "—"}
                      </td>
                      <td
                        className="medicineNameCell medicineNameCellEn"
                        dir="ltr"
                        title={resolveMedicineEnglishName(medicine)}
                      >
                        {resolveMedicineEnglishName(medicine) || "—"}
                      </td>
                      <td
                        className="medicineNameCell medicineNameCellIngredient"
                        dir="ltr"
                        title={resolveMedicineActiveIngredient(medicine)}
                      >
                        {resolveMedicineActiveIngredient(medicine) || "—"}
                      </td>
                    </>
                  ) : (
                    <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
                  )}
                  <td className="medicineColBarcode" title={medicine.barcode}>
                    {medicine.barcode}
                  </td>
                  <td>
                    {onViewStockDetail ? (
                      <button
                        type="button"
                        className="stockQtyBtn"
                        onClick={() => onViewStockDetail(medicine)}
                        title={isArabic ? "عرض تفاصيل حركة الكمية" : "View stock movement details"}
                      >
                        <span
                          className={
                            medicine.qty <= resolveLowStockThreshold(medicine)
                              ? "badge danger"
                              : "badge ok"
                          }
                        >
                          {medicine.qty}
                        </span>
                      </button>
                    ) : (
                      <span
                        className={
                          medicine.qty <= resolveLowStockThreshold(medicine)
                            ? "badge danger"
                            : "badge ok"
                        }
                      >
                        {medicine.qty}
                      </span>
                    )}
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
                      {canUsePOS && onAddToCart && (
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
