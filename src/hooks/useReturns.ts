import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  lookupInventoryMedicineForReturn,
} from "../services/pharmacy/inventoryPaginationService";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, Invoice, ReturnRecord, StockMovement } from "../types";
import {
  findMedicineForReturnItem,
  getAvailableReturnQty as calcAvailableReturnQty,
  getRefundMethodLabel as formatRefundMethodLabel,
  getReturnItemsSummary as formatReturnItemsSummary,
  getReturnTypeLabel as formatReturnTypeLabel,
  getReturnedQtyForInvoice as calcReturnedQtyForInvoice,
  normalizeMedicineIdKey,
  sameMedicineId,
} from "../utils/returnHelpers";

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type InstantReturnResult = {
  returnTotal: number;
  refundMethod: "cash" | "deduct_from_cart";
  returnNumber: string;
  invoiceNumber: string;
};

type UseReturnsOptions = {
  isArabic: boolean;
  t: Record<string, string>;
  returns: ReturnRecord[];
  setReturns: Dispatch<SetStateAction<ReturnRecord[]>>;
  invoices: Invoice[];
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  discount: number;
  setDiscount: Dispatch<SetStateAction<number>>;
  getPharmacyId: () => string;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
  canUseSystemActions: () => boolean;
  canUseReturns: () => boolean;
  canDeleteReturn: () => boolean;
  showSubscriptionExpiredAlert: () => void;
  refreshMedicinesFromDb: () => Promise<void>;
  setStockMovements: Dispatch<SetStateAction<StockMovement[]>>;
  onViewInvoice: (invoice: Invoice) => void;
};

export function useReturns({
  isArabic,
  t,
  returns,
  setReturns,
  invoices,
  appUser,
  user,
  discount,
  setDiscount,
  getPharmacyId,
  addActivityLog,
  canUseSystemActions,
  canUseReturns,
  canDeleteReturn,
  showSubscriptionExpiredAlert,
  refreshMedicinesFromDb,
  setStockMovements,
  onViewInvoice,
}: UseReturnsOptions) {
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isReturning, setIsReturning] = useState(false);
  const [deletingReturnId, setDeletingReturnId] = useState<number | string | null>(null);
  const [showInstantReturnModal, setShowInstantReturnModal] = useState(false);

  const getReturnedQtyForInvoice = useCallback(
    (invoiceNumber: string, medicineId: number | string) =>
      calcReturnedQtyForInvoice(returns, invoiceNumber, medicineId),
    [returns],
  );

  const getAvailableReturnQty = useCallback(
    (invoice: Invoice, item: Parameters<typeof calcAvailableReturnQty>[2]) =>
      calcAvailableReturnQty(returns, invoice, item),
    [returns],
  );

  const getReturnTypeLabel = useCallback(
    (returnRecord: ReturnRecord) => formatReturnTypeLabel(returnRecord, isArabic),
    [isArabic],
  );

  const getRefundMethodLabel = useCallback(
    (returnRecord: ReturnRecord) => formatRefundMethodLabel(returnRecord, isArabic),
    [isArabic],
  );

  const getReturnItemsSummary = useCallback(
    (returnRecord: ReturnRecord) => formatReturnItemsSummary(returnRecord, isArabic),
    [isArabic],
  );

  const openInvoiceByNumber = useCallback(
    (invoiceNumber: string) => {
      const invoice = invoices.find((row) => row.invoiceNumber === invoiceNumber);
      if (!invoice) {
        alert(isArabic ? "لم يتم العثور على الفاتورة الأصلية" : "Original invoice not found");
        return;
      }
      setSelectedReturn(null);
      onViewInvoice(invoice);
    },
    [invoices, isArabic, onViewInvoice],
  );

  const openReturnModal = useCallback((invoice: Invoice) => {
    setReturnInvoice(invoice);

    const initialQuantities: Record<string, number> = {};
    invoice.items?.forEach((item) => {
      const medicineKey = normalizeMedicineIdKey(
        item.medicineId ?? (item as { medicine_id?: number | string }).medicine_id,
      );
      if (medicineKey && medicineKey !== "0") {
        initialQuantities[medicineKey] = 0;
      }
    });

    setReturnQuantities(initialQuantities);
  }, []);

  const completeReturn = useCallback(async () => {
    if (!returnInvoice) return;

    if (!canUseSystemActions()) {
      showSubscriptionExpiredAlert();
      return;
    }

    if (!canUseReturns()) {
      alert(isArabic ? "ليس لديك صلاحية للمرتجعات" : "You do not have permission for returns");
      return;
    }

    if (isReturning) return;

    const selectedReturnItems = (returnInvoice.items || [])
      .map((item) => {
        const medicineKey = normalizeMedicineIdKey(
          item.medicineId ?? (item as { medicine_id?: number | string }).medicine_id,
        );
        const quantity = Number(returnQuantities[medicineKey] ?? 0);
        const unitPrice = Number(
          item.unitPrice ?? (item as { unit_price?: number }).unit_price ?? 0,
        );
        const buyPrice = Number(item.buyPrice ?? (item as { buy_price?: number }).buy_price ?? 0);

        if (quantity <= 0 || !medicineKey || medicineKey === "0") {
          return null;
        }

        return {
          medicineId: medicineKey,
          name_ar: item.name_ar || (item as { medicine_name?: string }).medicine_name || "",
          name_en: item.name_en || "",
          barcode: item.barcode || "",
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
          buyPrice,
          costTotal: buyPrice * quantity,
          profit: unitPrice * quantity - buyPrice * quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (selectedReturnItems.length === 0) {
      alert(isArabic ? "اختر كمية مرتجعة أولًا" : "Choose return quantity first");
      return;
    }

    for (const item of selectedReturnItems) {
      const originalItem = returnInvoice.items.find((invoiceItem) =>
        sameMedicineId(invoiceItem.medicineId, item.medicineId),
      );

      if (!originalItem) {
        alert(isArabic ? "الصنف غير موجود في الفاتورة" : "Item not found in invoice");
        return;
      }

      const availableQty = calcAvailableReturnQty(returns, returnInvoice, originalItem);

      if (item.quantity > availableQty) {
        alert(
          isArabic
            ? `كمية المرتجع أكبر من المتاح. المتاح للصنف ${originalItem.name_ar}: ${availableQty}`
            : `Return quantity is greater than available. Available for ${originalItem.name_en}: ${availableQty}`,
        );
        return;
      }
    }

    try {
      setIsReturning(true);

      const returnId = Date.now();
      const returnNumber = `RET-${returnId}`;
      const returnTotal = selectedReturnItems.reduce((sum, item) => sum + item.lineTotal, 0);

      const returnRecord: ReturnRecord = {
        id: returnId,
        returnNumber,
        invoiceNumber: returnInvoice.invoiceNumber,
        originalInvoiceId: returnInvoice.id,
        pharmacyId: getPharmacyId(),
        userId: user?.uid || "",
        userName: appUser?.name || "",
        date: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        items: selectedReturnItems,
        total: returnTotal,
        isInstant: false,
      };

      const stockMovements = [];

      for (const item of selectedReturnItems) {
        const currentMedicine = await lookupInventoryMedicineForReturn(
          item.medicineId,
          item.barcode,
        );
        if (!currentMedicine) {
          throw new Error(isArabic ? "دواء غير موجود في المخزون" : "Medicine not found");
        }

        const oldQty = currentMedicine.qty || 0;
        const newQty = oldQty + item.quantity;

        await pharmacyService.updateMedicineStock(currentMedicine.id, newQty);

        stockMovements.push({
          id: Date.now() + stockMovements.length,
          type: "return",
          medicineId: currentMedicine.id,
          medicineName_ar: item.name_ar,
          medicineName_en: item.name_en,
          barcode: item.barcode,
          quantityChange: item.quantity,
          qtyBefore: oldQty,
          qtyAfter: newQty,
          invoiceNumber: returnInvoice.invoiceNumber,
          returnNumber,
          pharmacyId: getPharmacyId(),
          userId: user?.uid || "",
          userName: appUser?.name || "",
          createdAt: new Date().toISOString(),
        });
      }

      for (const movement of stockMovements) {
        await pharmacyService.addStockMovement(movement);
      }

      await pharmacyService.createReturn(returnRecord);
      await refreshMedicinesFromDb();
      setReturns(await pharmacyService.getReturns());

      await addActivityLog({
        type: "return",
        title: isArabic ? "تسجيل مرتجع" : "Return Created",
        description: isArabic
          ? `تم تسجيل مرتجع رقم ${returnNumber} على الفاتورة ${returnInvoice.invoiceNumber} بإجمالي ${returnTotal.toFixed(2)} ${t.currency}`
          : `Return ${returnNumber} created for invoice ${returnInvoice.invoiceNumber} with total ${returnTotal.toFixed(2)} ${t.currency}`,
        referenceType: "return",
        referenceId: returnNumber,
      });

      alert(isArabic ? `تم تسجيل المرتجع رقم ${returnNumber}` : `Return ${returnNumber} completed`);

      setReturnInvoice(null);
      setReturnQuantities({});
    } catch (error) {
      console.error("Complete return error:", error);

      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حصل خطأ أثناء تسجيل المرتجع"
            : "An error occurred while completing the return",
      );
    } finally {
      setIsReturning(false);
    }
  }, [
    addActivityLog,
    appUser?.name,
    canUseReturns,
    canUseSystemActions,
    getPharmacyId,
    isArabic,
    isReturning,
    refreshMedicinesFromDb,
    returnInvoice,
    returnQuantities,
    returns,
    setReturns,
    showSubscriptionExpiredAlert,
    t.currency,
    user?.uid,
  ]);

  const handleDeleteReturn = useCallback(
    async (returnRecord: ReturnRecord) => {
      if (!canDeleteReturn()) {
        alert(
          isArabic
            ? "ليس لديك صلاحية لحذف المرتجعات"
            : "You do not have permission to delete returns",
        );
        return;
      }

      const confirmDelete = window.confirm(
        isArabic
          ? `هل أنت متأكد من حذف المرتجع ${returnRecord.returnNumber}؟\nسيتم خصم الكميات المرجعة من المخزون.`
          : `Delete return ${returnRecord.returnNumber}?\nReturned quantities will be deducted from stock.`,
      );

      if (!confirmDelete) return;

      try {
        setDeletingReturnId(returnRecord.id);

        const currentMedicines = await pharmacyService.getMedicines();

        for (const item of returnRecord.items || []) {
          const quantity = Number(item.quantity || 0);
          if (quantity <= 0) continue;

          const currentMedicine = findMedicineForReturnItem(item, currentMedicines);
          if (!currentMedicine) continue;

          const newQty = Math.max(0, currentMedicine.qty - quantity);
          await pharmacyService.updateMedicineStock(currentMedicine.id, newQty);

          await pharmacyService.addStockMovement({
            id: Date.now() + Number(currentMedicine.id),
            type: "return_delete",
            medicineId: currentMedicine.id,
            medicineName_ar: item.name_ar || currentMedicine.name_ar,
            medicineName_en: item.name_en || currentMedicine.name_en,
            barcode: item.barcode || currentMedicine.barcode,
            quantityChange: -quantity,
            qtyBefore: currentMedicine.qty,
            qtyAfter: newQty,
            invoiceNumber: returnRecord.invoiceNumber,
            returnNumber: returnRecord.returnNumber,
            pharmacyId: getPharmacyId(),
            userId: user?.uid || "",
            userName: appUser?.name || "",
            notes: isArabic ? "حذف مرتجع" : "Return deleted",
            createdAt: new Date().toISOString(),
          });
        }

        await pharmacyService.deleteReturn(returnRecord.id);
        await refreshMedicinesFromDb();
        setReturns(await pharmacyService.getReturns());

        if (selectedReturn?.id === returnRecord.id) {
          setSelectedReturn(null);
        }

        await addActivityLog({
          type: "return_delete",
          title: isArabic ? "حذف مرتجع" : "Return Deleted",
          description: isArabic
            ? `تم حذف المرتجع ${returnRecord.returnNumber} المرتبط بالفاتورة ${returnRecord.invoiceNumber}`
            : `Deleted return ${returnRecord.returnNumber} linked to invoice ${returnRecord.invoiceNumber}`,
          referenceType: "return",
          referenceId: returnRecord.returnNumber,
        });

        alert(isArabic ? "تم حذف المرتجع" : "Return deleted");
      } catch (error) {
        console.error("Delete return error:", error);
        alert(
          error instanceof Error
            ? error.message
            : isArabic
              ? "حدث خطأ أثناء حذف المرتجع"
              : "Failed to delete return",
        );
      } finally {
        setDeletingReturnId(null);
      }
    },
    [
      addActivityLog,
      appUser?.name,
      canDeleteReturn,
      getPharmacyId,
      isArabic,
      refreshMedicinesFromDb,
      selectedReturn?.id,
      setReturns,
      user?.uid,
    ],
  );

  const handleInstantReturnSuccess = useCallback(
    async (result: InstantReturnResult) => {
      if (result.refundMethod === "deduct_from_cart") {
        setDiscount(pharmacyService.applyReturnToCurrentCart(discount, result.returnTotal));
      }

      await refreshMedicinesFromDb();
      setReturns(await pharmacyService.getReturns());
      setStockMovements(await pharmacyService.getStockMovements());

      await addActivityLog({
        type: "instant_sale_return",
        title: isArabic ? "مرتجع بيع لحظي" : "Instant Sale Return",
        description: isArabic
          ? `تم تنفيذ مرتجع لحظي رقم ${result.returnNumber} على الفاتورة ${result.invoiceNumber} بقيمة ${result.returnTotal.toFixed(2)} ${t.currency}`
          : `Instant return ${result.returnNumber} on invoice ${result.invoiceNumber} for ${result.returnTotal.toFixed(2)} ${t.currency}`,
        referenceType: "return",
        referenceId: result.returnNumber,
      });

      setShowInstantReturnModal(false);

      if (result.refundMethod === "cash") {
        alert(
          isArabic
            ? `تم تنفيذ المرتجع. المبلغ المسترد نقدًا: ${result.returnTotal.toFixed(2)} ${t.currency}`
            : `Return completed. Cash refund: ${result.returnTotal.toFixed(2)} ${t.currency}`,
        );
      } else {
        alert(
          isArabic
            ? `تم تنفيذ المرتجع وخصم ${result.returnTotal.toFixed(2)} ${t.currency} من السلة الحالية`
            : `Return completed. ${result.returnTotal.toFixed(2)} ${t.currency} deducted from current cart`,
        );
      }
    },
    [
      addActivityLog,
      discount,
      isArabic,
      refreshMedicinesFromDb,
      setDiscount,
      setReturns,
      setStockMovements,
      t.currency,
    ],
  );

  return {
    selectedReturn,
    setSelectedReturn,
    returnInvoice,
    setReturnInvoice,
    returnQuantities,
    setReturnQuantities,
    isReturning,
    deletingReturnId,
    showInstantReturnModal,
    setShowInstantReturnModal,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    openInvoiceByNumber,
    openReturnModal,
    completeReturn,
    handleDeleteReturn,
    handleInstantReturnSuccess,
  };
}
