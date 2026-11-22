/** App display timezone for invoices, movements, shifts, and reports. */
export const APP_TIME_ZONE = "Africa/Cairo";

/** Local calendar date (YYYY-MM-DD). Avoids UTC day-shift from toISOString(). */
export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local start/end of a YYYY-MM-DD day as ISO strings (for range queries). */
export function localDayBoundsToIso(dateYmd: string): { fromIso: string; toIso: string } {
  const from = new Date(`${dateYmd}T00:00:00`);
  const to = new Date(`${dateYmd}T23:59:59.999`);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

function parseDateValue(value: string | Date | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date;
  // Stored invoice.date sometimes uses locale strings — last resort parse
  const normalized = raw.replace(/\//g, "-");
  const retry = new Date(normalized);
  return Number.isNaN(retry.getTime()) ? null : retry;
}

/** Format date+time for UI using Africa/Cairo and language locale. */
export function formatAppDateTime(
  value: string | Date | number | null | undefined,
  isArabic: boolean,
  options?: { dateStyle?: "short" | "medium"; timeStyle?: "short" | "medium" },
): string {
  const date = parseDateValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-GB", {
    timeZone: APP_TIME_ZONE,
    dateStyle: options?.dateStyle ?? "short",
    timeStyle: options?.timeStyle ?? "short",
  }).format(date);
}

/** Format date only (no time) in Africa/Cairo. */
export function formatAppDate(
  value: string | Date | number | null | undefined,
  isArabic: boolean,
): string {
  const date = parseDateValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-GB", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "short",
  }).format(date);
}

/** Current local wall time string suitable for invoice.date storage (Cairo). */
export function formatAppNowForStorage(isArabic = false): string {
  return formatAppDateTime(new Date(), isArabic, { dateStyle: "medium", timeStyle: "medium" });
}
