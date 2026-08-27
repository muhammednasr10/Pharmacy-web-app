import { useEffect, useMemo, useRef, useState } from "react";
import type { Medicine, PharmacySettings } from "../types";
import MedicineTable from "./MedicineTable";
import InventoryPaginationBar from "./inventory/InventoryPaginationBar";
import PosWarehouseScopeBar from "./PosWarehouseScopeBar";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import { isAllBranchesMode } from "../constants/branches";
import { medicineMatchesInventorySearch } from "../utils/medicineLookup";

export type PosSearchScope = "current" | "all" | string;

type PosManualSalePanelProps = {
  isArabic: boolean;
  isOnline: boolean;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
  pharmacyId: string;
  branches?: PharmacySettings[];
  getBranchLabel?: (branchId: string | undefined) => string;
  searchScope: PosSearchScope;
  onSearchScopeChange: (scope: PosSearchScope) => void;
  medicines: Medicine[];
  inventoryRefreshKey?: string | number;
  lowStockThreshold: number;
  expiringSoonDays: number;
  t: Record<string, string>;
  currency: string;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  canViewPosCostProfit: boolean;
  onAddToCart: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
};

export default function PosManualSalePanel({
  isArabic,
  isOnline,
  open,
  onToggle,
  compact = false,
  pharmacyId,
  branches = [],
  getBranchLabel,
  searchScope,
  onSearchScopeChange,
  medicines,
  inventoryRefreshKey = 0,
  lowStockThreshold,
  expiringSoonDays,
  t,
  currency,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  canViewPosCostProfit,
  onAddToCart,
  onEditMedicine,
  onDeleteMedicine,
}: PosManualSalePanelProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const branchOptions = useMemo(
    () => branches.filter((branch) => Boolean(branch.id)),
    [branches],
  );
  const canPickBranches = branchOptions.length > 1;

  const effectiveSearchScope: PosSearchScope =
    searchScope === pharmacyId ? "current" : searchScope;

  const searchPharmacyIds = useMemo(() => {
    if (effectiveSearchScope === "current") return [pharmacyId];
    if (effectiveSearchScope === "all") {
      const ids = branchOptions.map((branch) => branch.id).filter(Boolean);
      return [...new Set(ids.length > 0 ? [pharmacyId, ...ids] : [pharmacyId])];
    }
    return [effectiveSearchScope];
  }, [branchOptions, effectiveSearchScope, pharmacyId]);

  const searchingOtherBranches = effectiveSearchScope !== "current";

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      return;
    }
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    rows: inventoryRows,
    total: inventoryTotal,
    page,
    pageSize,
    loading: inventoryLoading,
    error: inventoryError,
    setPage,
    usesInventoryPagination,
    branchReady,
  } = usePosInventorySource({
    pharmacyId,
    searchPharmacyIds,
    enabled: isOnline && open && debouncedSearch.length > 0,
    search: debouncedSearch,
    refreshKey: inventoryRefreshKey,
    lowStockThreshold,
    expiringSoonDays,
  });

  const offlineRows = useMemo(() => {
    if (!debouncedSearch) return [];
    const pool = searchingOtherBranches
      ? medicines
      : medicines.filter((medicine) => (medicine.pharmacyId || pharmacyId) === pharmacyId);
    return pool
      .filter((medicine) => medicine.qty > 0)
      .filter((medicine) => medicineMatchesInventorySearch(medicine, debouncedSearch));
  }, [debouncedSearch, medicines, pharmacyId, searchingOtherBranches]);

  const tableRows = isOnline ? inventoryRows : offlineRows;

  const emptyMessage = useMemo(() => {
    if (!branchReady || isAllBranchesMode(pharmacyId)) {
      return isArabic
        ? "اختر مخزناً محدداً من إدارة المخزن"
        : "Select a specific warehouse branch";
    }
    if (!debouncedSearch) {
      return isArabic
        ? "اكتب اسم الدواء أو المادة الفعالة للبحث في المخزن"
        : "Type a medicine name or active ingredient to search inventory";
    }
    if (inventoryLoading && tableRows.length === 0) {
      return isArabic ? "جاري البحث في المخزن..." : "Searching inventory...";
    }
    return isArabic ? "لا توجد نتائج مطابقة في المخزن" : "No matching items in inventory";
  }, [isArabic, branchReady, pharmacyId, debouncedSearch, inventoryLoading, tableRows.length]);

  function handleAddToCart(medicine: Medicine) {
    const medicineBranch = medicine.pharmacyId || pharmacyId;
    if (medicineBranch !== pharmacyId) {
      const branchName = getBranchLabel?.(medicineBranch) || medicineBranch;
      window.alert(
        isArabic
          ? `هذا الدواء متوفر في «${branchName}» — البيع من المخزن الحالي فقط`
          : `This item is in "${branchName}" — sales use the current warehouse only`,
      );
      return;
    }
    onAddToCart(medicine);
  }

  return (
    <div className={`posManualSaleSection${open ? " is-open" : ""}${compact ? " is-compact" : ""}`}>
      {!compact ? (
        <button
          type="button"
          className="posManualSaleToggle"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="pos-manual-search-panel"
        >
          <span className="posManualSaleToggleIcon" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          <span className="posManualSaleToggleText">
            <span className="posManualSaleToggleTitle">
              {isArabic ? "البيع بالبحث اليدوي" : "Manual search sale"}
            </span>
            <span className="posManualSaleToggleHint mutedText">
              {open
                ? isArabic
                  ? "اضغط للإغلاق"
                  : "Click to collapse"
                : isArabic
                  ? "اضغط للفتح — بحث بالاسم أو المادة الفعالة"
                  : "Click to open — search by name or ingredient"}
            </span>
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="posManualSaleDropdown" id="pos-manual-search-panel">
          {canPickBranches ? (
            <PosWarehouseScopeBar
              isArabic={isArabic}
              pharmacyId={pharmacyId}
              branches={branches}
              searchScope={searchScope}
              getBranchLabel={getBranchLabel}
              onChange={onSearchScopeChange}
            />
          ) : null}

          <div className="posSearchField">
            <label className="posBarcodeLabel" htmlFor="pos-manual-search">
              {searchingOtherBranches
                ? isArabic
                  ? "بحث في مخازن أخرى"
                  : "Search other warehouses"
                : isArabic
                  ? "بحث في المخزن"
                  : "Search inventory"}
            </label>
            <div className="posBarcodeRow posNameSearchRow">
              <span className="posBarcodeIcon" aria-hidden="true">
                🔍
              </span>
              <input
                id="pos-manual-search"
                ref={searchInputRef}
                className="posBarcodeInput"
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isArabic ? "مثال: paracetamol أو بانادول..." : "e.g. Paracetamol or Panadol..."
                }
              />
              {search ? (
                <button
                  type="button"
                  className="posBarcodeClearBtn"
                  onClick={() => setSearch("")}
                  aria-label={isArabic ? "مسح" : "Clear"}
                >
                  ✕
                </button>
              ) : null}
            </div>
            {searchingOtherBranches ? (
              <p className="posSearchScopeHint mutedText">
                {isArabic
                  ? "عرض التوفر في الفروع — الإضافة للسلة من المخزن الحالي فقط"
                  : "Shows availability across branches — only the current warehouse can be sold"}
              </p>
            ) : null}
          </div>

          {inventoryError ? <p className="invMgmtError">{inventoryError}</p> : null}

          <div className="posManualSaleTableWrap">
            <MedicineTable
              medicines={tableRows}
              t={t}
              isArabic={isArabic}
              currency={currency}
              showManagementActions={false}
              showSplitNameColumns
              showBranchColumn={searchingOtherBranches}
              getBranchLabel={getBranchLabel}
              emptyMessage={emptyMessage}
              canUsePOS={canUsePOS}
              canManageInventory={canManageInventory}
              canDeleteMedicine={canDeleteMedicine}
              showCostProfitColumns={canViewPosCostProfit}
              onAddToCart={handleAddToCart}
              onEditMedicine={onEditMedicine}
              onDeleteMedicine={onDeleteMedicine}
              lowStockThreshold={lowStockThreshold}
              expiringSoonDays={expiringSoonDays}
              branches={branches}
              externalPagination={
                isOnline && debouncedSearch
                  ? {
                      page: page - 1,
                      pageSize,
                      total: inventoryTotal,
                      loading: inventoryLoading,
                    }
                  : undefined
              }
            />
          </div>

          {isOnline && debouncedSearch && (usesInventoryPagination || inventoryTotal > pageSize) ? (
            <InventoryPaginationBar
              isArabic={isArabic}
              page={page}
              pageSize={pageSize}
              total={inventoryTotal}
              loading={inventoryLoading}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
