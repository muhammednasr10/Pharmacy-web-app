/** Locale-aware money display (2 decimal places max). */
export function formatMoney(value: number, locale?: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(locale, { maximumFractionDigits: 2 });
}
