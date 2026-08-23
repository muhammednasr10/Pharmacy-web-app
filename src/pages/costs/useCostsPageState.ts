import { useCallback, useEffect, useMemo, useState } from "react";
import type { PharmacyCost, PharmacyCostPlan } from "../../types";
import * as pharmacyService from "../../services/pharmacyService";
import { COST_CATEGORIES } from "../../utils/costCategories";
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
} from "../../utils/investmentAnalysis";
import { emptyPlanForm, type CostsPageProps } from "./types";
import { rowDraftKey } from "./costsFormatters";

type UseCostsPageStateArgs = Pick<
  CostsPageProps,
  | "costs"
  | "invoices"
  | "isArabic"
  | "pharmacyId"
  | "canManageCosts"
  | "isSubscriptionExpired"
  | "userId"
  | "userName"
  | "onActivityLog"
  | "safeNumber"
  | "downloadCSV"
  | "onRefreshCosts"
>;

export function useCostsPageState({
  costs,
  invoices,
  isArabic,
  pharmacyId,
  canManageCosts,
  isSubscriptionExpired,
  userId,
  userName,
  onActivityLog,
  safeNumber,
  downloadCSV,
  onRefreshCosts,
}: UseCostsPageStateArgs) {
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

  function setActualDraftValue(row: InvestmentPlanRow, value: string) {
    setActualDrafts((current) => ({
      ...current,
      [rowDraftKey(row)]: value,
    }));
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

  return {
    planMonth,
    setPlanMonth,
    plans,
    loadingPlans,
    showPlanModal,
    editingPlan,
    planForm,
    setPlanForm,
    saving,
    deletingId,
    applyingYearPlan,
    savingActualRowId,
    monthCosts,
    planRows,
    analysis,
    openAddPlanModal,
    openEditPlanModal,
    closePlanModal,
    handleApplyYearPlan,
    getActualDraftValue,
    setActualDraftValue,
    handleSaveActualRow,
    handleSavePlan,
    handleDeletePlan,
    exportPlanCSV,
  };
}
