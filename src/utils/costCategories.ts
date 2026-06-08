export const COST_CATEGORIES = [
  { value: "rent", ar: "إيجار", en: "Rent" },
  { value: "utilities", ar: "مرافق", en: "Utilities" },
  { value: "salaries", ar: "رواتب", en: "Salaries" },
  { value: "maintenance", ar: "صيانة", en: "Maintenance" },
  { value: "marketing", ar: "تسويق", en: "Marketing" },
  { value: "supplies", ar: "مستلزمات", en: "Supplies" },
  { value: "other", ar: "أخرى", en: "Other" },
] as const;

export function getCostCategoryLabel(value: string, isArabic: boolean) {
  const entry = COST_CATEGORIES.find((item) => item.value === value);
  if (!entry) return value || "-";
  return isArabic ? entry.ar : entry.en;
}
