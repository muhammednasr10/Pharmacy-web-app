import { COST_CATEGORIES } from "../../utils/costCategories";
import { formatPlanMonthLabel } from "../../utils/investmentAnalysis";
import type { CostPlanFormState } from "./types";
import type { PharmacyCostPlan } from "../../types";

type CostPlanModalProps = {
  isArabic: boolean;
  t: Record<string, string>;
  planMonth: string;
  editingPlan: PharmacyCostPlan | null;
  planForm: CostPlanFormState;
  setPlanForm: (form: CostPlanFormState) => void;
  saving: boolean;
  isSubscriptionExpired: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function CostPlanModal({
  isArabic,
  t,
  planMonth,
  editingPlan,
  planForm,
  setPlanForm,
  saving,
  isSubscriptionExpired,
  onClose,
  onSave,
}: CostPlanModalProps) {
  return (
    <div className="modalOverlay">
      <div className="invoiceModal costModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>
              {editingPlan
                ? isArabic
                  ? "تعديل بند الخطة"
                  : "Edit Plan Line"
                : isArabic
                  ? "إضافة بند للخطة"
                  : "Add Plan Line"}
            </h2>
            <p className="returnsSectionHint">{formatPlanMonthLabel(planMonth, isArabic)}</p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="purchaseMetaGrid">
          <div className="purchaseMetaField purchaseMetaFieldWide">
            <label>{isArabic ? "عنوان البند" : "Line title"}</label>
            <input
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              placeholder={isArabic ? "مثال: إيجار المحل" : "e.g. Shop rent"}
              disabled={saving}
            />
          </div>
          <div className="purchaseMetaField">
            <label>{isArabic ? "التصنيف" : "Category"}</label>
            <select
              value={planForm.category}
              onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
              disabled={saving}
            >
              {COST_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {isArabic ? category.ar : category.en}
                </option>
              ))}
            </select>
          </div>
          <div className="purchaseMetaField">
            <label>{isArabic ? "المبلغ المخطط" : "Planned amount"}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={planForm.plannedAmount || ""}
              onChange={(e) =>
                setPlanForm({
                  ...planForm,
                  plannedAmount: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              disabled={saving}
            />
          </div>
          <div className="purchaseMetaField purchaseMetaFieldWide">
            <label>{isArabic ? "ملاحظات" : "Notes"}</label>
            <input
              value={planForm.notes}
              onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              placeholder={isArabic ? "ملاحظات اختيارية" : "Optional notes"}
              disabled={saving}
            />
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className="addMedicineBtn"
            onClick={() => void onSave()}
            disabled={isSubscriptionExpired || saving}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ البند"
                : "Save Line"}
          </button>
          <button type="button" className="completeBtn" onClick={onClose} disabled={saving}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
