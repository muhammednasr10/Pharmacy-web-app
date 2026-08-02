import type { PharmacySettings } from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";

export function isPharmacyActive(pharmacy: PharmacySettings) {
  const status = pharmacy.subscriptionStatus || "active";
  return (status === "active" || status === "trial") && pharmacy.isActive !== false;
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
