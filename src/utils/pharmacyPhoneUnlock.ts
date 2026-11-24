/** Digits-only phone for unlock comparisons (ignores spaces, +, dashes). */
export function normalizePharmacyPhone(phone: string | null | undefined): string {
  return String(phone || "").replace(/\D/g, "");
}

export function phonesMatchForUnlock(
  entered: string | null | undefined,
  pharmacyPhone: string | null | undefined,
): boolean {
  const a = normalizePharmacyPhone(entered);
  const b = normalizePharmacyPhone(pharmacyPhone);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}
