import { useEffect, useState } from "react";
import type { PharmacySupplier } from "../../types";

type SupplierFormModalProps = {
  isArabic: boolean;
  open: boolean;
  initial?: Partial<PharmacySupplier> | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (supplier: PharmacySupplier) => Promise<void>;
};

const emptyForm: PharmacySupplier = {
  id: 0,
  name: "",
  phone: "",
  email: "",
  address: "",
  company: "",
  notes: "",
  isActive: true,
};

export default function SupplierFormModal({
  isArabic,
  open,
  initial,
  saving = false,
  onClose,
  onSave,
}: SupplierFormModalProps) {
  const [form, setForm] = useState<PharmacySupplier>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      ...initial,
      id: initial?.id || Date.now(),
      isActive: initial?.isActive !== false,
    });
  }, [open, initial]);

  if (!open) return null;

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert(isArabic ? "أدخل اسم المورد" : "Enter supplier name");
      return;
    }
    await onSave({ ...form, name: form.name.trim() });
  }

  return (
    <div className="modalOverlay">
      <div className="invoiceModal purchaseModal crmFormModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>
              {initial?.id
                ? isArabic
                  ? "تعديل مورد"
                  : "Edit supplier"
                : isArabic
                  ? "إضافة مورد"
                  : "Add supplier"}
            </h2>
            <p>{isArabic ? "بيانات المورد اللي الصيدلية بتتعامل معاه" : "Supplier the pharmacy deals with"}</p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="medicineForm purchaseModalForm">
          <div className="formGrid">
            <label className="saasField">
              <span>{isArabic ? "اسم المورد" : "Supplier name"}</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "الشركة / الشركة الموردة" : "Company"}</span>
              <input
                value={form.company || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "الهاتف" : "Phone"}</span>
              <input
                dir="ltr"
                value={form.phone || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "البريد" : "Email"}</span>
              <input
                dir="ltr"
                value={form.email || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="saasField" style={{ gridColumn: "1 / -1" }}>
              <span>{isArabic ? "العنوان" : "Address"}</span>
              <input
                value={form.address || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </label>
            <label className="saasField" style={{ gridColumn: "1 / -1" }}>
              <span>{isArabic ? "ملاحظات" : "Notes"}</span>
              <textarea
                rows={3}
                value={form.notes || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "الحالة" : "Status"}</span>
              <select
                value={form.isActive === false ? "inactive" : "active"}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))
                }
              >
                <option value="active">{isArabic ? "نشط" : "Active"}</option>
                <option value="inactive">{isArabic ? "موقوف" : "Inactive"}</option>
              </select>
            </label>
          </div>

          <div className="modalActions">
            <button type="button" className="clearCartBtn" onClick={onClose} disabled={saving}>
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button type="button" className="printFullBtn" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
