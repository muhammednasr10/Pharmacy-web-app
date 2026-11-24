/** Inventory E2E helpers — barrel re-exports for stable import paths. */
export {
  openInventoryMovementsTab,
  openInventoryPurchaseRequestsTab,
  openInventoryStockCountLogTab,
  openInventoryStockTab,
} from "./inventory/tabs";
export {
  createZeroStockMedicine,
  expectInventoryBarcodeVisible,
  expectInventoryPagination,
  expectInventoryStockResults,
  expectPurchaseRequestVisible,
  searchInventoryMovements,
  searchInventoryStock,
  type ZeroStockMedicineInput,
} from "./inventory/stock";
