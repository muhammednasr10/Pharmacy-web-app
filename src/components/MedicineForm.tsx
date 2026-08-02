import type { Medicine, NewMedicineForm } from "../types";
import MedicineEntryGrid from "./MedicineEntryGrid";

type MedicineFormProps = {
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  medicines?: Medicine[];
  isArabic: boolean;
  t: Record<string, string>;
  onFormChange: (form: NewMedicineForm) => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  onCancel: () => void;
  disabled: boolean;
  showCancel?: boolean;
  hideTitle?: boolean;
  showBuyPrice?: boolean;
  lookupResetKey?: string | number;
};

export default function MedicineForm({
  newMedicine,
  editingMedicineId,
  medicines = [],
  isArabic,
  t,
  onFormChange,
  onSave,
  onCancel,
  disabled,
  showCancel = false,
  hideTitle = false,
  showBuyPrice = true,
  isSaving = false,
  lookupResetKey,
}: MedicineFormProps) {
  return (
    <div className="medicineForm">
      {!hideTitle && <h3>{editingMedicineId ? t.editMedicine : t.addMedicine}</h3>}
      <MedicineEntryGrid
        medicines={medicines}
        value={newMedicine}
        onChange={onFormChange}
        isArabic={isArabic}
        t={t}
        disabled={disabled || isSaving}
        excludeMedicineId={editingMedicineId}
        resetKey={lookupResetKey ?? editingMedicineId ?? "new"}
        showBuyPrice={showBuyPrice}
      />
      <div className="medicineFormActions">
        <button
          type="button"
          className="addMedicineBtn"
          onClick={() => void onSave()}
          disabled={disabled || isSaving}
        >
          {isSaving
            ? isArabic
              ? "جاري الحفظ..."
              : "Saving..."
            : editingMedicineId
              ? t.saveChanges
              : t.addMedicineBtn}
        </button>
        {showCancel && (
          <button
            type="button"
            className="cancelMedicineBtn"
            onClick={onCancel}
            disabled={isSaving}
          >
            {editingMedicineId ? t.cancelEdit : isArabic ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
