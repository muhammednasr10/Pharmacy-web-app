/** Sentinel expiry written by Victory / CSV catalog imports when no real date exists. */
export const CATALOG_PLACEHOLDER_EXPIRY = "2099-12-31";

export function isCatalogPlaceholderExpiry(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  return raw === CATALOG_PLACEHOLDER_EXPIRY || raw.startsWith("2099-12-31");
}

/** Real batch expiry for forms — placeholder dates become empty so the user must enter one. */
export function resolveEntryExpiry(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || isCatalogPlaceholderExpiry(raw)) return "";
  return raw.slice(0, 10);
}

export function formatExpiryDisplay(value: unknown, isArabic: boolean): string {
  const raw = String(value ?? "").trim();
  if (!raw || isCatalogPlaceholderExpiry(raw)) {
    return isArabic ? "غير محدد" : "Unspecified";
  }
  return raw.slice(0, 10);
}
