import { useEffect, useMemo, useRef, useState } from "react";
import type { Medicine, PharmacySettings } from "../types";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import {
  medicineMatchesInventorySearch,
  sortMedicinesBySearchRelevance,
} from "../utils/medicineLookup";
import { readRecentBarcodes } from "../utils/offlineRecentMedicines";
import type { PosSearchScope } from "./PosManualSalePanel";
import { playBarcodeBeep } from "../utils/barcodeBeep";
import * as pharmacyService from "../services/pharmacyService";

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
  userName?: string;
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
  userName,
  onAddToCart,
}: PosSmartSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [requestBusyId, setRequestBusyId] = useState<number | null>(null);
  const [requestFlashId, setRequestFlashId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveSearchScope: PosSearchScope =
    searchScope === pharmacyId ? "current" : searchScope;
  const searchingOtherBranches = effectiveSearchScope !== "current";

  const searchPharmacyIds = useMemo(() => {
    const branchOptions = branches.filter((branch) => Boolean(branch.id));
    if (effectiveSearchScope === "current") return [pharmacyId];
    if (effectiveSearchScope === "all") {
      const ids = branchOptions.map((branch) => branch.id).filter(Boolean);
      return [...new Set(ids.length > 0 ? [pharmacyId, ...ids] : [pharmacyId])];
    }
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

  const recentBarcodes = useMemo(() => readRecentBarcodes(pharmacyId), [pharmacyId, inventoryRefreshKey]);

  const offlineRows = useMemo(() => {
    if (!debouncedSearch || isOnline) return [];
    const pool = searchingOtherBranches
      ? medicines
      : medicines.filter((medicine) => (medicine.pharmacyId || pharmacyId) === pharmacyId);
    // Include zero-qty hits so cashiers can flag restock requests.
    return sortMedicinesBySearchRelevance(
      pool.filter((medicine) => medicineMatchesInventorySearch(medicine, debouncedSearch)),
      debouncedSearch,
      recentBarcodes,
    ).slice(0, 12);
  }, [debouncedSearch, isOnline, medicines, pharmacyId, recentBarcodes, searchingOtherBranches]);

  const results = useMemo(() => {
    const list = isOnline ? rows : offlineRows;
    return sortMedicinesBySearchRelevance(list, debouncedSearch, recentBarcodes).slice(0, 12);
  }, [debouncedSearch, isOnline, offlineRows, recentBarcodes, rows]);
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
      window.alert(
        isArabic
          ? "الكمية صفر — اضغط أيقونة التوريد 🛒 لإضافته لطلبات الشراء"
          : "Out of stock — tap the 🛒 restock icon to add a purchase request",
      );
      return;
    }
    onAddToCart(medicine);
    setSearch("");
    setDebouncedSearch("");
    playBarcodeBeep(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function requestPurchase(medicine: Medicine) {
    if (requestBusyId != null) return;
    setRequestBusyId(medicine.id);
    try {
      await pharmacyService.addMedicineToPurchaseRequests({
        pharmacyId,
        medicine,
        createdByName: userName,
        lowStockThreshold,
        note: isArabic ? "طلب من نقطة البيع — الزبون سأل عنه" : "POS request — customer asked",
      });
      setRequestFlashId(medicine.id);
      window.setTimeout(() => setRequestFlashId((current) => (current === medicine.id ? null : current)), 1600);
      playBarcodeBeep(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
      playBarcodeBeep(false);
    } finally {
      setRequestBusyId(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
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
            const sameBranch = (medicine.pharmacyId || pharmacyId) === pharmacyId;
            const sellable = sameBranch && medicine.qty > 0;
            const canRequest = sameBranch && medicine.qty <= 0;
            return (
              <div
                key={`${medicine.pharmacyId || pharmacyId}-${medicine.id}`}
                className={`posSmartSearchOptionRow${sellable ? "" : " is-readonly"}`}
                role="option"
              >
                <button
                  type="button"
                  className="posSmartSearchOption"
                  onClick={() => pickMedicine(medicine)}
                >
                  <span className="posSmartSearchOptionName">{medicine.name_ar}</span>
                  <span className="posSmartSearchOptionMeta mutedText">
                    {searchingOtherBranches && medicine.pharmacyId
                      ? `${getBranchLabel?.(medicine.pharmacyId) || medicine.pharmacyId} · `
                      : ""}
                    {medicine.barcode || "—"} · {isArabic ? "كم" : "qty"} {medicine.qty} ·{" "}
                    {medicine.price.toFixed(2)}
                    {canRequest
                      ? isArabic
                        ? " · ناقص"
                        : " · out of stock"
                      : ""}
                  </span>
                </button>
                {canRequest ? (
                  <button
                    type="button"
                    className={`posPurchaseRequestBtn${
                      requestFlashId === medicine.id ? " is-done" : ""
                    }`}
                    disabled={requestBusyId === medicine.id}
                    title={
                      isArabic
                        ? "أضف لطلبات الشراء / التوريد"
                        : "Add to purchase / restock requests"
                    }
                    aria-label={
                      isArabic
                        ? `طلب توريد ${medicine.name_ar}`
                        : `Request restock for ${medicine.name_en || medicine.name_ar}`
                    }
                    onClick={() => void requestPurchase(medicine)}
                  >
                    {requestFlashId === medicine.id ? "✓" : "🛒"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
