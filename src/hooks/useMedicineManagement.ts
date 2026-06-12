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

  const saveMedicine = useCallback(async (): Promise<boolean> => {
    if (!canUseSystemActions()) {
      showSubscriptionExpiredAlert();
      return false;
    }
    if (!canManageInventory()) {
      alert(
        isArabic
          ? "ليس لديك صلاحية لإدارة المخزون"
          : "You do not have permission to manage inventory",
      );
      return false;
    }
    if (
      !newMedicine.name_ar ||
      !newMedicine.name_en ||
      !newMedicine.barcode ||
      !newMedicine.expiry
    ) {
      alert(isArabic ? "من فضلك أكمل بيانات الدواء" : "Please complete medicine data");
      return false;
    }

    if (newMedicine.qty < 0 || (newMedicine.buyPrice ?? -1) < 0 || newMedicine.price <= 0) {
      alert(
        isArabic
          ? "تأكد من الكمية وسعر الشراء وسعر البيع"
          : "Check quantity, buy price and sell price",
      );
      return false;
    }

    const barcodeExists = medicines.find(
      (medicine) => medicine.barcode === newMedicine.barcode && medicine.id !== editingMedicineId,
    );

    if (barcodeExists) {
      alert(isArabic ? "الباركود موجود بالفعل" : "Barcode already exists");
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

      setMedicines(await pharmacyService.getMedicines());
      setNewMedicine(emptyMedicineForm);
      setEditingMedicineId(null);
      alert(
        wasEditing
          ? isArabic
            ? "تم تعديل الدواء بنجاح"
            : "Medicine updated successfully"
          : isArabic
            ? "تمت إضافة الدواء بنجاح"
            : "Medicine added successfully",
      );
      return true;
    } catch (error) {
      console.error("saveMedicine error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ أثناء حفظ الدواء"
            : "Failed to save medicine",
      );
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
      alert(
        isArabic
          ? `تمت تسوية الجرد بنجاح (${result.adjustedCount} صنف)`
          : `Stock count applied (${result.adjustedCount} items)`,
      );
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
      onNavigateToInventory();
    },
    [onNavigateToInventory],
  );

  const cancelEditMedicine = useCallback(() => {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
  }, []);

  const openAddMedicineForm = useCallback(() => {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
  }, []);

  const deleteMedicine = useCallback(
    async (medicine: Medicine) => {
      if (!canUseSystemActions()) {
        showSubscriptionExpiredAlert();
        return;
      }
      if (!canDeleteMedicine()) {
        alert(
          isArabic
            ? "ليس لديك صلاحية لحذف الأدوية"
            : "You do not have permission to delete medicines",
        );
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

      alert(isArabic ? "تم حذف الدواء" : "Medicine deleted");
    },
    [
      addActivityLog,
      appUser?.name,
      canDeleteMedicine,
      canUseSystemActions,
      getPharmacyId,
      isArabic,
      showSubscriptionExpiredAlert,
      user?.uid,
    ],
  );

  return {
    newMedicine,
    setNewMedicine,
    editingMedicineId,
    saveMedicine,
    handleApplyStockCount,
    startEditMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    deleteMedicine,
  };
}
