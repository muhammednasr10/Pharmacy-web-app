export function getMovementTypeLabel(type: string, isArabic: boolean) {
  if (type === "sale") return isArabic ? "بيع" : "Sale";
  if (type === "return") return isArabic ? "مرتجع" : "Return";
  if (type === "purchase") return isArabic ? "توريد" : "Purchase";
  if (type === "medicine_create") return isArabic ? "إضافة دواء" : "Medicine Create";
  if (type === "medicine_update") return isArabic ? "تعديل دواء" : "Medicine Update";
  if (type === "medicine_delete") return isArabic ? "حذف دواء" : "Medicine Delete";
  if (type === "branch_transfer_out") return isArabic ? "نقل صادر" : "Branch Transfer Out";
  if (type === "branch_transfer_in") return isArabic ? "نقل وارد" : "Branch Transfer In";
  if (type === "stock_count") return isArabic ? "جرد مخزون" : "Stock Count";
  return type;
}
