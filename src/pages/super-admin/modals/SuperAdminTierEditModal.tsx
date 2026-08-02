import type { Page } from "../../../types";
import {
  getTierPageLabel,
  sanitizeTierEnabledPagesSelection,
  TIER_CONFIGURABLE_PAGES,
} from "../../../config/subscriptionTierPages";
import {
  sanitizeTierAllowedFeaturesSelection,
  TIER_CONFIGURABLE_FEATURES,
} from "../../../config/subscriptionTierFeatures";
import { subscriptionTiers } from "../../../config/subscriptionTiers";
import { mergeTierEditAutoCopy } from "../../../utils/tierPackageCopy";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminTierEditModal({ state }: Props) {
  const {
    tierEditModalOpen,
    isArabic,
    editingTierId,
    tierEditForm,
    setTierEditForm,
    savingTierConfig,
    closeTierEditModal,
    submitTierEdit,
  } = state;

  if (!tierEditModalOpen || !editingTierId) return null;

  return (
            <div className="modalOverlay">
              <div className="invoiceModal saasModal saasModalWide saasModalTierEdit" onClick={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                  <div>
                    <h2>
                      {isArabic ? "تعديل الباقة" : "Edit package"} —{" "}
                      {isArabic
                        ? subscriptionTiers[editingTierId].labelAr
                        : subscriptionTiers[editingTierId].labelEn}
                    </h2>
                    <p>
                      {isArabic
                        ? "التغييرات تُطبَّق عند تعيين الباقة لصيدلية أو طلب ترقية"
                        : "Changes apply when assigning the package or approving upgrades"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="closeBtn"
                    disabled={savingTierConfig}
                    onClick={closeTierEditModal}
                  >
                    ×
                  </button>
                </div>

                <div className="formGrid saasFormGrid">
                  <label className="saasField">
                    <span>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</span>
                    <input
                      value={tierEditForm.labelAr}
                      onChange={(e) => setTierEditForm((prev) => ({ ...prev, labelAr: e.target.value }))}
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "الاسم (إنجليزي)" : "Name (English)"}</span>
                    <input
                      value={tierEditForm.labelEn}
                      onChange={(e) => setTierEditForm((prev) => ({ ...prev, labelEn: e.target.value }))}
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "عدد المخازن المتاحة" : "Warehouse slots"}</span>
                    <input
                      type="number"
                      min={1}
                      value={tierEditForm.maxBranches}
                      onChange={(e) =>
                        setTierEditForm((prev) =>
                          mergeTierEditAutoCopy({ ...prev, maxBranches: e.target.value }),
                        )
                      }
                    />
                    <small className="saasFieldHint">
                      {isArabic
                        ? "يحدد أقصى عدد مخازن يمكن لكل صيدلية على هذه الباقة إنشاؤها في «إدارة المخزن»"
                        : "Maximum warehouses each pharmacy on this tier can create in Inventory Management"}
                    </small>
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "حد المستخدمين" : "User limit"}</span>
                    <input
                      type="number"
                      min={1}
                      value={tierEditForm.maxUsers}
                      onChange={(e) =>
                        setTierEditForm((prev) => mergeTierEditAutoCopy({ ...prev, maxUsers: e.target.value }))
                      }
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "سعر الباقة (شهري — ج.م)" : "Package price (monthly — EGP)"}</span>
                    <input
                      type="number"
                      min={0}
                      value={tierEditForm.packagePrice}
                      onChange={(e) =>
                        setTierEditForm((prev) => ({ ...prev, packagePrice: e.target.value }))
                      }
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>
                      {isArabic ? "الوصف المختصر (عربي)" : "Short summary (Arabic)"}
                      <em className="saasAutoFieldHint">
                        {isArabic ? " — يُولَّد تلقائياً" : " — auto-generated"}
                      </em>
                    </span>
                    <input
                      className="saasFieldReadOnly"
                      readOnly
                      value={tierEditForm.summaryAr}
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>
                      {isArabic ? "الوصف المختصر (إنجليزي)" : "Short summary (English)"}
                      <em className="saasAutoFieldHint">
                        {isArabic ? " — يُولَّد تلقائياً" : " — auto-generated"}
                      </em>
                    </span>
                    <input
                      className="saasFieldReadOnly"
                      readOnly
                      value={tierEditForm.summaryEn}
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>
                      {isArabic ? "المميزات (عربي)" : "Features (Arabic)"}
                      <em className="saasAutoFieldHint">
                        {isArabic ? " — من الحدود والصفحات المفعّلة" : " — from limits & enabled pages"}
                      </em>
                    </span>
                    <textarea
                      className="saasFieldReadOnly"
                      rows={6}
                      readOnly
                      value={tierEditForm.featuresAr}
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>
                      {isArabic ? "المميزات (إنجليزي)" : "Features (English)"}
                      <em className="saasAutoFieldHint">
                        {isArabic ? " — من الحدود والصفحات المفعّلة" : " — from limits & enabled pages"}
                      </em>
                    </span>
                    <textarea
                      className="saasFieldReadOnly"
                      rows={6}
                      readOnly
                      value={tierEditForm.featuresEn}
                    />
                  </label>
                </div>

                <div className="saasTierPagesSection">
                  <div className="saasTierPagesHeader">
                    <span>{isArabic ? "صفحات البرنامج" : "Application pages"}</span>
                    <p className="settingsFieldHint">
                      {isArabic
                        ? "فعّل أو أوقف الصفحات المتاحة لصيدليات هذه الباقة (بالإضافة لصلاحيات دور كل مستخدم)"
                        : "Enable or disable pages for pharmacies on this package (in addition to each user role)"}
                    </p>
                  </div>
                  <div className="saasTierPagesToolbar">
                    <button
                      type="button"
                      className="printBtn"
                      onClick={() =>
                        setTierEditForm((prev) =>
                          mergeTierEditAutoCopy({
                            ...prev,
                            enabledPages: [...TIER_CONFIGURABLE_PAGES],
                          }),
                        )
                      }
                    >
                      {isArabic ? "تفعيل الكل" : "Enable all"}
                    </button>
                    <button
                      type="button"
                      className="printBtn"
                      onClick={() =>
                        setTierEditForm((prev) =>
                          mergeTierEditAutoCopy({
                            ...prev,
                            enabledPages: ["dashboard"],
                          }),
                        )
                      }
                    >
                      {isArabic ? "لوحة التحكم فقط" : "Dashboard only"}
                    </button>
                  </div>
                  <div className="saasTierPagesGrid">
                    {TIER_CONFIGURABLE_PAGES.map((page) => {
                      const checked = tierEditForm.enabledPages.includes(page);
                      const locked = page === "dashboard";
                      return (
                        <label
                          key={page}
                          className={`saasTierPageToggle ${checked ? "is-on" : ""} ${locked ? "is-locked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => {
                              if (locked) return;
                                setTierEditForm((prev) => {
                                  const has = prev.enabledPages.includes(page);
                                  const next = has
                                    ? prev.enabledPages.filter((entry) => entry !== page)
                                    : [...prev.enabledPages, page];
                                  return mergeTierEditAutoCopy({
                                    ...prev,
                                    enabledPages: sanitizeTierEnabledPagesSelection(next),
                                  });
                                });
                            }}
                          />
                          <span className="saasTierPageToggleLabel">{getTierPageLabel(page, isArabic)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="saasTierPagesSection">
                  <div className="saasTierPagesHeader">
                    <span>{isArabic ? "الميزات الخاصة" : "Special features"}</span>
                    <p className="settingsFieldHint">
                      {isArabic
                        ? "تبويبات وإجراءات داخل الصفحات (نقل الفروع، HR مركزي، إلخ) — تُتحكم بها بشكل مستقل عن صفحات القائمة"
                        : "In-page tabs and actions (branch transfers, central HR, etc.) — controlled separately from sidebar pages"}
                    </p>
                  </div>
                  <div className="saasTierPagesGrid">
                    {TIER_CONFIGURABLE_FEATURES.map((feature) => {
                      const checked = tierEditForm.allowedFeatures.includes(feature.key);
                      return (
                        <label
                          key={feature.key}
                          className={`saasTierPageToggle ${checked ? "is-on" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setTierEditForm((prev) => {
                                const has = prev.allowedFeatures.includes(feature.key);
                                const next = has
                                  ? prev.allowedFeatures.filter((entry) => entry !== feature.key)
                                  : [...prev.allowedFeatures, feature.key];
                                return {
                                  ...prev,
                                  allowedFeatures: sanitizeTierAllowedFeaturesSelection(next),
                                };
                              })
                            }
                          />
                          <span className="saasTierPageToggleLabel">
                            {isArabic ? feature.labelAr : feature.labelEn}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="saasModalActions">
                  <button type="button" className="printBtn" disabled={savingTierConfig} onClick={closeTierEditModal}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={savingTierConfig}
                    onClick={() => void submitTierEdit()}
                  >
                    {savingTierConfig ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "حفظ الباقة" : "Save package"}
                  </button>
                </div>
              </div>
            </div>
  );
}
