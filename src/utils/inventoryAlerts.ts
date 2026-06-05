import { formatDateInput } from "./date";
import type { PharmacySettings } from "../types";

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
