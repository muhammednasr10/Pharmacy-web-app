/** Parse opening/actual cash input: empty and non-numeric are invalid; 0 is valid. */
export function parseCashAmountInput(raw: string): {
  ok: boolean;
  value: number;
  reason: "empty" | "invalid" | "negative" | null;
} {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { ok: false, value: NaN, reason: "empty" };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, value: NaN, reason: "invalid" };
  }
  if (value < 0) {
    return { ok: false, value, reason: "negative" };
  }
  return { ok: true, value, reason: null };
}

export function cashAmountErrorMessage(
  reason: "empty" | "invalid" | "negative" | null,
  isArabic: boolean,
  kind: "opening" | "actual",
): string {
  if (reason === "empty") {
    return kind === "opening"
      ? isArabic
        ? "أدخل رصيد الافتتاح (الصفر مسموح)"
        : "Enter opening cash (zero is allowed)"
      : isArabic
        ? "أدخل النقد الفعلي بعد العد (الصفر مسموح)"
        : "Enter actual cash after counting (zero is allowed)";
  }
  if (reason === "invalid") {
    return isArabic ? "أدخل رقمًا صحيحًا" : "Enter a valid number";
  }
  if (reason === "negative") {
    return isArabic ? "القيمة السالبة غير مسموحة" : "Negative amounts are not allowed";
  }
  return "";
}
