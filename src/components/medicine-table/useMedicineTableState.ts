import { useEffect, useMemo, useState } from "react";
import type { Medicine } from "../../types";
import {
  LARGE_MEDICINE_CATALOG,
  MEDICINE_TABLE_PAGE_SIZE,
} from "../../constants/medicineCatalog";
import { formatDateInput } from "../../utils/date";
import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getExpiryLimitValue,
  getExpiringSoonDaysForBranch,
  getLowStockThresholdForBranch,
} from "../../utils/inventoryAlerts";
import { medicineMatchesInventorySearch } from "../../utils/medicineLookup";
import type { MedicineTableProps, StockFilter } from "./types";

type UseMedicineTableStateArgs = Pick<
  MedicineTableProps,
  | "medicines"
  | "showColumnFilters"
  | "showSplitNameColumns"
  | "showCostProfitColumns"
  | "showBranchColumn"
  | "lowStockThreshold"
  | "expiringSoonDays"
  | "branchAwareAlerts"
  | "branches"
  | "fallbackSettings"
  | "externalPagination"
>;

export function useMedicineTableState({
  medicines,
  showColumnFilters = false,
  showSplitNameColumns,
  showCostProfitColumns = false,
  showBranchColumn = false,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
  branchAwareAlerts = false,
  branches = [],
  fallbackSettings = null,
  externalPagination,
}: UseMedicineTableStateArgs) {
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
  const [page, setPage] = useState(0);

  const splitNameColumns = showSplitNameColumns ?? showColumnFilters;
  const tableColumnCount =
    (showBranchColumn ? 1 : 0) + (splitNameColumns ? 3 : 1) + 5 + (showCostProfitColumns ? 2 : 0);

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
    const barcodeQ = barcodeFilter.trim();
    const hasQuickFilters =
      nameQ ||
      barcodeQ ||
      stockFilter !== "all" ||
      qtyMin ||
      qtyMax ||
      expiryFrom ||
      expiryTo ||
      buyMin ||
      buyMax ||
      sellMin ||
      sellMax;

    if (!hasQuickFilters) {
      return medicines;
    }

    return medicines.filter((medicine) => {
      const matchesName = medicineMatchesInventorySearch(medicine, nameQ);

      const matchesBarcode = !barcodeQ || medicine.barcode.toLowerCase().includes(barcodeQ.toLowerCase());

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
      const matchesBuy =
        !showCostProfitColumns ||
        ((bMin === null || buy >= bMin) && (bMax === null || buy <= bMax));
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
    todayValue,
    defaultExpiringLimitValue,
    lowStockThreshold,
    expiringSoonDays,
    branchAwareAlerts,
    branches,
    showCostProfitColumns,
  ]);

  const hasActiveFilters =
    nameFilter ||
    barcodeFilter ||
    qtyMin ||
    qtyMax ||
    expiryFrom ||
    expiryTo ||
    stockFilter !== "all" ||
    (showCostProfitColumns && (buyMin || buyMax)) ||
    sellMin ||
    sellMax;

  const hasAdvancedFilters =
    qtyMin ||
    qtyMax ||
    expiryFrom ||
    expiryTo ||
    (showCostProfitColumns && (buyMin || buyMax)) ||
    sellMin ||
    sellMax;

  const isLargeCatalogBrowse =
    medicines.length > LARGE_MEDICINE_CATALOG && showColumnFilters && !hasActiveFilters;

  const isServerPaginated = Boolean(externalPagination);

  const totalPages = isServerPaginated
    ? Math.max(1, Math.ceil((externalPagination?.total || 0) / (externalPagination?.pageSize || 1)))
    : Math.max(1, Math.ceil(filteredMedicines.length / MEDICINE_TABLE_PAGE_SIZE));
  const safePage = isServerPaginated
    ? Math.min(externalPagination?.page || 0, totalPages - 1)
    : Math.min(page, totalPages - 1);

  const pageRows = useMemo(() => {
    if (isServerPaginated) return filteredMedicines;
    return filteredMedicines.slice(
      safePage * MEDICINE_TABLE_PAGE_SIZE,
      (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
    );
  }, [filteredMedicines, isServerPaginated, safePage]);

  useEffect(() => {
    setPage(0);
  }, [
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
    medicines.length,
  ]);

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

  return {
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
    page,
    setPage,
    clearFilters,
    filters: {
      nameFilter,
      setNameFilter,
      barcodeFilter,
      setBarcodeFilter,
      qtyMin,
      setQtyMin,
      qtyMax,
      setQtyMax,
      expiryFrom,
      setExpiryFrom,
      expiryTo,
      setExpiryTo,
      stockFilter,
      setStockFilter,
      buyMin,
      setBuyMin,
      buyMax,
      setBuyMax,
      sellMin,
      setSellMin,
      sellMax,
      setSellMax,
      showAdvancedFilters,
      setShowAdvancedFilters,
    },
  };
}
