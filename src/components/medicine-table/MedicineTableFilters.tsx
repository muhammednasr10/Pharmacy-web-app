import { MEDICINE_TABLE_PAGE_SIZE } from "../../constants/medicineCatalog";
import { stockFilterOptions } from "./types";
import type { StockFilter } from "./types";

type FilterRangeFieldProps = {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  isArabic: boolean;
  type?: "number" | "date";
  step?: string;
};

function FilterRangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  isArabic,
  type = "number",
  step,
}: FilterRangeFieldProps) {
  return (
    <div className="inventoryFilterRangeCard">
      <span className="inventoryFilterRangeLabel">{label}</span>
      <div className="inventoryFilterRangeInputs">
        <input
          className="inventoryFilterInput"
          type={type}
          min={type === "number" ? 0 : undefined}
          step={step}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder={isArabic ? "من" : "Min"}
        />
        <span className="inventoryFilterRangeSep">{isArabic ? "→" : "→"}</span>
        <input
          className="inventoryFilterInput"
          type={type}
          min={type === "number" ? 0 : undefined}
          step={step}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder={isArabic ? "إلى" : "Max"}
        />
      </div>
    </div>
  );
}

type MedicineTableFiltersProps = {
  isArabic: boolean;
  t: Record<string, string>;
  medicinesCount: number;
  filteredCount: number;
  showCostProfitColumns: boolean;
  isLargeCatalogBrowse: boolean;
  hasActiveFilters: boolean;
  hasAdvancedFilters: boolean;
  onClearFilters: () => void;
  nameFilter: string;
  setNameFilter: (value: string) => void;
  barcodeFilter: string;
  setBarcodeFilter: (value: string) => void;
  stockFilter: StockFilter;
  setStockFilter: (value: StockFilter) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (value: boolean | ((open: boolean) => boolean)) => void;
  qtyMin: string;
  setQtyMin: (value: string) => void;
  qtyMax: string;
  setQtyMax: (value: string) => void;
  expiryFrom: string;
  setExpiryFrom: (value: string) => void;
  expiryTo: string;
  setExpiryTo: (value: string) => void;
  buyMin: string;
  setBuyMin: (value: string) => void;
  buyMax: string;
  setBuyMax: (value: string) => void;
  sellMin: string;
  setSellMin: (value: string) => void;
  sellMax: string;
  setSellMax: (value: string) => void;
};

export default function MedicineTableFilters({
  isArabic,
  t,
  medicinesCount,
  filteredCount,
  showCostProfitColumns,
  isLargeCatalogBrowse,
  hasActiveFilters,
  hasAdvancedFilters,
  onClearFilters,
  nameFilter,
  setNameFilter,
  barcodeFilter,
  setBarcodeFilter,
  stockFilter,
  setStockFilter,
  showAdvancedFilters,
  setShowAdvancedFilters,
  qtyMin,
  setQtyMin,
  qtyMax,
  setQtyMax,
  expiryFrom,
  setExpiryFrom,
  expiryTo,
  setExpiryTo,
  buyMin,
  setBuyMin,
  buyMax,
  setBuyMax,
  sellMin,
  setSellMin,
  sellMax,
  setSellMax,
}: MedicineTableFiltersProps) {
  return (
    <div className="inventoryFilterPanel">
      <div className="inventoryFilterTop">
        <div className="inventoryFilterIntro">
          <h4>{isArabic ? "بحث وتصفية المخزون" : "Search & filter inventory"}</h4>
          <span className="inventoryFilterCount">
            {isArabic
              ? `${filteredCount} من ${medicinesCount} صنف`
              : `${filteredCount} of ${medicinesCount} items`}
          </span>
        </div>
        {hasActiveFilters && (
          <button type="button" className="inventoryFilterClearBtn" onClick={onClearFilters}>
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

      {isLargeCatalogBrowse ? (
        <p className="medicineTableBrowseHint">
          {isArabic
            ? `تم تحميل ${medicinesCount.toLocaleString()} دواء — يُعرض ${MEDICINE_TABLE_PAGE_SIZE} في كل صفحة. ابحث بالاسم أو المادة الفعالة للوصول لدواء معيّن، أو تصفّح بالأسهم أدناه.`
            : `${medicinesCount.toLocaleString()} medicines loaded — showing ${MEDICINE_TABLE_PAGE_SIZE} per page. Search by name or active ingredient, or browse with the pager below.`}
        </p>
      ) : null}

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
          <FilterRangeField
            label={t.qty}
            minValue={qtyMin}
            maxValue={qtyMax}
            onMinChange={setQtyMin}
            onMaxChange={setQtyMax}
            isArabic={isArabic}
          />
          <FilterRangeField
            label={t.expiry}
            minValue={expiryFrom}
            maxValue={expiryTo}
            onMinChange={setExpiryFrom}
            onMaxChange={setExpiryTo}
            isArabic={isArabic}
            type="date"
          />
          {showCostProfitColumns ? (
            <FilterRangeField
              label={isArabic ? "سعر الشراء" : "Buy price"}
              minValue={buyMin}
              maxValue={buyMax}
              onMinChange={setBuyMin}
              onMaxChange={setBuyMax}
              isArabic={isArabic}
              step="0.01"
            />
          ) : null}
          <FilterRangeField
            label={isArabic ? "سعر البيع" : "Sell price"}
            minValue={sellMin}
            maxValue={sellMax}
            onMinChange={setSellMin}
            onMaxChange={setSellMax}
            isArabic={isArabic}
            step="0.01"
          />
        </div>
      )}
    </div>
  );
}
