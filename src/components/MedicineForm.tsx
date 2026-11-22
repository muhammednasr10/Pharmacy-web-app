import type { Medicine, NewMedicineForm } from "../types";
import type { MedicineFormFeedback } from "../hooks/useMedicineManagement";
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
  feedback?: MedicineFormFeedback | null;
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
  feedback = null,
}: MedicineFormProps) {
  return (
    <div className="medicineForm">
      {!hideTitle && <h3>{editingMedicineId ? t.editMedicine : t.addMedicine}</h3>}
      <MedicineEntryGrid
        medicines={medicines}
        value={{ ...newMedicine, buyPrice: newMedicine.buyPrice ?? 0 }}
        onChange={(form) => onFormChange({ ...form, buyPrice: form.buyPrice ?? 0 })}
        isArabic={isArabic}
        t={t}
        disabled={disabled || isSaving}
        excludeMedicineId={editingMedicineId}
        resetKey={lookupResetKey ?? editingMedicineId ?? "new"}
        showBuyPrice={showBuyPrice}
      />
      {feedback ? (
        <p
          className={
            feedback.type === "error" ? "medicineFormFeedback is-error" : "medicineFormFeedback is-success"
          }
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}
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
