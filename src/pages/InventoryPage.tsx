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
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onOpenAdd: () => void;
  disabled: boolean;
  exportInventoryCSV: () => void;
  isSubscriptionExpired: boolean;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
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
  onEditMedicine,
  onDeleteMedicine,
}: InventoryPageProps) {
  const [showMedicineForm, setShowMedicineForm] = useState(false);

  useEffect(() => {
    if (editingMedicineId) {
      setShowMedicineForm(true);
    }
  }, [editingMedicineId]);

  function openAddForm() {
    onOpenAdd();
    setShowMedicineForm(true);
  }

  function closeForm() {
    onCancel();
    setShowMedicineForm(false);
  }

  async function handleSave() {
    await onSave();
    setShowMedicineForm(false);
  }

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

      {showMedicineForm && canManageInventory && (
        <div className="medicineFormCard">
          <MedicineForm
            newMedicine={newMedicine}
            editingMedicineId={editingMedicineId}
            isArabic={isArabic}
            t={t}
            onFormChange={onFormChange}
            onSave={() => void handleSave()}
            onCancel={closeForm}
            disabled={disabled}
            showCancel
          />
        </div>
      )}

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
        onEditMedicine={onEditMedicine}
        onDeleteMedicine={onDeleteMedicine}
      />
    </section>
  );
}
