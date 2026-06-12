import { useMemo } from "react";
import { formatDateInput } from "../utils/date";
import {
  buildBranchInventoryAlertRows,
  filterExpiredMedicines,
  filterExpiringSoonMedicines,
  filterLowStockMedicines,
  getExpiringSoonDays,
  getExpiringSoonDaysForBranch,
  getExpiryLimitValue,
  getLowStockThreshold,
  getLowStockThresholdForBranch,
} from "../utils/inventoryAlerts";
import type { Medicine, PharmacySettings } from "../types";

type InventoryStatusFilter = "all" | "low" | "expired" | "expiring";

type AlertItem = {
  id: string;
  kind: "expired" | "low" | "expiring";
  name: string;
  detail: string;
};

type UseInventoryDerivedParams = {
  query: string;
  medicines: Medicine[];
  orgAlertMedicines: Medicine[];
  showOrgInventoryAlerts: boolean;
  inventoryStatusFilter: InventoryStatusFilter;
  pharmacySettings: PharmacySettings | null;
  branches: PharmacySettings[];
  isViewingAllBranches: boolean;
  isArabic: boolean;
  resolveBranchLabel: (branchId?: string) => string;
};

export function useInventoryDerived({
  query,
  medicines,
  orgAlertMedicines,
  showOrgInventoryAlerts,
  inventoryStatusFilter,
  pharmacySettings,
  branches,
  isViewingAllBranches,
  isArabic,
  resolveBranchLabel,
}: UseInventoryDerivedParams) {
  const lowStockThreshold = getLowStockThreshold(pharmacySettings);
  const expiringSoonDays = getExpiringSoonDays(pharmacySettings);
  const useBranchAwareInventoryAlerts = showOrgInventoryAlerts && orgAlertMedicines.length > 0;
  const alertMedicineSource = useBranchAwareInventoryAlerts ? orgAlertMedicines : medicines;

  const filteredMedicines = useMemo(() => {
    const value = query.trim().toLowerCase();
    const todayValue = formatDateInput(new Date());

    return medicines.filter((medicine) => {
      const matchesSearch =
        !value ||
        medicine.name_ar.toLowerCase().includes(value) ||
        medicine.name_en.toLowerCase().includes(value) ||
        medicine.barcode.includes(value);

      const expiry = medicine.expiry || "";
      const branchLowThreshold = isViewingAllBranches
        ? getLowStockThresholdForBranch(medicine.pharmacyId, branches, pharmacySettings)
        : lowStockThreshold;
      const expiringLimitValue = isViewingAllBranches
        ? getExpiryLimitValue(
            getExpiringSoonDaysForBranch(medicine.pharmacyId, branches, pharmacySettings),
          )
        : getExpiryLimitValue(expiringSoonDays);

      const matchesStatus =
        inventoryStatusFilter === "all" ||
        (inventoryStatusFilter === "low" && medicine.qty <= branchLowThreshold) ||
        (inventoryStatusFilter === "expired" && expiry && expiry < todayValue) ||
        (inventoryStatusFilter === "expiring" &&
          expiry &&
          expiry >= todayValue &&
          expiry <= expiringLimitValue);

      return matchesSearch && matchesStatus;
    });
  }, [
    query,
    medicines,
    inventoryStatusFilter,
    lowStockThreshold,
    expiringSoonDays,
    isViewingAllBranches,
    branches,
    pharmacySettings,
  ]);

  const todayValue = formatDateInput(new Date());

  const lowStockMedicines = useBranchAwareInventoryAlerts
    ? filterLowStockMedicines(alertMedicineSource, branches, pharmacySettings)
    : alertMedicineSource.filter((m) => m.qty <= lowStockThreshold);

  const expiredMedicines = filterExpiredMedicines(alertMedicineSource, todayValue);

  const expiringSoonMedicines = useBranchAwareInventoryAlerts
    ? filterExpiringSoonMedicines(alertMedicineSource, branches, pharmacySettings, todayValue)
    : alertMedicineSource.filter((m) => {
        const expiryLimitValue = getExpiryLimitValue(expiringSoonDays);
        return m.expiry && m.expiry >= todayValue && m.expiry <= expiryLimitValue;
      });

  const branchInventoryAlertRows = useMemo(
    () =>
      showOrgInventoryAlerts
        ? buildBranchInventoryAlertRows({
            medicines: alertMedicineSource,
            branches,
            fallbackSettings: pharmacySettings,
            isArabic,
          })
        : [],
    [showOrgInventoryAlerts, alertMedicineSource, branches, pharmacySettings, isArabic],
  );

  const lowStockCount = lowStockMedicines.length;
  const expiringCount = expiringSoonMedicines.length;
  const expiredCount = expiredMedicines.length;

  const medicineName = (m: Medicine) =>
    (isArabic ? m.name_ar : m.name_en) || m.name_ar || m.name_en;

  const branchLabelForAlert = (medicine: Medicine) =>
    useBranchAwareInventoryAlerts || isViewingAllBranches
      ? resolveBranchLabel(medicine.pharmacyId)
      : "";

  const alertItems: AlertItem[] = [
    ...expiredMedicines.slice(0, 6).map((m) => ({
      id: `expired-${m.id}`,
      kind: "expired" as const,
      name: medicineName(m),
      detail: [branchLabelForAlert(m), `${isArabic ? "انتهت في" : "Expired"}: ${m.expiry}`]
        .filter(Boolean)
        .join(" · "),
    })),
    ...lowStockMedicines.slice(0, 6).map((m) => ({
      id: `low-${m.id}`,
      kind: "low" as const,
      name: medicineName(m),
      detail: [
        branchLabelForAlert(m),
        `${isArabic ? "الكمية المتبقية" : "Remaining qty"}: ${m.qty}`,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...expiringSoonMedicines.slice(0, 6).map((m) => ({
      id: `expiring-${m.id}`,
      kind: "expiring" as const,
      name: medicineName(m),
      detail: [branchLabelForAlert(m), `${isArabic ? "تنتهي في" : "Expires"}: ${m.expiry}`]
        .filter(Boolean)
        .join(" · "),
    })),
  ];

  const alertTotal = lowStockCount + expiringCount + expiredCount;

  return {
    lowStockThreshold,
    expiringSoonDays,
    filteredMedicines,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    branchInventoryAlertRows,
    lowStockCount,
    expiringCount,
    expiredCount,
    alertItems,
    alertTotal,
    useBranchAwareInventoryAlerts,
  };
}
