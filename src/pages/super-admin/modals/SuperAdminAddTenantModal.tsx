import {
  subscriptionTierOrder,
  subscriptionTiers,
} from "../../../config/subscriptionTiers";
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
                        placeholder="focus-pharmacy"
                        dir="ltr"
                      />
                    </label>
                    <label className="saasField">
                      <span>{isArabic ? "اسم الصيدلية" : "Pharmacy name"}</span>
                      <input
                        value={tenantForm.name}
                        onChange={(e) => onTenantFormChange({ name: e.target.value })}
                        placeholder={isArabic ? "صيدلية فوكس" : "Focus Pharmacy"}
                      />
                    </label>
                    <label className="saasField">
                      <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
                      <input
                        value={tenantForm.name_en}
                        onChange={(e) => onTenantFormChange({ name_en: e.target.value })}
                        placeholder="Focus Pharmacy"
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
                    {isArabic ? "باقة الاشتراك" : "Subscription package"}
                  </h3>
                  <p className="saasFormSectionHint">
                    {isArabic
                      ? "اختر باقة جاهزة أو «مخصص» لتحديد حدود الفروع والمستخدمين بنفسك"
                      : "Pick a preset package or choose Custom to set branch and user limits yourself"}
                  </p>
                  <div className="saasTierPickGrid saasTierPickGridFour">
                    {subscriptionTierOrder.map((tierId) => {
                      const tier = subscriptionTiers[tierId];
                      const selected = tenantForm.packageChoice === tierId;
                      return (
                        <button
                          key={tierId}
                          type="button"
                          className={`saasTierPickCard ${tierId}${selected ? " selected" : ""}`}
                          onClick={() =>
                            onTenantFormChange({
                              packageChoice: tierId,
                              subscriptionTier: tierId,
                              maxBranches: tier.maxBranches,
                              maxUsers: tier.maxUsers,
                            })
                          }
                        >
                          <span className="saasTierPickBadge">
                            {isArabic ? tier.labelAr : tier.labelEn}
                          </span>
                          <strong>{isArabic ? tier.summaryAr : tier.summaryEn}</strong>
                          <small>
                            {isArabic
                              ? `${tier.maxBranches} فروع · ${tier.maxUsers} مستخدم`
                              : `${tier.maxBranches} branches · ${tier.maxUsers} users`}
                          </small>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`saasTierPickCard custom${
                        tenantForm.packageChoice === "custom" ? " selected" : ""
                      }`}
                      onClick={() =>
                        onTenantFormChange({
                          packageChoice: "custom",
                          subscriptionTier: "premium",
                          maxBranches: Math.max(tenantForm.maxBranches, 3),
                          maxUsers: Math.max(tenantForm.maxUsers, 10),
                        })
                      }
                    >
                      <span className="saasTierPickBadge">
                        {isArabic ? "مخصص" : "Custom"}
                      </span>
                      <strong>
                        {isArabic ? "حدود حسب اتفاقك" : "Limits tailored to your deal"}
                      </strong>
                      <small>
                        {isArabic
                          ? "تحكم في عدد الفروع والمستخدمين"
                          : "Control branches and users"}
                      </small>
                    </button>
                  </div>

                  {tenantForm.packageChoice === "custom" ? (
                    <div className="saasCustomLimitsPanel">
                      <p>
                        {isArabic
                          ? "الباقة المخصصة تفعّل مميزات الباقة الفاخرة مع الحدود التي تحددها"
                          : "Custom uses Premium features with the limits you set below"}
                      </p>
                      <div className="saasCustomLimitsGrid">
                        <label className="saasField">
                          <span>{isArabic ? "حد الفروع" : "Branch limit"}</span>
                          <input
                            type="number"
                            min={1}
                            value={tenantForm.maxBranches}
                            onChange={(e) =>
                              onTenantFormChange({
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
                                maxUsers: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="saasSelectedPackageSummary">
                      <span>{isArabic ? "الحدود المختارة:" : "Selected limits:"}</span>
                      <strong>
                        {tenantForm.maxBranches} {isArabic ? "فروع" : "branches"} · {tenantForm.maxUsers}{" "}
                        {isArabic ? "مستخدم" : "users"}
                      </strong>
                    </div>
                  )}
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
