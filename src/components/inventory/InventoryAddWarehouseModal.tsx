import { useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import type { PharmacySettings } from "../../types";
import { formatBranchLimitError } from "../../utils/orgAdminErrors";

type InventoryAddWarehouseModalProps = {
  isArabic: boolean;
  anchorPharmacyId: string;
  copyFromBranchId: string;
  orgBranches: PharmacySettings[];
  onClose: () => void;
  onCreated: (branchId: string) => void | Promise<void>;
};

function makeWarehouseId() {
  return `wh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function InventoryAddWarehouseModal({
  isArabic,
  anchorPharmacyId,
  copyFromBranchId,
  orgBranches,
  onClose,
  onCreated,
}: InventoryAddWarehouseModalProps) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone] = useState(orgBranches[0]?.phone || "");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert(isArabic ? "أدخل اسم المخزن" : "Enter warehouse name");
      return;
    }

    setSaving(true);
    try {
      const id = makeWarehouseId();
      await pharmacyService.createPharmacyBranchForAnchor(anchorPharmacyId, {
        id,
        name: trimmedName,
        name_en: nameEn.trim() || trimmedName,
        phone: phone.trim(),
        address: address.trim(),
      });

      if (copyFromBranchId && copyFromBranchId !== id) {
        await pharmacyService.copyPharmacySettingsFromBranch(copyFromBranchId, id);
      }

      await onCreated(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        formatBranchLimitError(message, isArabic) ||
          (isArabic ? "تعذر إضافة المخزن" : "Could not add warehouse"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose} role="presentation">
      <div
        className="invoiceModal saasModal invMgmtAddWarehouseModal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "إضافة مخزن جديد" : "Add new warehouse"}</h2>
            <p className="mutedText">
              {isArabic
                ? "سيُنشأ مخزن فرعي جديد ضمن نفس الصيدلية"
                : "A new branch warehouse will be created under your pharmacy"}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose} aria-label={isArabic ? "إغلاق" : "Close"}>
            ×
          </button>
        </div>

        <div className="formGrid saasFormGrid">
          <label className="saasField">
            <span>{isArabic ? "اسم المخزن (عربي)" : "Warehouse name (Arabic)"}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isArabic ? "مخزن فرع أكتوبر" : "October branch store"} />
          </label>
          <label className="saasField">
            <span>{isArabic ? "اسم المخزن (إنجليزي)" : "Warehouse name (English)"}</span>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </label>
          <label className="saasField">
            <span>{isArabic ? "الهاتف" : "Phone"}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="saasField saasFieldFull">
            <span>{isArabic ? "العنوان" : "Address"}</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </div>

        <div className="saasModalActions">
          <button type="button" className="printBtn" disabled={saving} onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button type="button" className="completeBtn" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "إضافة المخزن" : "Add warehouse"}
          </button>
        </div>
      </div>
    </div>
  );
}
