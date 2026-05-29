import type { NewMedicineForm, Medicine } from "../types";
import MedicineForm from "../components/MedicineForm";
import MedicineTable from "../components/MedicineTable";

type InventoryPageProps = {
  filteredMedicines: Medicine[];
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  onFormChange: (value: NewMedicineForm) => void;
  onSave: () => void;
  onCancel: () => void;
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
  filteredMedicines,
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  currency,
  onFormChange,
  onSave,
  onCancel,
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
  return (
    <section className="card inventoryOnlyPage">
      <div className="cardHeader">
        <div>
          <h2>{t.inventory}</h2>
          <p className="mutedText">
            {isArabic
              ? `عدد النتائج: ${filteredMedicines.length}`
              : `Results: ${filteredMedicines.length}`}
          </p>
        </div>
        <button className="printBtn" onClick={exportInventoryCSV}>
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </button>
      </div>
      <MedicineForm
        newMedicine={newMedicine}
        editingMedicineId={editingMedicineId}
        isArabic={isArabic}
        t={t}
        onFormChange={onFormChange}
        onSave={onSave}
        onCancel={onCancel}
        disabled={disabled}
      />
      <MedicineTable
        filteredMedicines={filteredMedicines}
        t={t}
        isArabic={isArabic}
        currency={currency}
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
