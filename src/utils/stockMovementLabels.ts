const MOVEMENT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  sale: { ar: "بيع", en: "Sale" },
  return: { ar: "مرتجع", en: "Return" },
  sale_return: { ar: "مرتجع", en: "Sale return" },
  instant_sale_return: { ar: "مرتجع فوري", en: "Instant return" },
  purchase: { ar: "توريد", en: "Purchase" },
  purchase_delete: { ar: "حذف توريد", en: "Purchase deleted" },
  medicine_create: { ar: "إضافة دواء", en: "Medicine create" },
  medicine_update: { ar: "تعديل دواء", en: "Medicine update" },
  medicine_delete: { ar: "حذف دواء", en: "Medicine delete" },
  return_delete: { ar: "حذف مرتجع", en: "Return deleted" },
  branch_transfer_out: { ar: "نقل صادر", en: "Branch transfer out" },
  branch_transfer_in: { ar: "نقل وارد", en: "Branch transfer in" },
  stock_count: { ar: "جرد مخزون", en: "Stock count" },
  wastage: { ar: "هالك", en: "Wastage" },
  shrinkage: { ar: "هالك", en: "Wastage" },
  adjustment: { ar: "تسوية", en: "Adjustment" },
};

export function getMovementTypeLabel(type: string, isArabic: boolean) {
  const entry = MOVEMENT_TYPE_LABELS[type];
  if (entry) return isArabic ? entry.ar : entry.en;
  return type;
}
