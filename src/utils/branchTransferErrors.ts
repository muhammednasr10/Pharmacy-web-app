export function formatBranchTransferActionError(message: string, isArabic: boolean): string {
  const map: Record<string, [string, string]> = {
    transfer_not_found: ["طلب النقل غير موجود", "Transfer request not found"],
    not_pending: ["هذا الطلب ليس بانتظار الاعتماد", "This request is not pending approval"],
    medicine_not_found: ["الدواء غير موجود في الفرع المصدر", "Medicine not found in source branch"],
    insufficient_stock: [
      "الكمية غير متوفرة في الفرع المصدر",
      "Insufficient stock in source branch",
    ],
    target_medicine_missing: [
      "تعذر إنشاء الدواء في الفرع الهدف",
      "Could not create medicine in target branch",
    ],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  return message;
}
