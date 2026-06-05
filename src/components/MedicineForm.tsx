import type { NewMedicineForm } from "../types";

type MedicineFormProps = {
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  onFormChange: (form: NewMedicineForm) => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  onCancel: () => void;
  disabled: boolean;
  showCancel?: boolean;
  hideTitle?: boolean;
};

export default function MedicineForm({
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  onFormChange,
  onSave,
  onCancel,
  disabled,
  showCancel = false,
  hideTitle = false,
  isSaving = false,
}: MedicineFormProps) {
  return (
    <div className="medicineForm">
      {!hideTitle && <h3>{editingMedicineId ? t.editMedicine : t.addMedicine}</h3>}
      <div className="formGrid">
        <input
          value={newMedicine.name_ar}
          onChange={(e) => onFormChange({ ...newMedicine, name_ar: e.target.value })}
          placeholder={isArabic ? "اسم الدواء بالعربي" : "Arabic name"}
        />
        <input
          value={newMedicine.name_en}
          onChange={(e) => onFormChange({ ...newMedicine, name_en: e.target.value })}
          placeholder={isArabic ? "اسم الدواء بالإنجليزي" : "English name"}
        />
        <input
          value={newMedicine.barcode}
          onChange={(e) => onFormChange({ ...newMedicine, barcode: e.target.value })}
          placeholder={t.barcode}
        />
        <input
          type="number"
          value={newMedicine.qty || ""}
          onChange={(e) =>
            onFormChange({
              ...newMedicine,
              qty: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          placeholder={t.qty}
        />
        <input
          type="number"
          value={newMedicine.buyPrice || ""}
          onChange={(e) =>
            onFormChange({
              ...newMedicine,
              buyPrice: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          placeholder={isArabic ? "سعر الشراء" : "Buy price"}
        />
        <input
          type="number"
          value={newMedicine.price || ""}
          onChange={(e) =>
            onFormChange({
              ...newMedicine,
              price: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          placeholder={isArabic ? "سعر البيع" : "Sell price"}
        />
        <input
          type="date"
          value={newMedicine.expiry}
          onChange={(e) => onFormChange({ ...newMedicine, expiry: e.target.value })}
        />
      </div>
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
          <button type="button" className="cancelMedicineBtn" onClick={onCancel} disabled={isSaving}>
            {editingMedicineId ? t.cancelEdit : isArabic ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
