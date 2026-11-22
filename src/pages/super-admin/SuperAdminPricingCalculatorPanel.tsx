import type { PricingCalculatorConfig } from "../../config/pricingCalculator";

type Props = {
  isArabic: boolean;
  form: PricingCalculatorConfig;
  saving: boolean;
  onChange: (next: PricingCalculatorConfig) => void;
  onSave: () => void;
};

export default function SuperAdminPricingCalculatorPanel({
  isArabic,
  form,
  saving,
  onChange,
  onSave,
}: Props) {
  return (
    <section className="saasPricingCalculator settingsTabPanel">
      <div className="saasPageHeader">
        <div>
          <h3>{isArabic ? "تسعير حاسبة الباقة" : "Plan calculator pricing"}</h3>
          <p className="pageHint">
            {isArabic
              ? "هنا بتحدد سعر الفرع والمستخدم وإضافة الموظفين — الأرقام تظهر فورًا في صفحة الترحيب"
              : "Set branch, user, and staff add-on prices — values appear immediately on the landing calculator"}
          </p>
        </div>
        <button type="button" className="editBtn" disabled={saving} onClick={onSave}>
          {saving
            ? isArabic
              ? "جاري الحفظ..."
              : "Saving..."
            : isArabic
              ? "حفظ أسعار الحاسبة"
              : "Save calculator prices"}
        </button>
      </div>

      <div className="formGrid saasFormGrid">
        <label className="saasField">
          <span>{isArabic ? "سعر الفرع (شهري — ج.م)" : "Branch price (monthly — EGP)"}</span>
          <input
            type="number"
            min={0}
            value={form.pricePerBranch}
            onChange={(e) => onChange({ ...form, pricePerBranch: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="saasField">
          <span>{isArabic ? "سعر المستخدم (شهري — ج.م)" : "User price (monthly — EGP)"}</span>
          <input
            type="number"
            min={0}
            value={form.pricePerUser}
            onChange={(e) => onChange({ ...form, pricePerUser: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="saasPricingAddonBlock">
        <label className="saasTierPageToggle">
          <input
            type="checkbox"
            checked={form.staffAddonEnabled}
            onChange={(e) => onChange({ ...form, staffAddonEnabled: e.target.checked })}
          />
          <span>{isArabic ? "تفعيل إضافة الموظفين في الحاسبة" : "Enable staff add-on in calculator"}</span>
        </label>

        <div className="formGrid saasFormGrid">
          <label className="saasField">
            <span>{isArabic ? "سعر إضافة الموظفين" : "Staff add-on price"}</span>
            <input
              type="number"
              min={0}
              disabled={!form.staffAddonEnabled}
              value={form.staffAddonPrice}
              onChange={(e) => onChange({ ...form, staffAddonPrice: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="saasField">
            <span>{isArabic ? "عنوان الإضافة (عربي)" : "Add-on title (Arabic)"}</span>
            <input
              disabled={!form.staffAddonEnabled}
              value={form.staffAddonTitleAr}
              onChange={(e) => onChange({ ...form, staffAddonTitleAr: e.target.value })}
            />
          </label>
          <label className="saasField">
            <span>{isArabic ? "عنوان الإضافة (إنجليزي)" : "Add-on title (English)"}</span>
            <input
              disabled={!form.staffAddonEnabled}
              value={form.staffAddonTitleEn}
              onChange={(e) => onChange({ ...form, staffAddonTitleEn: e.target.value })}
            />
          </label>
          <label className="saasField saasFieldFull">
            <span>{isArabic ? "شرح مبسّط (عربي)" : "Simple description (Arabic)"}</span>
            <textarea
              rows={2}
              disabled={!form.staffAddonEnabled}
              value={form.staffAddonDescAr}
              onChange={(e) => onChange({ ...form, staffAddonDescAr: e.target.value })}
            />
          </label>
          <label className="saasField saasFieldFull">
            <span>{isArabic ? "شرح مبسّط (إنجليزي)" : "Simple description (English)"}</span>
            <textarea
              rows={2}
              disabled={!form.staffAddonEnabled}
              value={form.staffAddonDescEn}
              onChange={(e) => onChange({ ...form, staffAddonDescEn: e.target.value })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
