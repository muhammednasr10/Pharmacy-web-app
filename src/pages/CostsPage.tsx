import { useCallback, useEffect, useMemo, useState } from "react";
import type { Invoice, PharmacyCost, PharmacyCostPlan } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { COST_CATEGORIES } from "../utils/costCategories";
import {
  analyzeInvestment,
  buildInvestmentPlanRows,
  filterCostsForMonth,
  formatPlanMonthInput,
  formatPlanMonthLabel,
  getCategoryLabel,
  getPlanMonthBounds,
  getPlanYear,
  type InvestmentPlanRow,
} from "../utils/investmentAnalysis";

const emptyPlanForm = {
  title: "",
  category: "other",
  plannedAmount: 0,
  notes: "",
};

type CostsPageProps = {
  embedded?: boolean;
  costs: PharmacyCost[];
  invoices: Invoice[];
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  pharmacyId: string;
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
  userId?: string;
  userName?: string;
  onActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  safeNumber: (value: unknown) => number;
  downloadCSV: (filename: string, rows: string[][]) => void;
  onRefreshCosts: () => Promise<void>;
};

function formatVariance(value: number, currency: string) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)} ${currency}`;
}

function formatRatioPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return (value * 100).toFixed(1);
}

function rowDraftKey(row: InvestmentPlanRow) {
  return String(row.id);
}

export default function CostsPage({
  embedded = false,
  costs,
  invoices,
  isArabic,
  t,
  currency,
  pharmacyId,
  canManageCosts,
  isSubscriptionExpired,
  userId,
  userName,
  onActivityLog,
  safeNumber,
  downloadCSV,
  onRefreshCosts,
}: CostsPageProps) {
  const [planMonth, setPlanMonth] = useState(() => formatPlanMonthInput(new Date()));
  const [plans, setPlans] = useState<PharmacyCostPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PharmacyCostPlan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [applyingYearPlan, setApplyingYearPlan] = useState(false);
  const [actualDrafts, setActualDrafts] = useState<Record<string, string>>({});
  const [savingActualRowId, setSavingActualRowId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!pharmacyId || !planMonth) return;
    setLoadingPlans(true);
    try {
      let loaded = await pharmacyService.getPharmacyCostPlans(pharmacyId, planMonth);
      if (loaded.length === 0 && canManageCosts) {
        loaded = await pharmacyService.seedDefaultPharmacyCostPlans(
          pharmacyId,
          planMonth,
          [...COST_CATEGORIES],
          isArabic,
        );
      }
      setPlans(loaded);
    } catch (error) {
      console.error("Load cost plans error:", error);
    } finally {
      setLoadingPlans(false);
    }
  }, [pharmacyId, planMonth, canManageCosts, isArabic]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const monthCosts = useMemo(
    () => filterCostsForMonth(costs, planMonth),
    [costs, planMonth],
  );

  const planRows = useMemo(
    () => buildInvestmentPlanRows(plans, monthCosts),
    [plans, monthCosts],
  );

  const analysis = useMemo(
    () =>
      analyzeInvestment({
        planMonth,
        plans,
        costs,
        invoices,
        safeNumber,
      }),
    [planMonth, plans, costs, invoices, safeNumber],
  );

  useEffect(() => {
    setActualDrafts({});
  }, [planMonth, costs, plans]);

  function openAddPlanModal() {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
    setShowPlanModal(true);
  }

  function openEditPlanModal(plan: PharmacyCostPlan) {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title,
      category: plan.category || "other",
      plannedAmount: safeNumber(plan.plannedAmount),
      notes: plan.notes || "",
    });
    setShowPlanModal(true);
  }

  function closePlanModal() {
    if (saving) return;
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
  }

  async function handleApplyYearPlan() {
    if (!canManageCosts || isSubscriptionExpired || applyingYearPlan) return;

    const year = getPlanYear(planMonth);
    const hasTemplate = plans.length > 0;
    const confirmed = window.confirm(
      isArabic
        ? hasTemplate
          ? `نسخ خطة ${formatPlanMonthLabel(planMonth, true)} إلى كل شهور ${year} التي لا تحتوي خطة؟`
          : `إنشاء الخطة الافتراضية لكل شهور ${year}؟`
        : hasTemplate
          ? `Copy ${formatPlanMonthLabel(planMonth, false)} plan to empty months in ${year}?`
          : `Create default plan for all months in ${year}?`,
    );
    if (!confirmed) return;

    setApplyingYearPlan(true);
    try {
      const appliedMonths = await pharmacyService.applyPlanTemplateToYear(
        pharmacyId,
        year,
        plans,
        [...COST_CATEGORIES],
        isArabic,
        { fillEmptyOnly: true },
      );

      await onActivityLog({
        type: "cost_plan_year",
        title: isArabic ? "تطبيق خطة السنة" : "Year Plan Applied",
        description: isArabic
          ? `تم تطبيق الخطة على ${appliedMonths} شهر في ${year}`
          : `Applied plan to ${appliedMonths} months in ${year}`,
        referenceType: "cost_plan",
        referenceId: year,
      });

      await loadPlans();
      alert(
        isArabic
          ? appliedMonths > 0
            ? `تم تطبيق الخطة على ${appliedMonths} شهر`
            : "كل شهور السنة تحتوي بالفعل على خطة"
          : appliedMonths > 0
            ? `Plan applied to ${appliedMonths} month(s)`
            : "All months already have a plan",
      );
    } catch (error) {
      console.error("Apply year plan error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر تطبيق خطة السنة"
            : "Could not apply year plan",
      );
    } finally {
      setApplyingYearPlan(false);
    }
  }

  function getActualDraftValue(row: InvestmentPlanRow) {
    const key = rowDraftKey(row);
    if (Object.prototype.hasOwnProperty.call(actualDrafts, key)) {
      return actualDrafts[key];
    }
    return row.actual > 0 ? String(row.actual) : "";
  }

  async function handleSaveActualRow(row: InvestmentPlanRow) {
    if (!canManageCosts || isSubscriptionExpired) return;

    const key = rowDraftKey(row);
    const rawValue = actualDrafts[key] ?? (row.actual > 0 ? String(row.actual) : "");
    const amount = rawValue.trim() === "" ? 0 : Number(rawValue);

    if (Number.isNaN(amount) || amount < 0) {
      alert(isArabic ? "أدخل مبلغاً صحيحاً" : "Enter a valid amount");
      return;
    }

    if (amount === row.actual) return;

    setSavingActualRowId(key);
    try {
      const { from } = getPlanMonthBounds(planMonth);
      const monthIso = from.toISOString();

      if (amount <= 0) {
        if (row.costId) {
          await pharmacyService.deletePharmacyCost(row.costId);
        }
      } else if (row.costId) {
        await pharmacyService.updatePharmacyCost(row.costId, { amount });
      } else {
        const costId = Date.now();
        const record: PharmacyCost = {
          id: costId,
          costNumber: `COST-${costId}`,
          title: row.title,
          category: row.category,
          amount,
          paymentMethod: "cash",
          notes: "",
          pharmacyId,
          userId,
          userName,
          date: from.toLocaleDateString(),
          createdAt: monthIso,
        };
        await pharmacyService.savePharmacyCost(record);
      }

      await onRefreshCosts();
      setActualDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch (error) {
      console.error("Save actual row error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حفظ المصروف الفعلي"
            : "Could not save actual cost",
      );
    } finally {
      setSavingActualRowId(null);
    }
  }

  async function handleSavePlan() {
    if (!canManageCosts || isSubscriptionExpired || saving) return;

    if (!planForm.title.trim()) {
      alert(isArabic ? "أدخل عنوان بند الخطة" : "Enter a plan line title");
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      if (editingPlan) {
        await pharmacyService.updatePharmacyCostPlan(editingPlan.id, {
          title: planForm.title.trim(),
          category: planForm.category,
          plannedAmount: Number(planForm.plannedAmount),
          notes: planForm.notes.trim(),
        });

        await onActivityLog({
          type: "cost_plan_update",
          title: isArabic ? "تعديل خطة تكلفة" : "Cost Plan Updated",
          description: isArabic
            ? `تم تعديل بند ${planForm.title.trim()} للشهر ${formatPlanMonthLabel(planMonth, true)}`
            : `Updated plan line ${planForm.title.trim()} for ${formatPlanMonthLabel(planMonth, false)}`,
          referenceType: "cost_plan",
          referenceId: String(editingPlan.id),
        });
      } else {
        const planId = Date.now();
        const record: PharmacyCostPlan = {
          id: planId,
          pharmacyId,
          planMonth,
          category: planForm.category,
          title: planForm.title.trim(),
          plannedAmount: Number(planForm.plannedAmount),
          notes: planForm.notes.trim(),
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await pharmacyService.savePharmacyCostPlan(record);

        await onActivityLog({
          type: "cost_plan_create",
          title: isArabic ? "إضافة بند خطة" : "Plan Line Added",
          description: isArabic
            ? `تمت إضافة بند ${record.title} للشهر ${formatPlanMonthLabel(planMonth, true)}`
            : `Added plan line ${record.title} for ${formatPlanMonthLabel(planMonth, false)}`,
          referenceType: "cost_plan",
          referenceId: String(planId),
        });
      }

      await loadPlans();
      closePlanModal();
    } catch (error) {
      console.error("Save plan error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حفظ بند الخطة"
            : "Could not save plan line",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(plan: PharmacyCostPlan) {
    if (!canManageCosts || isSubscriptionExpired) return;

    const confirmed = window.confirm(
      isArabic ? `حذف بند "${plan.title}" من الخطة؟` : `Delete plan line "${plan.title}"?`,
    );
    if (!confirmed) return;

    setDeletingId(plan.id);
    try {
      await pharmacyService.deletePharmacyCostPlan(plan.id);
      await loadPlans();
    } catch (error) {
      console.error("Delete plan error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حذف بند الخطة"
            : "Could not delete plan line",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function exportPlanCSV() {
    const rows = [
      [
        isArabic ? "الشهر" : "Month",
        isArabic ? "العنوان" : "Title",
        isArabic ? "التصنيف" : "Category",
        isArabic ? "المخطط" : "Planned",
        isArabic ? "الفعلي" : "Actual",
        isArabic ? "الفرق" : "Variance",
      ],
      ...planRows.map((row) => [
        planMonth,
        row.title,
        getCategoryLabel(row.category, isArabic),
        row.planned.toFixed(2),
        row.actual.toFixed(2),
        row.variance.toFixed(2),
      ]),
      [
        isArabic ? "الإجمالي" : "Total",
        "",
        "",
        analysis.plannedTotal.toFixed(2),
        analysis.actualTotal.toFixed(2),
        (analysis.actualTotal - analysis.plannedTotal).toFixed(2),
      ],
    ];

    downloadCSV(`investment-plan-${planMonth}.csv`, rows);
  }

  const verdictLabel = isArabic ? analysis.verdictLabelAr : analysis.verdictLabelEn;
  const verdictHint = isArabic ? analysis.verdictHintAr : analysis.verdictHintEn;
  const RootTag = embedded ? "div" : "section";
  const rootClassName = embedded
    ? "reportsEmbeddedPanel costsPage investmentPage"
    : "card costsPage investmentPage";

  return (
    <RootTag className={rootClassName}>
      <div className={`cardHeader returnsPageActions ${embedded ? "reportsEmbeddedHeader" : ""}`}>
        <div>
          {!embedded && <h2>{isArabic ? "استثمارى" : "Investment"}</h2>}
          <p className="returnsSectionHint">
            {isArabic
              ? "خطة التكاليف المتوقعة مقابل المصروفات الفعلية ومقارنتها بالمبيعات والأرباح"
              : "Planned vs actual costs compared to sales and profit"}
          </p>
        </div>
        {canManageCosts && (
          <div className="returnsHeaderBtns">
            <button
              type="button"
              className="completeBtn"
              onClick={() => void handleApplyYearPlan()}
              disabled={isSubscriptionExpired || loadingPlans || applyingYearPlan}
            >
              {applyingYearPlan
                ? isArabic
                  ? "جاري التطبيق..."
                  : "Applying..."
                : isArabic
                  ? "الخطة الافتراضية لشهور السنة"
                  : "Default plan for year"}
            </button>
            <button
              type="button"
              className="completeBtn"
              onClick={openAddPlanModal}
              disabled={isSubscriptionExpired || loadingPlans}
            >
              {isArabic ? "+ بند خطة" : "+ Plan Line"}
            </button>
          </div>
        )}
      </div>

      <div className="investmentMonthBar">
        <label className="investmentMonthField">
          <span>{isArabic ? "شهر الخطة" : "Plan month"}</span>
          <input
            type="month"
            value={planMonth}
            onChange={(e) => setPlanMonth(e.target.value)}
          />
        </label>
        <span className="investmentMonthLabel">
          {formatPlanMonthLabel(planMonth, isArabic)}
        </span>
      </div>

      <div
        className={`investmentVerdict investmentVerdict--${analysis.verdict}`}
        role="status"
      >
        <div className="investmentVerdictMain">
          <strong>{verdictLabel}</strong>
          <p>{verdictHint}</p>
        </div>
        <div className="investmentVerdictStats">
          <span>
            {isArabic ? "نسبة التكلفة للمبيعات" : "Cost / sales"}:{" "}
            <strong>{formatRatioPercent(analysis.costToSalesRatio)}%</strong>
          </span>
          <span>
            {isArabic ? "صافي بعد التكاليف" : "Net after costs"}:{" "}
            <strong className={analysis.netAfterCosts >= 0 ? "positive" : "negative"}>
              {analysis.netAfterCosts.toFixed(2)} {currency}
            </strong>
          </span>
        </div>
      </div>

      <div className="costsSummaryGrid investmentSummaryGrid">
        <div className="costsSummaryCard">
          <span>{isArabic ? "مبيعات الشهر" : "Month sales"}</span>
          <strong className="investmentSales">
            {analysis.salesTotal.toFixed(2)} {currency}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "أرباح الشهر" : "Month profit"}</span>
          <strong className="investmentProfit">
            {analysis.profitTotal.toFixed(2)} {currency}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "التكلفة المخططة" : "Planned costs"}</span>
          <strong>{analysis.plannedTotal.toFixed(2)} {currency}</strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "التكلفة الفعلية" : "Actual costs"}</span>
          <strong className="investmentActual">
            {analysis.actualTotal.toFixed(2)} {currency}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "فرق الخطة" : "Plan variance"}</span>
          <strong
            className={
              analysis.actualTotal - analysis.plannedTotal > 0 ? "negative" : "positive"
            }
          >
            {formatVariance(analysis.actualTotal - analysis.plannedTotal, currency)}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "سجلات فعلية" : "Actual records"}</span>
          <strong>{monthCosts.length}</strong>
        </div>
      </div>

      <div className="cardHeader purchasesHistoryHeader">
        <h2>{isArabic ? "خطة التكاليف المتوقعة" : "Expected Cost Plan"}</h2>
        <button type="button" className="printBtn" onClick={exportPlanCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      {loadingPlans ? (
        <p className="empty">{isArabic ? "جاري تحميل الخطة..." : "Loading plan..."}</p>
      ) : planRows.length === 0 ? (
        <p className="empty">
          {isArabic
            ? "لا توجد بنود في خطة هذا الشهر — أضف بنداً أو انتظر إنشاء الخطة الافتراضية"
            : "No plan lines for this month"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التصنيف" : "Category"}</th>
                <th>{isArabic ? "المخطط" : "Planned"}</th>
                <th>{isArabic ? "الفعلي" : "Actual"}</th>
                <th>{isArabic ? "الفرق" : "Variance"}</th>
                {canManageCosts && <th>{t.action}</th>}
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.id} className={row.isOrphanActual ? "investmentOrphanRow" : ""}>
                  <td>
                    {row.title}
                    {row.isOrphanActual && (
                      <span className="investmentOrphanTag">
                        {isArabic ? "مصروف بدون خطة" : "Unplanned"}
                      </span>
                    )}
                  </td>
                  <td>{getCategoryLabel(row.category, isArabic)}</td>
                  <td>
                    {row.planned.toFixed(2)} {currency}
                  </td>
                  <td>
                    {canManageCosts && !isSubscriptionExpired ? (
                      <div className="investmentActualCell">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="investmentInlineInput"
                          value={getActualDraftValue(row)}
                          placeholder="0"
                          disabled={savingActualRowId === rowDraftKey(row)}
                          onChange={(e) =>
                            setActualDrafts((current) => ({
                              ...current,
                              [rowDraftKey(row)]: e.target.value,
                            }))
                          }
                          onBlur={() => void handleSaveActualRow(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        <span className="investmentInlineCurrency">{currency}</span>
                      </div>
                    ) : (
                      <>
                        {row.actual.toFixed(2)} {currency}
                      </>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        row.variance > 0
                          ? "investmentVariance investmentVariance--over"
                          : row.variance < 0
                            ? "investmentVariance investmentVariance--under"
                            : "investmentVariance"
                      }
                    >
                      {formatVariance(row.variance, currency)}
                    </span>
                  </td>
                  {canManageCosts && row.planId && (
                    <td>
                      <div className="actionButtons purchaseRowActions">
                        <button
                          type="button"
                          className="editBtn"
                          disabled={isSubscriptionExpired || saving}
                          onClick={() => {
                            const plan = plans.find((item) => item.id === row.planId);
                            if (plan) openEditPlanModal(plan);
                          }}
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={isSubscriptionExpired || deletingId === row.planId}
                          onClick={() => {
                            const plan = plans.find((item) => item.id === row.planId);
                            if (plan) void handleDeletePlan(plan);
                          }}
                        >
                          {deletingId === row.planId ? "..." : t.delete}
                        </button>
                      </div>
                    </td>
                  )}
                  {canManageCosts && !row.planId && <td>-</td>}
                </tr>
              ))}
              <tr className="investmentTotalsRow">
                <td colSpan={2}>
                  <strong>{isArabic ? "الإجمالي" : "Total"}</strong>
                </td>
                <td>
                  <strong>
                    {analysis.plannedTotal.toFixed(2)} {currency}
                  </strong>
                </td>
                <td>
                  <strong>
                    {analysis.actualTotal.toFixed(2)} {currency}
                  </strong>
                </td>
                <td>
                  <strong
                    className={
                      analysis.actualTotal - analysis.plannedTotal > 0 ? "negative" : "positive"
                    }
                  >
                    {formatVariance(analysis.actualTotal - analysis.plannedTotal, currency)}
                  </strong>
                </td>
                {canManageCosts && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showPlanModal && (
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
                <p className="returnsSectionHint">
                  {formatPlanMonthLabel(planMonth, isArabic)}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={closePlanModal}>
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
                onClick={() => void handleSavePlan()}
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
              <button type="button" className="completeBtn" onClick={closePlanModal} disabled={saving}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </RootTag>
  );
}
