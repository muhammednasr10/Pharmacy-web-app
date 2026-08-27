import { useEffect, useMemo, useRef, useState } from "react";
import type { Medicine, PharmacySettings } from "../types";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import { medicineMatchesInventorySearch } from "../utils/medicineLookup";
import type { PosSearchScope } from "./PosManualSalePanel";
import { playBarcodeBeep } from "../utils/barcodeBeep";

type PosSmartSearchProps = {
  isArabic: boolean;
  isOnline: boolean;
  disabled?: boolean;
  pharmacyId: string;
  searchScope: PosSearchScope;
  branches?: PharmacySettings[];
  getBranchLabel?: (branchId: string | undefined) => string;
  medicines: Medicine[];
  inventoryRefreshKey?: string | number;
  lowStockThreshold: number;
  expiringSoonDays: number;
  onAddToCart: (medicine: Medicine) => void;
};

export default function PosSmartSearch({
  isArabic,
  isOnline,
  disabled = false,
  pharmacyId,
  searchScope,
  branches = [],
  getBranchLabel,
  medicines,
  inventoryRefreshKey = 0,
  lowStockThreshold,
  expiringSoonDays,
  onAddToCart,
}: PosSmartSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveSearchScope: PosSearchScope =
    searchScope === pharmacyId ? "current" : searchScope;
  const searchingOtherBranches = effectiveSearchScope !== "current";

  const searchPharmacyIds = useMemo(() => {
    const branchOptions = branches.filter((branch) => Boolean(branch.id));
    if (effectiveSearchScope === "current") return [pharmacyId];
    if (effectiveSearchScope === "all") return branchOptions.map((branch) => branch.id);
    return [effectiveSearchScope];
  }, [branches, effectiveSearchScope, pharmacyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 150);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { rows, loading, branchReady } = usePosInventorySource({
    pharmacyId,
    searchPharmacyIds,
    enabled: isOnline && debouncedSearch.length >= 2 && !disabled,
    search: debouncedSearch,
    refreshKey: inventoryRefreshKey,
    lowStockThreshold,
    expiringSoonDays,
  });

  const offlineRows = useMemo(() => {
    if (!debouncedSearch || isOnline) return [];
    const pool = searchingOtherBranches
      ? medicines
      : medicines.filter((medicine) => (medicine.pharmacyId || pharmacyId) === pharmacyId);
    return pool
      .filter((medicine) => medicine.qty > 0)
      .filter((medicine) => medicineMatchesInventorySearch(medicine, debouncedSearch))
      .slice(0, 12);
  }, [debouncedSearch, isOnline, medicines, pharmacyId, searchingOtherBranches]);

  const results = isOnline ? rows.slice(0, 12) : offlineRows;
  const showResults = debouncedSearch.length >= 2 && branchReady;

  function pickMedicine(medicine: Medicine) {
    const medicineBranch = medicine.pharmacyId || pharmacyId;
    if (medicineBranch !== pharmacyId) {
      const branchName = getBranchLabel?.(medicineBranch) || medicineBranch;
      window.alert(
        isArabic
          ? `متوفر في «${branchName}» (${medicine.qty}) — البيع من المخزن الحالي فقط`
          : `Available in "${branchName}" (${medicine.qty}) — sell from current warehouse only`,
      );
      return;
    }
    if (medicine.qty <= 0) {
      window.alert(isArabic ? "الكمية صفر في المخزن الحالي" : "Out of stock in current warehouse");
      return;
    }
    onAddToCart(medicine);
    setSearch("");
    setDebouncedSearch("");
    playBarcodeBeep(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="posSmartSearch">
      <label className="posBarcodeLabel" htmlFor="pos-smart-search">
        {isArabic ? "بحث سريع بالاسم أو الباركود" : "Quick search by name or barcode"}
      </label>
      <div className="posSmartSearchRow">
        <span className="posBarcodeIcon" aria-hidden="true">
          🔍
        </span>
        <input
          id="pos-smart-search"
          ref={inputRef}
          className="posBarcodeInput"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            isArabic
              ? "اكتب حرفين على الأقل — النتائج تظهر فوراً"
              : "Type at least 2 characters — results appear instantly"
          }
        />
        {search ? (
          <button
            type="button"
            className="posBarcodeClearBtn"
            onClick={() => {
              setSearch("");
              setDebouncedSearch("");
              inputRef.current?.focus();
            }}
            aria-label={isArabic ? "مسح" : "Clear"}
          >
            ✕
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div className="posSmartSearchResults" role="listbox" aria-label={isArabic ? "نتائج البحث" : "Search results"}>
          {loading && results.length === 0 ? (
            <p className="posSmartSearchStatus mutedText">
              {isArabic ? "جاري البحث..." : "Searching..."}
            </p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="posSmartSearchStatus mutedText">
              {isArabic ? "لا توجد نتائج" : "No results"}
            </p>
          ) : null}
          {results.map((medicine) => {
            const sellable = (medicine.pharmacyId || pharmacyId) === pharmacyId && medicine.qty > 0;
            return (
              <button
                key={`${medicine.pharmacyId || pharmacyId}-${medicine.id}`}
                type="button"
                role="option"
                className={`posSmartSearchOption${sellable ? "" : " is-readonly"}`}
                onClick={() => pickMedicine(medicine)}
              >
                <span className="posSmartSearchOptionName">{medicine.name_ar}</span>
                <span className="posSmartSearchOptionMeta mutedText">
                  {searchingOtherBranches && medicine.pharmacyId
                    ? `${getBranchLabel?.(medicine.pharmacyId) || medicine.pharmacyId} · `
                    : ""}
                  {medicine.barcode || "—"} · {isArabic ? "كم" : "qty"} {medicine.qty} ·{" "}
                  {medicine.price.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
