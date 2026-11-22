import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, Medicine, NewMedicineForm, StockMovement } from "../types";
import { getVarianceLines, type StockCountSession } from "../utils/stockCount";

export const emptyMedicineForm: NewMedicineForm = {
  name_ar: "",
  name_en: "",
  barcode: "",
  qty: 0,
  buyPrice: 0,
  price: 0,
  expiry: "",
};

export type MedicineFormFieldErrors = {
  name_ar?: string;
  name_en?: string;
  barcode?: string;
  expiry?: string;
  qty?: string;
  buyPrice?: string;
  price?: string;
};

export type MedicineFormFeedback = {
  type: "error" | "success";
  text: string;
  fieldErrors?: MedicineFormFieldErrors;
};

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type UseMedicineManagementOptions = {
  isArabic: boolean;
  medicines: Medicine[];
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  setStockMovements: Dispatch<SetStateAction<StockMovement[]>>;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  getPharmacyId: () => string;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
  canUseSystemActions: () => boolean;
  canManageInventory: () => boolean;
  canDeleteMedicine: () => boolean;
  showSubscriptionExpiredAlert: () => void;
  onNavigateToInventory: () => void;
};

export function useMedicineManagement({
  isArabic,
  medicines,
  setMedicines,
  setStockMovements,
  appUser,
  user,
  getPharmacyId,
  addActivityLog,
  canUseSystemActions,
  canManageInventory,
  canDeleteMedicine,
  showSubscriptionExpiredAlert,
  onNavigateToInventory,
}: UseMedicineManagementOptions) {
  const [newMedicine, setNewMedicine] = useState<NewMedicineForm>(emptyMedicineForm);
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [medicineFormFeedback, setMedicineFormFeedback] = useState<MedicineFormFeedback | null>(
    null,
  );

  const updateNewMedicine = useCallback((form: NewMedicineForm) => {
    setNewMedicine(form);
    setMedicineFormFeedback(null);
  }, []);

  const saveMedicine = useCallback(async (): Promise<boolean> => {
    if (!canUseSystemActions()) {
      showSubscriptionExpiredAlert();
      return false;
    }
    if (!canManageInventory()) {
      setMedicineFormFeedback({
        type: "error",
        text: isArabic
          ? "ليس لديك صلاحية لإدارة المخزون"
          : "You do not have permission to manage inventory",
      });
      return false;
    }
    const fieldErrors: MedicineFormFieldErrors = {};
    if (!String(newMedicine.name_ar || "").trim()) {
      fieldErrors.name_ar = isArabic ? "أدخل الاسم العربي" : "Enter Arabic name";
    }
    if (!String(newMedicine.name_en || "").trim()) {
      fieldErrors.name_en = isArabic ? "أدخل الاسم الإنجليزي" : "Enter English name";
    }
    if (!String(newMedicine.barcode || "").trim()) {
      fieldErrors.barcode = isArabic ? "أدخل الباركود" : "Enter barcode";
    }
    if (!String(newMedicine.expiry || "").trim()) {
      fieldErrors.expiry = isArabic ? "أدخل تاريخ الصلاحية" : "Enter expiry date";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setMedicineFormFeedback({
        type: "error",
        text: isArabic ? "أكمل الحقول المطلوبة" : "Complete the required fields",
        fieldErrors,
      });
      return false;
    }

    if (newMedicine.qty < 0 || (newMedicine.buyPrice ?? -1) < 0 || newMedicine.price <= 0) {
      const priceErrors: MedicineFormFieldErrors = {};
      if (newMedicine.qty < 0) {
        priceErrors.qty = isArabic ? "الكمية لا يمكن أن تكون سالبة" : "Quantity cannot be negative";
      }
      if ((newMedicine.buyPrice ?? -1) < 0) {
        priceErrors.buyPrice = isArabic
          ? "سعر الشراء لا يمكن أن يكون سالبًا"
          : "Buy price cannot be negative";
      }
      if (newMedicine.price <= 0) {
        priceErrors.price = isArabic
          ? "سعر البيع يجب أن يكون أكبر من صفر"
          : "Sell price must be greater than zero";
      }
      setMedicineFormFeedback({
        type: "error",
        text: isArabic
          ? "تأكد من الكمية وسعر الشراء وسعر البيع (سعر البيع يجب أن يكون أكبر من صفر)"
          : "Check quantity, buy price, and sell price (sell price must be greater than zero)",
        fieldErrors: priceErrors,
      });
      return false;
    }

    const barcodeExists = medicines.find(
      (medicine) => medicine.barcode === newMedicine.barcode && medicine.id !== editingMedicineId,
    );

    if (barcodeExists) {
      setMedicineFormFeedback({
        type: "error",
        text: isArabic ? "الباركود موجود بالفعل" : "Barcode already exists",
      });
      return false;
    }

    const wasEditing = Boolean(editingMedicineId);
    const medicineId = editingMedicineId || Date.now();
    const medicine: Medicine = {
      id: medicineId,
      name_ar: newMedicine.name_ar,
      name_en: newMedicine.name_en,
      barcode: newMedicine.barcode,
      qty: Number(newMedicine.qty),
      buyPrice: Number(newMedicine.buyPrice),
      price: Number(newMedicine.price),
      expiry: newMedicine.expiry,
      pharmacyId: getPharmacyId(),
    };

    try {
      const oldMedicine = medicines.find((item) => item.id === medicineId);
      if (editingMedicineId) {
        await pharmacyService.updateMedicine(medicineId, medicine);
      } else {
        await pharmacyService.addMedicine(medicine);
      }

      try {
        await pharmacyService.addStockMovement({
          id: Date.now(),
          type: wasEditing ? "medicine_update" : "medicine_create",
          medicineId,
          medicineName_ar: medicine.name_ar,
          medicineName_en: medicine.name_en,
          barcode: medicine.barcode,
          quantityChange: oldMedicine ? medicine.qty - oldMedicine.qty : medicine.qty,
          qtyBefore: oldMedicine ? oldMedicine.qty : 0,
          qtyAfter: medicine.qty,
          pharmacyId: getPharmacyId(),
          userId: user?.uid || "",
          userName: appUser?.name || "",
          createdAt: new Date().toISOString(),
        });
      } catch (movementError) {
        console.error("Stock movement log failed:", movementError);
      }

      await addActivityLog({
        type: wasEditing ? "medicine_update" : "medicine_create",
        title: wasEditing
          ? isArabic
            ? "تعديل دواء"
            : "Medicine Updated"
          : isArabic
            ? "إضافة دواء"
            : "Medicine Created",
        description: wasEditing
          ? isArabic
            ? `تم تعديل بيانات الدواء ${medicine.name_ar}`
            : `Medicine ${medicine.name_en} was updated`
          : isArabic
            ? `تمت إضافة الدواء ${medicine.name_ar} بكمية ${medicine.qty}`
            : `Medicine ${medicine.name_en} was created with quantity ${medicine.qty}`,
        referenceType: "medicine",
        referenceId: String(medicineId),
      });

      // Optimistic local update (bulk getMedicines may return [] for large catalogs).
      setMedicines((prev) => {
        const exists = prev.some((item) => item.id === medicineId);
        if (exists) {
          return prev.map((item) => (item.id === medicineId ? { ...item, ...medicine } : item));
        }
        return [medicine, ...prev];
      });
      void pharmacyService.getMedicines().then((rows) => {
        if (rows.length > 0) setMedicines(rows);
      });

      setNewMedicine(emptyMedicineForm);
      setEditingMedicineId(null);
      setMedicineFormFeedback(null);
      return true;
    } catch (error) {
      console.error("saveMedicine error:", error);
      setMedicineFormFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : isArabic
              ? "حدث خطأ أثناء حفظ الدواء"
              : "Failed to save medicine",
      });
      return false;
    }
  }, [
    addActivityLog,
    appUser?.name,
    canManageInventory,
    canUseSystemActions,
    editingMedicineId,
    getPharmacyId,
    isArabic,
    medicines,
    newMedicine,
    setMedicines,
    showSubscriptionExpiredAlert,
    user?.uid,
  ]);

  const handleApplyStockCount = useCallback(
    async (session: StockCountSession) => {
      const varianceLines = getVarianceLines(session);
      const result = await pharmacyService.applyStockCountAdjustments({
        pharmacyId: getPharmacyId(),
        userId: user?.uid,
        userName: appUser?.name,
        notes: session.notes,
        lines: varianceLines.map((line) => ({
          medicineId: line.medicineId,
          medicineName_ar: line.name_ar,
          medicineName_en: line.name_en,
          barcode: line.barcode,
          systemQty: line.systemQty,
          countedQty: line.countedQty,
        })),
      });

      await addActivityLog({
        type: "stock_count",
        title: isArabic ? "تسوية جرد مخزون" : "Stock count adjustment",
        description: isArabic
          ? `تم تسوية ${result.adjustedCount} صنف — فرق الكمية ${result.totalVariance > 0 ? "+" : ""}${result.totalVariance}`
          : `Adjusted ${result.adjustedCount} items — qty diff ${result.totalVariance > 0 ? "+" : ""}${result.totalVariance}`,
        referenceType: "stock_count",
        referenceId: session.id,
      });

      setMedicines(await pharmacyService.getMedicines());
      setStockMovements(await pharmacyService.getStockMovements());
      setMedicineFormFeedback({
        type: "success",
        text: isArabic
          ? `تمت تسوية الجرد بنجاح (${result.adjustedCount} صنف)`
          : `Stock count applied (${result.adjustedCount} items)`,
      });
    },
    [
      addActivityLog,
      appUser?.name,
      getPharmacyId,
      isArabic,
      setMedicines,
      setStockMovements,
      user?.uid,
    ],
  );

  const startEditMedicine = useCallback(
    (medicine: Medicine) => {
      setEditingMedicineId(medicine.id);
      setNewMedicine({
        name_ar: medicine.name_ar,
        name_en: medicine.name_en,
        barcode: medicine.barcode,
        qty: medicine.qty,
        buyPrice: medicine.buyPrice || 0,
        price: medicine.price,
        expiry: medicine.expiry,
      });
      setMedicineFormFeedback(null);
      onNavigateToInventory();
    },
    [onNavigateToInventory],
  );

  const cancelEditMedicine = useCallback(() => {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
    setMedicineFormFeedback(null);
  }, []);

  const openAddMedicineForm = useCallback(() => {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
    setMedicineFormFeedback(null);
  }, []);

  const deleteMedicine = useCallback(
    async (medicine: Medicine) => {
      if (!canUseSystemActions()) {
        showSubscriptionExpiredAlert();
        return;
      }
      if (!canDeleteMedicine()) {
        setMedicineFormFeedback({
          type: "error",
          text: isArabic
            ? "ليس لديك صلاحية لحذف الأدوية"
            : "You do not have permission to delete medicines",
        });
        return;
      }

      const confirmDelete = window.confirm(
        isArabic
          ? `هل أنت متأكد من حذف ${medicine.name_ar}؟`
          : `Are you sure you want to delete ${medicine.name_en}?`,
      );

      if (!confirmDelete) return;

      await pharmacyService.addStockMovement({
        type: "medicine_delete",
        medicineId: medicine.id,
        medicineName_ar: medicine.name_ar,
        medicineName_en: medicine.name_en,
        barcode: medicine.barcode,
        quantityChange: -medicine.qty,
        qtyBefore: medicine.qty,
        qtyAfter: 0,
        pharmacyId: getPharmacyId(),
        userId: user?.uid || "",
        userName: appUser?.name || "",
        createdAt: new Date().toISOString(),
      });
      await pharmacyService.deleteMedicine(medicine.id);

      await addActivityLog({
        type: "medicine_delete",
        title: isArabic ? "حذف دواء" : "Medicine Deleted",
        description: isArabic
          ? `تم حذف الدواء ${medicine.name_ar} وكانت الكمية ${medicine.qty}`
          : `Medicine ${medicine.name_en} was deleted with quantity ${medicine.qty}`,
        referenceType: "medicine",
        referenceId: String(medicine.id),
      });

      setMedicines((prev) => prev.filter((item) => item.id !== medicine.id));
    },
    [
      addActivityLog,
      appUser?.name,
      canDeleteMedicine,
      canUseSystemActions,
      getPharmacyId,
      isArabic,
      setMedicines,
      showSubscriptionExpiredAlert,
      user?.uid,
    ],
  );

  return {
    newMedicine,
    setNewMedicine: updateNewMedicine,
    editingMedicineId,
    medicineFormFeedback,
    setMedicineFormFeedback,
    saveMedicine,
    handleApplyStockCount,
    startEditMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    deleteMedicine,
  };
}
