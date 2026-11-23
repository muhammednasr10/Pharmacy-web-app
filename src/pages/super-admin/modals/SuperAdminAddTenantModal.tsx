import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminAddTenantModal({ state }: Props) {
  const {
    addModalOpen,
    isArabic,
    tenantForm,
    onTenantFormChange,
    creatingTenant,
    closeAddModal,
    submitCreateTenant,
  } = state;

  if (!addModalOpen) return null;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal saasModal saasModalWide saasAddTenantModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "إضافة صيدلية جديدة" : "Add New Pharmacy"}</h2>
            <p>
              {isArabic
                ? "أنشئ عميل SaaS جديد — المعرف ثابت ولا يُغيَّر بعد الإنشاء"
                : "Create a new SaaS tenant — the ID is permanent after creation"}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={closeAddModal}>
            ×
          </button>
        </div>

        <section className="saasFormSection">
          <h3 className="saasFormSectionTitle">
            {isArabic ? "بيانات الصيدلية" : "Pharmacy details"}
          </h3>
          <div className="formGrid saasFormGrid saasAddTenantFormGrid">
            <label className="saasField">
              <span>{isArabic ? "المعرف (slug)" : "ID (slug)"}</span>
              <input
                value={tenantForm.id}
                onChange={(e) => onTenantFormChange({ id: e.target.value })}
                placeholder="victory-pharmacy"
                dir="ltr"
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "اسم الصيدلية" : "Pharmacy name"}</span>
              <input
                value={tenantForm.name}
                onChange={(e) => onTenantFormChange({ name: e.target.value })}
                placeholder={isArabic ? "صيدلية النصر" : "Victory Pharmacy"}
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
              <input
                value={tenantForm.name_en}
                onChange={(e) => onTenantFormChange({ name_en: e.target.value })}
                placeholder="Victory Pharmacy"
                dir="ltr"
              />
            </label>
            <label className="saasField">
              <span>{isArabic ? "الهاتف" : "Phone"}</span>
              <input
                value={tenantForm.phone}
                onChange={(e) => onTenantFormChange({ phone: e.target.value })}
                placeholder="01020304050"
                dir="ltr"
              />
            </label>
            <label className="saasField saasFieldFull">
              <span>{isArabic ? "العنوان" : "Address"}</span>
              <input
                value={tenantForm.address}
                onChange={(e) => onTenantFormChange({ address: e.target.value })}
                placeholder={isArabic ? "القاهرة" : "Cairo"}
              />
            </label>
          </div>
        </section>

        <section className="saasFormSection">
          <h3 className="saasFormSectionTitle">
            {isArabic ? "حدود الاشتراك" : "Subscription limits"}
          </h3>
          <p className="saasFormSectionHint">
            {isArabic
              ? "حدد عدد الفروع والمستخدمين — السعر يتحسب من حاسبة التسعير (شهري أو سنوي بخصم 20%)"
              : "Set branch and user caps — price comes from the pricing calculator (monthly or yearly with 20% off)"}
          </p>
          <div className="saasCustomLimitsPanel">
            <div className="saasCustomLimitsGrid">
              <label className="saasField">
                <span>{isArabic ? "حد الفروع" : "Branch limit"}</span>
                <input
                  type="number"
                  min={1}
                  value={tenantForm.maxBranches}
                  onChange={(e) =>
                    onTenantFormChange({
                      packageChoice: "custom",
                      subscriptionTier: "professional",
                      maxBranches: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "حد المستخدمين" : "User limit"}</span>
                <input
                  type="number"
                  min={1}
                  value={tenantForm.maxUsers}
                  onChange={(e) =>
                    onTenantFormChange({
                      packageChoice: "custom",
                      subscriptionTier: "professional",
                      maxUsers: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <div className="modalActions saasModalActions">
          <button type="button" className="printBtn" onClick={closeAddModal}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="completeBtn"
            disabled={creatingTenant}
            onClick={() => void submitCreateTenant()}
          >
            {creatingTenant
              ? isArabic
                ? "جاري الإنشاء..."
                : "Creating..."
              : isArabic
                ? "إنشاء الصيدلية"
                : "Create Pharmacy"}
          </button>
        </div>
      </div>
    </div>
  );
}
