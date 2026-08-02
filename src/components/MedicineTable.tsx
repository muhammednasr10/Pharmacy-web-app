import MedicineTableBody from "./medicine-table/MedicineTableBody";
import MedicineTableFilters from "./medicine-table/MedicineTableFilters";
import MedicineTablePagination from "./medicine-table/MedicineTablePagination";
import type { MedicineTableProps } from "./medicine-table/types";
import { useMedicineTableState } from "./medicine-table/useMedicineTableState";

export default function MedicineTable({
  medicines,
  t,
  isArabic,
  currency,
  showManagementActions,
  showColumnFilters = false,
  showSplitNameColumns,
  showCostProfitColumns = false,
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
  lowStockThreshold,
  expiringSoonDays,
  branchAwareAlerts = false,
  branches = [],
  fallbackSettings = null,
  emptyMessage,
  externalPagination,
}: MedicineTableProps) {
  const {
    splitNameColumns,
    tableColumnCount,
    resolveLowStockThreshold,
    filteredMedicines,
    hasActiveFilters,
    hasAdvancedFilters,
    isLargeCatalogBrowse,
    isServerPaginated,
    totalPages,
    safePage,
    pageRows,
    setPage,
    clearFilters,
    filters,
  } = useMedicineTableState({
    medicines,
    showColumnFilters,
    showSplitNameColumns,
    showCostProfitColumns,
    showBranchColumn,
    lowStockThreshold,
    expiringSoonDays,
    branchAwareAlerts,
    branches,
    fallbackSettings,
    externalPagination,
  });

  return (
    <>
      {showColumnFilters && (
        <MedicineTableFilters
          isArabic={isArabic}
          t={t}
          medicinesCount={medicines.length}
          filteredCount={filteredMedicines.length}
          showCostProfitColumns={showCostProfitColumns}
          isLargeCatalogBrowse={isLargeCatalogBrowse}
          hasActiveFilters={Boolean(hasActiveFilters)}
          hasAdvancedFilters={Boolean(hasAdvancedFilters)}
          onClearFilters={clearFilters}
          {...filters}
        />
      )}

      <MedicineTableBody
        pageRows={pageRows}
        tableColumnCount={tableColumnCount}
        splitNameColumns={splitNameColumns}
        showBranchColumn={showBranchColumn}
        showCostProfitColumns={showCostProfitColumns}
        isArabic={isArabic}
        currency={currency}
        t={t}
        emptyMessage={emptyMessage}
        showManagementActions={showManagementActions}
        canUsePOS={canUsePOS}
        canManageInventory={canManageInventory}
        canDeleteMedicine={canDeleteMedicine}
        getBranchLabel={getBranchLabel}
        onAddToCart={onAddToCart}
        addToCartLabel={addToCartLabel}
        onEditMedicine={onEditMedicine}
        onDeleteMedicine={onDeleteMedicine}
        onViewStockDetail={onViewStockDetail}
        resolveLowStockThreshold={resolveLowStockThreshold}
      />

      {!isServerPaginated && (
        <MedicineTablePagination
          isArabic={isArabic}
          filteredCount={filteredMedicines.length}
          safePage={safePage}
          totalPages={totalPages}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
        />
      )}
    </>
  );
}
