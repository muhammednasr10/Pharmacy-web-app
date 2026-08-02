export function formatPosSaleError(error: unknown, isArabic: boolean): string {
  const message = error instanceof Error ? error.message : String(error || "");

  const knownMessages: Record<string, { ar: string; en: string }> = {
    cashier_shift_invalid: {
      ar: "الوردية غير صالحة أو مغلقة. افتح وردية جديدة من نقطة البيع.",
      en: "Cashier shift is invalid or closed. Open a new shift from POS.",
    },
    insufficient_stock: {
      ar: "الكمية في المخزن غير كافية لإتمام البيع.",
      en: "Not enough stock in inventory to complete this sale.",
    },
    medicine_not_found: {
      ar: "أحد الأدوية في السلة غير موجود في مخزن هذا الفرع.",
      en: "An item in the cart was not found in this branch warehouse.",
    },
    not_authorized: {
      ar: "ليس لديك صلاحية إتمام البيع. تحقق من تسجيل الدخول أو الاشتراك.",
      en: "You are not authorized to complete this sale.",
    },
    pharmacy_required: {
      ar: "لم يتم تحديد الفرع/المخزن. اختر فرعاً محدداً ثم أعد المحاولة.",
      en: "Branch/warehouse is not selected. Choose a branch and try again.",
    },
    empty_cart: {
      ar: "السلة فارغة.",
      en: "Cart is empty.",
    },
  };

  for (const [code, copy] of Object.entries(knownMessages)) {
    if (message.includes(code)) {
      return isArabic ? copy.ar : copy.en;
    }
  }

  if (message.startsWith("Not enough stock:")) {
    const itemName = message.split(":").slice(1).join(":").trim();
    return isArabic
      ? `كمية غير كافية${itemName ? `: ${itemName}` : ""}`
      : message;
  }

  if (message === "Medicine not found") {
    return isArabic
      ? "أحد الأدوية في السلة غير موجود في مخزن هذا الفرع."
      : "An item in the cart was not found in this branch warehouse.";
  }

  return (
    message ||
    (isArabic ? "حصل خطأ أثناء تسجيل البيع" : "An error occurred while completing the sale")
  );
}
