import { useEffect, useState } from "react";
import type { NewMedicineForm, Medicine } from "../types";
import MedicineForm from "../components/MedicineForm";
import MedicineTable from "../components/MedicineTable";

type InventoryPageProps = {
  medicines: Medicine[];
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  onFormChange: (value: NewMedicineForm) => void;
  onSave: () => boolean | Promise<boolean>;
  onCancel: () => void;
  onOpenAdd: () => void;
  disabled: boolean;
  exportInventoryCSV: () => void;
  isSubscriptionExpired: boolean;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart: (medicine: Medicine) => void;
  addToCartLabel?: string;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  lowStockThreshold: number;
  expiringSoonDays: number;
};

export default function InventoryPage({
  medicines,
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  currency,
  onFormChange,
  onSave,
  onCancel,
  onOpenAdd,
  disabled,
  exportInventoryCSV,
  isSubscriptionExpired,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  onAddToCart,
  addToCartLabel,
  onEditMedicine,
  onDeleteMedicine,
  lowStockThreshold,
  expiringSoonDays,
}: InventoryPageProps) {
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingMedicineId) {
      setShowMedicineForm(true);
    }
  }, [editingMedicineId]);

  useEffect(() => {
    if (!showMedicineForm) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeForm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMedicineForm]);

  function openAddForm() {
    onOpenAdd();
    setShowMedicineForm(true);
  }

  function closeForm() {
    onCancel();
    setShowMedicineForm(false);
  }

  function handleEditMedicine(medicine: Medicine) {
    onEditMedicine(medicine);
    setShowMedicineForm(true);
  }

  async function handleSave() {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const saved = await onSave();
      if (saved) {
        setShowMedicineForm(false);
      }
    } catch (error) {
      console.error("Save medicine error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء حفظ الدواء"
          : "Failed to save medicine"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const formTitle = editingMedicineId ? t.editMedicine : t.addMedicine;

  return (
    <section className="card inventoryOnlyPage">
      <div className="cardHeader">
        <div>
          <h2>{t.inventory}</h2>
          <p className="mutedText">
            {isArabic
              ? `إجمالي الأدوية: ${medicines.length}`
              : `Total medicines: ${medicines.length}`}
          </p>
        </div>
        <div className="inventoryHeaderActions">
          {canManageInventory && !isSubscriptionExpired && (
            <button type="button" className="addMedicineBtn" onClick={openAddForm}>
              {isArabic ? "+ إضافة دواء جديد" : "+ Add New Medicine"}
            </button>
          )}
          <button type="button" className="printBtn" onClick={exportInventoryCSV}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      <MedicineTable
        medicines={medicines}
        t={t}
        isArabic={isArabic}
        currency={currency}
        showColumnFilters
        showManagementActions={true}
        canUsePOS={canUsePOS}
        canManageInventory={canManageInventory}
        canDeleteMedicine={canDeleteMedicine}
        onAddToCart={onAddToCart}
        addToCartLabel={addToCartLabel}
        onEditMedicine={handleEditMedicine}
        onDeleteMedicine={onDeleteMedicine}
        lowStockThreshold={lowStockThreshold}
        expiringSoonDays={expiringSoonDays}
      />

      {showMedicineForm && canManageInventory && (
        <div className="modalOverlay" onClick={closeForm}>
          <div className="medicineFormModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{formTitle}</h2>
                <p className="mutedText">
                  {editingMedicineId
                    ? isArabic
                      ? "عدّل بيانات الدواء ثم احفظ أو ألغِ"
                      : "Edit medicine details, then save or cancel"
                    : isArabic
                    ? "أدخل بيانات الدواء الجديد"
                    : "Enter new medicine details"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={closeForm} aria-label={t.close}>
                ×
              </button>
            </div>
            <MedicineForm
              newMedicine={newMedicine}
              editingMedicineId={editingMedicineId}
              isArabic={isArabic}
              t={t}
              onFormChange={onFormChange}
              onSave={handleSave}
              onCancel={closeForm}
              disabled={disabled}
              isSaving={isSaving}
              showCancel
              hideTitle
            />
          </div>
        </div>
      )}
    </section>
  );
}
