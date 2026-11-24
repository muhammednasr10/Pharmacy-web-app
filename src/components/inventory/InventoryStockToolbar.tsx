import FeatureGate from "../FeatureGate";
import { useUiSpotlightOnMount } from "../../hooks/useUiSpotlightOnMount";
import type { StockCatalogFilter } from "../../services/pharmacy/inventoryPaginationService";

const stockFilterOptions: { value: StockCatalogFilter; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "in_stock", ar: "متوفر", en: "In stock" },
  { value: "low", ar: "ناقص", en: "Low stock" },
  { value: "expiring", ar: "قرب الانتهاء", en: "Expiring" },
  { value: "expired", ar: "منتهي", en: "Expired" },
];

type InventoryStockToolbarProps = {
  isArabic: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  stockFilter: StockCatalogFilter;
  onStockFilterChange: (value: StockCatalogFilter) => void;
  branchesCount: number;
  canTransferStock: boolean;
  transferUpgradeNotice: string | null;
  canManageInventory: boolean;
  showReorder: boolean;
  showStockCount: boolean;
  canUnlockBuyPrice?: boolean;
  buyPriceUnlocked?: boolean;
  onToggleBuyPriceUnlock?: () => void;
  onOpenTransfer: () => void;
  onOpenReorder: () => void;
  onOpenStockCount: () => void;
  onOpenCatalogImport: () => void;
  onOpenAdd: () => void;
  onExportCSV: () => void;
};

export default function InventoryStockToolbar({
  isArabic,
  search,
  onSearchChange,
  stockFilter,
  onStockFilterChange,
  branchesCount,
  canTransferStock,
  transferUpgradeNotice,
  canManageInventory,
  showReorder,
  showStockCount,
  canUnlockBuyPrice = false,
  buyPriceUnlocked = false,
  onToggleBuyPriceUnlock,
  onOpenTransfer,
  onOpenReorder,
  onOpenStockCount,
  onOpenCatalogImport,
  onOpenAdd,
  onExportCSV,
}: InventoryStockToolbarProps) {
  useUiSpotlightOnMount(isArabic, canManageInventory);

  return (
    <div className="invMgmtPanelToolbar invMgmtStockToolbar">
      <div className="filtersBar invMgmtFiltersBar">
        <input
          className="invMgmtSearchInput"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={
            isArabic ? "بحث بالاسم أو المادة الفعالة أو الباركود" : "Search name, ingredient, or barcode"
          }
        />
        <div className="invMgmtStockChips" role="group" aria-label={isArabic ? "فلتر المخزون" : "Stock filter"}>
          {stockFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`invMgmtStockChip ${stockFilter === option.value ? "is-active" : ""}`}
              onClick={() => onStockFilterChange(option.value)}
            >
              {isArabic ? option.ar : option.en}
            </button>
          ))}
        </div>
        {canUnlockBuyPrice && onToggleBuyPriceUnlock ? (
          <button
            type="button"
            className={`invMgmtBuyPriceUnlockBtn${buyPriceUnlocked ? " is-unlocked" : ""}`}
            onClick={onToggleBuyPriceUnlock}
            title={
              buyPriceUnlocked
                ? isArabic
                  ? "إخفاء سعر الشراء"
                  : "Hide buy price"
                : isArabic
                  ? "إظهار سعر الشراء (برقم التليفون)"
                  : "Show buy price (phone unlock)"
            }
            aria-label={
              buyPriceUnlocked
                ? isArabic
                  ? "إخفاء سعر الشراء"
                  : "Hide buy price"
                : isArabic
                  ? "إظهار سعر الشراء"
                  : "Show buy price"
            }
            aria-pressed={buyPriceUnlocked}
          >
            <span aria-hidden="true">{buyPriceUnlocked ? "🔓" : "🔒"}</span>
            <span>
              {buyPriceUnlocked
                ? isArabic
                  ? "سعر الشراء ظاهر"
                  : "Buy price visible"
                : isArabic
                  ? "سعر الشراء"
                  : "Buy price"}
            </span>
          </button>
        ) : null}
      </div>
      <div className="inventoryHeaderActions">
        {branchesCount > 1 && (canTransferStock || transferUpgradeNotice) ? (
          <FeatureGate feature="branchTransfers">
            <button
              type="button"
              className="editBtn"
              onClick={() => {
                if (canTransferStock) onOpenTransfer();
              }}
            >
              {isArabic ? "⇄ نقل بين الفروع" : "⇄ Branch transfer"}
            </button>
          </FeatureGate>
        ) : null}
        {canManageInventory && showReorder && (
          <button type="button" className="editBtn" onClick={onOpenReorder}>
            {isArabic ? "🛒 اقتراح توريد" : "🛒 Reorder"}
          </button>
        )}
        {canManageInventory && showStockCount && (
          <button type="button" className="editBtn" onClick={onOpenStockCount}>
            {isArabic ? "📋 جرد مخزون" : "📋 Stock count"}
          </button>
        )}
        {canManageInventory && (
          <button
            type="button"
            className="editBtn"
            data-tour-id="inventory-import-catalog"
            onClick={onOpenCatalogImport}
          >
            {isArabic ? "📥 استيراد قاعدة بيانات أدوية" : "📥 Import medicine database"}
          </button>
        )}
        {canManageInventory && (
          <button
            type="button"
            className="addMedicineBtn"
            data-tour-id="inventory-add-medicine"
            onClick={onOpenAdd}
          >
            {isArabic ? "+ إضافة دواء جديد" : "+ Add New Medicine"}
          </button>
        )}
        <button type="button" className="printBtn" onClick={onExportCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>
    </div>
  );
}
