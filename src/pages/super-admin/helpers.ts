import type { PharmacySettings } from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";

export function getPharmacySubscriptionEndDateValue(pharmacy: PharmacySettings): Date | null {
  const raw = pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt;
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : `${raw}T23:59:59`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveNow(now?: Date | number | string | null) {
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now;
  // Guard against Array.filter/some passing the index as the 2nd argument.
  if (typeof now === "number") return new Date();
  if (typeof now === "string") {
    const parsed = new Date(now);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/** Subscription date passed without renewal. */
export function isPharmacySubscriptionExpired(pharmacy: PharmacySettings, now?: Date) {
  const end = getPharmacySubscriptionEndDateValue(pharmacy);
  if (!end) return false;
  return end.getTime() < resolveNow(now).getTime();
}

/**
 * Pharmacy can work only when status is active/trial, not manually suspended,
 * and the subscription end date has not passed.
 */
export function isPharmacyActive(pharmacy: PharmacySettings, now?: Date) {
  if (pharmacy.isActive === false) return false;
  if (isPharmacySubscriptionExpired(pharmacy, now)) return false;
  const status = pharmacy.subscriptionStatus || "active";
  return status === "active" || status === "trial";
}

export type PharmacySubscriptionDisplayStatus = "active" | "suspended" | "expired";

export function getPharmacySubscriptionDisplayStatus(
  pharmacy: PharmacySettings,
  now?: Date,
): PharmacySubscriptionDisplayStatus {
  const current = resolveNow(now);
  if (isPharmacySubscriptionExpired(pharmacy, current)) return "expired";
  if (pharmacy.isActive === false) return "suspended";
  const status = pharmacy.subscriptionStatus || "active";
  if (status === "suspended" || status === "expired" || status === "cancelled") {
    return status === "expired" ? "expired" : "suspended";
  }
  if (status === "active" || status === "trial") return "active";
  return "suspended";
}

export function getPharmacySubscriptionStatusLabel(
  pharmacy: PharmacySettings,
  isArabic: boolean,
  now?: Date,
) {
  const display = getPharmacySubscriptionDisplayStatus(pharmacy, now);
  if (display === "expired") {
    return isArabic ? "غير مفعّل" : "Inactive";
  }
  if (display === "suspended") {
    return isArabic ? "موقوف" : "Suspended";
  }
  return isArabic ? "مفعّل" : "Active";
}

export function getTierBadgeClass(tier: SubscriptionTier) {
  if (tier === "premium") return "saasTierBadge premium";
  if (tier === "professional") return "saasTierBadge professional";
  return "saasTierBadge basic";
}

export function makeBranchId(name: string, nameEn: string, existingIds: Iterable<string>) {
  const existing = new Set(existingIds);
  const base =
    (nameEn || name || "branch")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "branch";
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function formatUsageLabel(
  used: number,
  max: number,
  unitAr: string,
  unitEn: string,
  isArabic: boolean,
) {
  return isArabic ? `${unitAr} ${used} من ${max}` : `${used} ${unitEn} of ${max}`;
}

export function usagePercent(used: number, max: number) {
  if (!max) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export function formatPharmacyDate(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";

  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getPharmacyStartDate(pharmacy: PharmacySettings, isArabic: boolean) {
  return formatPharmacyDate(pharmacy.subscriptionStartedAt || pharmacy.createdAt, isArabic);
}

export function getPharmacyEndDate(pharmacy: PharmacySettings, isArabic: boolean) {
  return formatPharmacyDate(pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt, isArabic);
}
