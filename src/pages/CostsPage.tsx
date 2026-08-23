import { formatPlanMonthLabel } from "../utils/investmentAnalysis";
import CostPlanModal from "./costs/CostPlanModal";
import InvestmentPlanTable from "./costs/InvestmentPlanTable";
import InvestmentSummaryGrid from "./costs/InvestmentSummaryGrid";
import InvestmentVerdict from "./costs/InvestmentVerdict";
import type { CostsPageProps } from "./costs/types";
import { useCostsPageState } from "./costs/useCostsPageState";

export type { CostsPageProps } from "./costs/types";

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
  const state = useCostsPageState({
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
  });

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
              onClick={() => void state.handleApplyYearPlan()}
              disabled={
                isSubscriptionExpired || state.loadingPlans || state.applyingYearPlan
              }
            >
              {state.applyingYearPlan
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
              onClick={state.openAddPlanModal}
              disabled={isSubscriptionExpired || state.loadingPlans}
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
            value={state.planMonth}
            onChange={(e) => state.setPlanMonth(e.target.value)}
          />
        </label>
        <span className="investmentMonthLabel">
          {formatPlanMonthLabel(state.planMonth, isArabic)}
        </span>
      </div>

      <InvestmentVerdict isArabic={isArabic} currency={currency} analysis={state.analysis} />

      <InvestmentSummaryGrid
        isArabic={isArabic}
        currency={currency}
        analysis={state.analysis}
        monthCostsCount={state.monthCosts.length}
      />

      <InvestmentPlanTable
        isArabic={isArabic}
        t={t}
        currency={currency}
        loadingPlans={state.loadingPlans}
        planRows={state.planRows}
        plans={state.plans}
        analysis={state.analysis}
        canManageCosts={canManageCosts}
        isSubscriptionExpired={isSubscriptionExpired}
        saving={state.saving}
        deletingId={state.deletingId}
        savingActualRowId={state.savingActualRowId}
        getActualDraftValue={state.getActualDraftValue}
        setActualDraftValue={state.setActualDraftValue}
        onSaveActualRow={state.handleSaveActualRow}
        onEditPlan={state.openEditPlanModal}
        onDeletePlan={state.handleDeletePlan}
        onExportCSV={state.exportPlanCSV}
      />

      {state.showPlanModal && (
        <CostPlanModal
          isArabic={isArabic}
          t={t}
          planMonth={state.planMonth}
          editingPlan={state.editingPlan}
          planForm={state.planForm}
          setPlanForm={state.setPlanForm}
          saving={state.saving}
          isSubscriptionExpired={isSubscriptionExpired}
          onClose={state.closePlanModal}
          onSave={state.handleSavePlan}
        />
      )}
    </RootTag>
  );
}
