import { useEffect, useState } from "react";
import type { CrmCustomer, CustomerSegment } from "../../types";
import { CUSTOMER_SEGMENTS, getCustomerSegmentLabel } from "../../utils/crmLabels";

type CustomerFormModalProps = {
  isArabic: boolean;
  open: boolean;
  initial?: Partial<CrmCustomer> | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (customer: CrmCustomer) => Promise<void>;
};

const emptyForm: CrmCustomer = {
  id: 0,
  name: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
  gender: "",
  segment: "regular",
  tags: [],
  notes: "",
  isActive: true,
};

export default function CustomerFormModal({
  isArabic,
  open,
  initial,
  saving = false,
  onClose,
  onSave,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CrmCustomer>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      ...initial,
      id: initial?.id || Date.now(),
      segment: (initial?.segment || "regular") as CustomerSegment,
      tags: initial?.tags || [],
    });
    setTagsInput((initial?.tags || []).join(", "));
  }, [open, initial]);

  if (!open) return null;

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert(isArabic ? "أدخل اسم العميل" : "Enter customer name");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await onSave({ ...form, name: form.name.trim(), tags });
  }

  return (
    <div className="modalOverlay">
      <div className="invoiceModal purchaseModal crmFormModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{initial?.id ? (isArabic ? "تعديل عميل" : "Edit customer") : isArabic ? "إضافة عميل" : "Add customer"}</h2>
            <p>{isArabic ? "بيانات CRM للعميل" : "CRM customer profile"}</p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="medicineForm purchaseModalForm">
          <div className="formGrid">
            <label className="saasField">
              <span>{isArabic ? "الاسم" : "Name"}</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
            <label className="saasField">
              <span>{isArabic ? "الشريحة" : "Segment"}</span>
              <select
                value={form.segment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, segment: e.target.value as CustomerSegment }))
                }
              >
                {CUSTOMER_SEGMENTS.map((segment) => (
                  <option key={segment} value={segment}>
                    {getCustomerSegmentLabel(segment, isArabic)}
                  </option>
                ))}
              </select>
            </label>
            <label className="saasField">
              <span>{isArabic ? "تاريخ الميلاد" : "Birth date"}</span>
              <input
                type="date"
                value={form.birthDate || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "النوع" : "Gender"}</span>
              <select
                value={form.gender || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gender: e.target.value as CrmCustomer["gender"],
                  }))
                }
              >
                <option value="">{isArabic ? "—" : "—"}</option>
                <option value="male">{isArabic ? "ذكر" : "Male"}</option>
                <option value="female">{isArabic ? "أنثى" : "Female"}</option>
              </select>
            </label>
            <label className="saasField fullWidth">
              <span>{isArabic ? "العنوان" : "Address"}</span>
              <input
                value={form.address || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </label>
            <label className="saasField fullWidth">
              <span>{isArabic ? "وسوم (مفصولة بفاصلة)" : "Tags (comma-separated)"}</span>
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
            </label>
            <label className="saasField fullWidth">
              <span>{isArabic ? "ملاحظات" : "Notes"}</span>
              <textarea
                rows={3}
                value={form.notes || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="modalActions">
          <button type="button" className="addMedicineBtn" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? "…" : isArabic ? "حفظ" : "Save"}
          </button>
          <button type="button" className="completeBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
