import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type {
  AppUser,
  CartItem,
  CashierShift,
  HeldInvoice,
  Invoice,
  InvoiceItem,
  Medicine,
  PaymentMethod,
} from "../types";
import {
  applyOptimisticStockDeduction,
  cacheMedicinesSnapshot,
  countPendingOfflineSales,
  queueOfflineSale,
} from "../utils/offlinePosStorage";
import { getHeldInvoiceErrorMessage } from "../utils/heldInvoiceErrors";
import { formatPosSaleError } from "../utils/posSaleErrors";
import { isPharmacyManager, isSuperAdmin } from "../utils/roles";

function requiresOpenCashierShift(appUser: AppUser | null) {
  if (!appUser) return false;
  return appUser.role === "cashier" || isPharmacyManager(appUser) || isSuperAdmin(appUser);
}

export type PosActionFeedback = {
  text: string;
  error?: boolean;
};

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type UsePosSalesOptions = {
  isArabic: boolean;
  t: Record<string, string>;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  medicines: Medicine[];
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  pharmacySettings: {
    name?: string;
    name_en?: string;
    invoiceFooter?: string;
    phone?: string;
    address?: string;
  } | null;
  activeCashierShift: CashierShift | null;
  currentWorkShiftId: string;
  cart: CartItem[];
  discount: number;
  subtotal: number;
  safeDiscount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setDiscount: Dispatch<SetStateAction<number>>;
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod>>;
  setCustomerName: Dispatch<SetStateAction<string>>;
  resetCart: () => void;
  getPharmacyId: () => string;
  getPaymentLabel: (method: string) => string;
  canUseSystemActions: () => boolean;
  canUsePOS: () => boolean;
  showSubscriptionExpiredAlert: () => void;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
  refreshMedicinesFromDb: () => Promise<void>;
  refreshActiveCashierShift: () => Promise<CashierShift | null | undefined>;
  setOfflineMedicinesCacheAt: Dispatch<SetStateAction<string | null>>;
  setPendingOfflineSalesCount: Dispatch<SetStateAction<number>>;
};

export function usePosSales({
  isArabic,
  t,
  appUser,
  user,
  medicines,
  setMedicines,
  pharmacySettings,
  activeCashierShift,
  currentWorkShiftId,
  cart,
  discount,
  subtotal,
  safeDiscount,
  total,
  paymentMethod,
  customerName,
  setCart,
  setDiscount,
  setPaymentMethod,
  setCustomerName,
  resetCart,
  getPharmacyId,
  getPaymentLabel,
  canUseSystemActions,
  canUsePOS,
  showSubscriptionExpiredAlert,
  addActivityLog,
  refreshMedicinesFromDb,
  refreshActiveCashierShift,
  setOfflineMedicinesCacheAt,
  setPendingOfflineSalesCount,
}: UsePosSalesOptions) {
  const [isSelling, setIsSelling] = useState(false);
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
  const [showHeldInvoicesModal, setShowHeldInvoicesModal] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isHeldInvoiceProcessing, setIsHeldInvoiceProcessing] = useState(false);

  const printSavedInvoice = useCallback(
    async (invoice: Invoice) => {
      const { printSaleInvoice } = await import("../utils/saleInvoicePdf");
      printSaleInvoice({
        invoice,
        isArabic,
        currency: t.currency,
        pharmacySettings,
        getPaymentLabel,
      });
    },
    [getPaymentLabel, isArabic, pharmacySettings, t.currency],
  );

  const refreshHeldInvoices = useCallback(async () => {
    try {
      const rows = await pharmacyService.getHeldInvoices(getPharmacyId());
      setHeldInvoices(rows);
      return rows;
    } catch (error) {
      console.error("Refresh held invoices error:", error);
      throw error;
    }
  }, [getPharmacyId]);

  const completeSale = useCallback(async () => {
    if (!canUseSystemActions()) {
      showSubscriptionExpiredAlert();
      return;
    }
    if (!canUsePOS()) {
      alert(isArabic ? "ليس لديك صلاحية للبيع" : "You do not have permission to sell");
      return;
    }

    if (cart.length === 0) {
      alert(t.emptyCart);
      return;
    }

    if (discount > subtotal) {
      alert(
        isArabic
          ? "الخصم لا يمكن أن يكون أكبر من إجمالي السلة"
          : "Discount cannot be greater than subtotal",
      );
      return;
    }

    if (paymentMethod === "credit" && !customerName.trim()) {
      alert(
        isArabic
          ? "من فضلك أدخل اسم العميل في حالة البيع الآجل"
          : "Please enter customer name for credit sale",
      );
      return;
    }

    if (!navigator.onLine && paymentMethod === "credit") {
      alert(
        isArabic
          ? "البيع الآجل غير متاح بدون اتصال بالإنترنت"
          : "Credit sales are not available while offline",
      );
      return;
    }

    if (isSelling) return;

    const shiftRequired = requiresOpenCashierShift(appUser);
    let shiftForSale = activeCashierShift;

    if (shiftRequired) {
      shiftForSale = (await refreshActiveCashierShift()) ?? null;
      if (!shiftForSale) {
        alert(
          isArabic
            ? "يجب فتح وردية كاشير قبل إتمام البيع."
            : "Open a cashier shift before completing the sale.",
        );
        return;
      }
    } else if (
      appUser?.role === "cashier" &&
      !shiftForSale &&
      !window.confirm(
        isArabic
          ? "لم تفتح وردية كاشير. هل تريد إتمام البيع بدون وردية؟"
          : "No cashier shift is open. Complete sale without a shift?",
      )
    ) {
      return;
    }

    try {
      setIsSelling(true);

      const invoiceId = Date.now();
      const invoiceNumber = `INV-${invoiceId}`;
      const cashierId = appUser?.uid || user?.uid || "";

      const invoiceItems: InvoiceItem[] = cart.map((item) => {
        const buyPrice = item.buyPrice || 0;
        const unitPrice = item.price || 0;
        const lineTotal = unitPrice * item.cartQty;
        const costTotal = buyPrice * item.cartQty;

        return {
          invoiceId,
          medicineId: item.id,
          name_ar: item.name_ar,
          name_en: item.name_en,
          barcode: item.barcode,
          quantity: item.cartQty,
          buyPrice,
          unitPrice,
          lineTotal,
          costTotal,
          profit: lineTotal - costTotal,
        };
      });

      const totalCost = invoiceItems.reduce((sum, item) => sum + item.costTotal, 0);
      const totalProfit = total - totalCost;
      const invoice = {
        id: invoiceId,
        invoiceNumber,
        pharmacyId: getPharmacyId(),
        cashierId,
        cashierName: appUser?.name || "",
        shiftId: currentWorkShiftId || undefined,
        cashierShiftId: shiftForSale?.id,
        customerName: customerName.trim(),
        date: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        items: invoiceItems,
        subtotal,
        discount: safeDiscount,
        total,
        totalCost,
        totalProfit,
        paymentMethod,
      };

      const stockMovements = cart.map((item) => ({
        id: Date.now() + item.id,
        type: "sale",
        medicineId: item.id,
        medicineName_ar: item.name_ar,
        medicineName_en: item.name_en,
        barcode: item.barcode,
        quantityChange: -item.cartQty,
        qtyBefore: item.qty,
        qtyAfter: item.qty - item.cartQty,
        invoiceNumber,
        pharmacyId: getPharmacyId(),
        userId: cashierId,
        userName: appUser?.name || "",
        createdAt: new Date().toISOString(),
      }));

      if (!navigator.onLine) {
        const shortItem = cart.find((item) => item.cartQty > item.qty);
        if (shortItem) {
          alert(
            isArabic
              ? `الكمية غير كافية في النسخة المحلية: ${shortItem.name_ar || shortItem.name_en}`
              : `Insufficient cached stock: ${shortItem.name_en || shortItem.name_ar}`,
          );
          return;
        }

        const pharmacyId = getPharmacyId();
        await queueOfflineSale({
          pharmacyId,
          cart: cart.map((item) => ({ ...item })),
          invoice: invoice as Invoice,
        });

        const updatedMedicines = applyOptimisticStockDeduction(medicines, cart);
        setMedicines(updatedMedicines);
        await cacheMedicinesSnapshot(pharmacyId, updatedMedicines);
        setOfflineMedicinesCacheAt(new Date().toISOString());
        setPendingOfflineSalesCount(await countPendingOfflineSales(pharmacyId));

        printSavedInvoice(invoice as Invoice);
        resetCart();

        alert(
          isArabic
            ? `تم حفظ البيع محلياً (${invoiceNumber}). سيتم رفعه تلقائياً عند عودة الاتصال.`
            : `Sale saved locally (${invoiceNumber}). It will upload automatically when you are back online.`,
        );
        return;
      }

      await pharmacyService.completeSaleWithStockDeduction(
        cart,
        invoice as Invoice,
        stockMovements,
      );
      await refreshMedicinesFromDb();
      if (shiftForSale) {
        await refreshActiveCashierShift();
      }
      if (cashierId) {
        void pharmacyService
          .syncCashierPayrollCommissionAfterSale({
            cashierUserId: cashierId,
            cashierName: appUser?.name || "",
            pharmacyId: getPharmacyId(),
          })
          .catch((commissionError) => {
            console.warn("Cashier commission sync skipped:", commissionError);
          });
      }

      const savedInvoice = invoice as Invoice;
      resetCart();
      alert(isArabic ? `تم تسجيل البيع برقم ${invoiceNumber}` : `Sale ${invoiceNumber} completed`);

      try {
        await addActivityLog({
          type: "sale",
          title: isArabic ? "تسجيل بيع" : "Sale Created",
          description: isArabic
            ? `تم تسجيل فاتورة بيع رقم ${invoiceNumber} بإجمالي ${total.toFixed(2)} ${t.currency}`
            : `Sale invoice ${invoiceNumber} created with total ${total.toFixed(2)} ${t.currency}`,
          referenceType: "invoice",
          referenceId: invoiceNumber,
        });
      } catch (logError) {
        console.warn("Sale activity log skipped:", logError);
      }

      try {
        await printSavedInvoice(savedInvoice);
      } catch (printError) {
        console.warn("Sale invoice PDF skipped:", printError);
      }
    } catch (error) {
      console.error("Complete sale error:", error);

      alert(formatPosSaleError(error, isArabic));
    } finally {
      setIsSelling(false);
    }
  }, [
    activeCashierShift,
    addActivityLog,
    appUser,
    canUsePOS,
    canUseSystemActions,
    cart,
    customerName,
    currentWorkShiftId,
    discount,
    getPharmacyId,
    isArabic,
    isSelling,
    medicines,
    paymentMethod,
    printSavedInvoice,
    refreshActiveCashierShift,
    refreshMedicinesFromDb,
    resetCart,
    safeDiscount,
    setMedicines,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
    showSubscriptionExpiredAlert,
    subtotal,
    t.currency,
    t.emptyCart,
    total,
    user,
  ]);

  const openHeldInvoicesModal = useCallback(async () => {
    setShowHeldInvoicesModal(true);
    try {
      await refreshHeldInvoices();
    } catch (error) {
      console.error("Open held invoices modal refresh error:", error);
    }
  }, [refreshHeldInvoices]);

  const handleHoldInvoice = useCallback(async (): Promise<PosActionFeedback | void> => {
    if (!canUseSystemActions()) {
      showSubscriptionExpiredAlert();
      return;
    }
    if (!canUsePOS()) {
      return {
        text: isArabic ? "ليس لديك صلاحية للبيع" : "You do not have permission to sell",
        error: true,
      };
    }
    if (!navigator.onLine) {
      return {
        text: isArabic
          ? "تعليق الفاتورة يتطلب اتصالاً بالإنترنت"
          : "Holding invoices requires an internet connection",
        error: true,
      };
    }
    if (cart.length === 0 || isHolding) return;

    try {
      setIsHolding(true);
      const holdNumber = `HOLD-${Date.now()}`;
      const held = await pharmacyService.holdInvoice({
        holdNumber,
        customerName: customerName.trim(),
        cartItems: cart,
        subtotal,
        discount: safeDiscount,
        total,
        paymentMethod,
        createdBy: user?.uid,
        createdByName: appUser?.name,
      });

      await addActivityLog({
        type: "hold_invoice",
        title: isArabic ? "تعليق فاتورة" : "Hold Invoice",
        description: isArabic
          ? `تم تعليق فاتورة مؤقتة بإجمالي ${total.toFixed(2)} ${t.currency}`
          : `Held temporary invoice with total ${total.toFixed(2)} ${t.currency}`,
        referenceType: "held_invoice",
        referenceId: held.id,
      });

      resetCart();
      setHeldInvoices((prev) => [held, ...prev.filter((item) => item.id !== held.id)]);
      try {
        await refreshHeldInvoices();
      } catch (refreshError) {
        console.error("Held invoices refresh after hold:", refreshError);
      }
      return {
        text: isArabic ? "تم تعليق الفاتورة بنجاح" : "Invoice held successfully",
      };
    } catch (error) {
      console.error("Hold invoice error:", error);
      return {
        text: getHeldInvoiceErrorMessage(error, isArabic),
        error: true,
      };
    } finally {
      setIsHolding(false);
    }
  }, [
    addActivityLog,
    appUser?.name,
    canUsePOS,
    canUseSystemActions,
    cart,
    customerName,
    isArabic,
    isHolding,
    paymentMethod,
    refreshHeldInvoices,
    resetCart,
    safeDiscount,
    showSubscriptionExpiredAlert,
    subtotal,
    t.currency,
    total,
    user?.uid,
  ]);

  const handleResumeHeldInvoice = useCallback(
    async (held: HeldInvoice) => {
      if (!canUsePOS()) {
        alert(isArabic ? "ليس لديك صلاحية للبيع" : "You do not have permission to sell");
        return;
      }
      if (isHeldInvoiceProcessing) return;

      if (cart.length > 0) {
        const confirmReplace = window.confirm(
          isArabic
            ? "السلة الحالية تحتوي على أصناف. هل تريد استبدالها بالفاتورة المعلقة؟"
            : "Current cart has items. Replace with held invoice?",
        );
        if (!confirmReplace) return;
      }

      try {
        setIsHeldInvoiceProcessing(true);
        const resumed = await pharmacyService.resumeHeldInvoice(held.id, held);

        const restoredCart = (resumed.cartItems || []).map((item) => {
          const medicineId = item.id ?? (item as { medicineId?: number }).medicineId;
          const cartQty = item.cartQty ?? (item as { quantity?: number }).quantity ?? 1;
          const currentMedicine = medicines.find(
            (medicine) => medicine.id === medicineId || medicine.id === Number(medicineId),
          );
          if (currentMedicine) {
            return { ...currentMedicine, cartQty: Number(cartQty) };
          }
          return { ...item, id: Number(medicineId), cartQty: Number(cartQty) };
        });

        setCart(restoredCart);
        setDiscount(Number(resumed.discount) || 0);
        setPaymentMethod(resumed.paymentMethod || "cash");
        setCustomerName(resumed.customerName || "");
        setHeldInvoices((prev) => prev.filter((row) => row.id !== resumed.id));
        setShowHeldInvoicesModal(false);

        await addActivityLog({
          type: "resume_held_invoice",
          title: isArabic ? "استرجاع فاتورة معلقة" : "Resume Held Invoice",
          description: isArabic
            ? `تم استرجاع الفاتورة المعلقة ${resumed.holdNumber} بإجمالي ${(resumed.total || 0).toFixed(2)} ${t.currency}`
            : `Resumed held invoice ${resumed.holdNumber} with total ${(resumed.total || 0).toFixed(2)} ${t.currency}`,
          referenceType: "held_invoice",
          referenceId: resumed.id,
        });
      } catch (error) {
        console.error("Resume held invoice error:", error);
        alert(getHeldInvoiceErrorMessage(error, isArabic));
      } finally {
        setIsHeldInvoiceProcessing(false);
      }
    },
    [
      addActivityLog,
      canUsePOS,
      cart.length,
      isArabic,
      isHeldInvoiceProcessing,
      medicines,
      setCart,
      setCustomerName,
      setDiscount,
      setPaymentMethod,
      t.currency,
    ],
  );

  const handleDeleteHeldInvoice = useCallback(
    async (held: HeldInvoice) => {
      if (isHeldInvoiceProcessing) return;

      const confirmDelete = window.confirm(
        isArabic
          ? `هل أنت متأكد من حذف الفاتورة المعلقة ${held.holdNumber}؟`
          : `Delete held invoice ${held.holdNumber}?`,
      );
      if (!confirmDelete) return;

      try {
        setIsHeldInvoiceProcessing(true);
        const invoiceId = String(held.id || "").trim();
        if (!invoiceId) {
          throw new Error("held_invoice_id_missing");
        }

        await pharmacyService.deleteHeldInvoice(invoiceId);
        setHeldInvoices((prev) => prev.filter((row) => row.id !== invoiceId));

        await addActivityLog({
          type: "delete_held_invoice",
          title: isArabic ? "حذف فاتورة معلقة" : "Delete Held Invoice",
          description: isArabic
            ? `تم حذف الفاتورة المعلقة ${held.holdNumber}`
            : `Deleted held invoice ${held.holdNumber}`,
          referenceType: "held_invoice",
          referenceId: invoiceId,
        });

        try {
          await refreshHeldInvoices();
        } catch (refreshError) {
          console.error("Held invoices refresh after delete:", refreshError);
        }

        alert(isArabic ? "تم حذف الفاتورة المعلقة" : "Held invoice deleted");
      } catch (error) {
        console.error("Delete held invoice error:", error);
        alert(getHeldInvoiceErrorMessage(error, isArabic));
      } finally {
        setIsHeldInvoiceProcessing(false);
      }
    },
    [addActivityLog, isArabic, isHeldInvoiceProcessing, refreshHeldInvoices],
  );

  return {
    isSelling,
    heldInvoices,
    setHeldInvoices,
    showHeldInvoicesModal,
    setShowHeldInvoicesModal,
    isHolding,
    isHeldInvoiceProcessing,
    printSavedInvoice,
    completeSale,
    refreshHeldInvoices,
    openHeldInvoicesModal,
    handleHoldInvoice,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
  };
}
