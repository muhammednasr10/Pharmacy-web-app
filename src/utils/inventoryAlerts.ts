import { formatDateInput } from "./date";
import { getBranchLabel } from "./branchLabel";
import type { Medicine, PharmacySettings } from "../types";

export const DEFAULT_LOW_STOCK_THRESHOLD = 20;
export const DEFAULT_EXPIRING_SOON_DAYS = 30;

export function getLowStockThreshold(settings?: PharmacySettings | null) {
  const value = Number(settings?.lowStockThreshold);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_LOW_STOCK_THRESHOLD;
}

export function getExpiringSoonDays(settings?: PharmacySettings | null) {
  const value = Number(settings?.expiringSoonDays);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_EXPIRING_SOON_DAYS;
}

export function getExpiryLimitValue(days: number, fromDate = new Date()) {
  const limit = new Date(fromDate);
  limit.setDate(limit.getDate() + days);
  return formatDateInput(limit);
}

export function resolveBranchSettings(
  branchId: string | undefined,
  branches: PharmacySettings[],
  fallback?: PharmacySettings | null,
): PharmacySettings | null {
  if (branchId) {
    const found = branches.find((branch) => branch.id === branchId);
    if (found) return found;
  }
  return fallback ?? null;
}

export function getLowStockThresholdForBranch(
  branchId: string | undefined,
  branches: PharmacySettings[],
  fallback?: PharmacySettings | null,
) {
  return getLowStockThreshold(resolveBranchSettings(branchId, branches, fallback));
}

export function getExpiringSoonDaysForBranch(
  branchId: string | undefined,
  branches: PharmacySettings[],
  fallback?: PharmacySettings | null,
) {
  return getExpiringSoonDays(resolveBranchSettings(branchId, branches, fallback));
}

export function isLowStockMedicine(
  medicine: Medicine,
  branches: PharmacySettings[],
  fallback?: PharmacySettings | null,
) {
  return medicine.qty <= getLowStockThresholdForBranch(medicine.pharmacyId, branches, fallback);
}

export function isExpiringSoonMedicine(
  medicine: Medicine,
  branches: PharmacySettings[],
  fallback: PharmacySettings | null | undefined,
  todayValue: string,
) {
  const expiry = medicine.expiry || "";
  if (!expiry || expiry < todayValue) return false;
  const days = getExpiringSoonDaysForBranch(medicine.pharmacyId, branches, fallback);
  const limit = getExpiryLimitValue(days);
  return expiry <= limit;
}

export function isExpiredMedicine(medicine: Medicine, todayValue: string) {
  return Boolean(medicine.expiry && medicine.expiry < todayValue);
}

export function filterLowStockMedicines(
  medicines: Medicine[],
  branches: PharmacySettings[],
  fallback?: PharmacySettings | null,
) {
  return medicines.filter((medicine) => isLowStockMedicine(medicine, branches, fallback));
}

export function filterExpiringSoonMedicines(
  medicines: Medicine[],
  branches: PharmacySettings[],
  fallback: PharmacySettings | null | undefined,
  todayValue: string,
) {
  return medicines.filter((medicine) =>
    isExpiringSoonMedicine(medicine, branches, fallback, todayValue),
  );
}

export function filterExpiredMedicines(medicines: Medicine[], todayValue: string) {
  return medicines.filter((medicine) => isExpiredMedicine(medicine, todayValue));
}

export type BranchInventoryAlertRow = {
  branchId: string;
  branchLabel: string;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  expiredCount: number;
  totalAlertCount: number;
};

export function buildBranchInventoryAlertRows(params: {
  medicines: Medicine[];
  branches: PharmacySettings[];
  fallbackSettings?: PharmacySettings | null;
  isArabic: boolean;
}): BranchInventoryAlertRow[] {
  const todayValue = formatDateInput(new Date());
  const branchIds =
    params.branches.length > 0
      ? params.branches.map((branch) => branch.id)
      : [...new Set(params.medicines.map((medicine) => medicine.pharmacyId).filter(Boolean))];

  return branchIds
    .map((branchId) => {
      const branchMedicines = params.medicines.filter(
        (medicine) => medicine.pharmacyId === branchId,
      );
      const lowStockCount = branchMedicines.filter((medicine) =>
        isLowStockMedicine(medicine, params.branches, params.fallbackSettings),
      ).length;
      const outOfStockCount = branchMedicines.filter((medicine) => medicine.qty <= 0).length;
      const expiringCount = branchMedicines.filter((medicine) =>
        isExpiringSoonMedicine(medicine, params.branches, params.fallbackSettings, todayValue),
      ).length;
      const expiredCount = branchMedicines.filter((medicine) =>
        isExpiredMedicine(medicine, todayValue),
      ).length;

      return {
        branchId,
        branchLabel: getBranchLabel(branchId, params.branches, params.isArabic),
        lowStockCount,
        outOfStockCount,
        expiringCount,
        expiredCount,
        totalAlertCount: lowStockCount + expiringCount + expiredCount,
      };
    })
    .sort((a, b) => b.totalAlertCount - a.totalAlertCount || b.lowStockCount - a.lowStockCount);
}
