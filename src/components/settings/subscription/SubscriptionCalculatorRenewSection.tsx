import type { SubscriptionRequest } from "../../../types";
import type { SubscriptionTier } from "../../../config/subscriptionTiers";
import type { SubscriptionLimitChange } from "../../../utils/subscriptionLimitChange";
import type { BillingView } from "./types";
import SubscriptionPackageActions from "./SubscriptionPackageActions";
import SubscriptionPackageEditForm from "./SubscriptionPackageEditForm";
import SubscriptionPagesAccessList from "./SubscriptionPagesAccessList";
import { useSubscriptionCalculatorState } from "./useSubscriptionCalculatorState";

type Props = {
  isArabic: boolean;
  isOrgAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
  staffAddon?: boolean;
  customersAddon?: boolean;
  investmentAddon?: boolean;
  pendingRenewal?: SubscriptionRequest;
  pendingLimitChange?: SubscriptionRequest;
  pendingRequest?: SubscriptionRequest;
  submittingRequest: boolean;
  onSubmitRenewal: (billingView: BillingView, amount: number) => void;
  onSubmitLimitChange: (change: SubscriptionLimitChange, amount: number) => void;
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

export default function SubscriptionCalculatorRenewSection({
  isArabic,
  isOrgAdmin,
  subscriptionTier,
  maxBranches,
  maxUsers,
  staffAddon = false,
  customersAddon = false,
  investmentAddon = false,
  pendingRenewal,
  pendingLimitChange,
  pendingRequest,
  submittingRequest,
  onSubmitRenewal,
  onSubmitLimitChange,
  onShowPaymentInfo,
}: Props) {
  const state = useSubscriptionCalculatorState({
    isArabic,
    subscriptionTier,
    maxBranches,
    maxUsers,
    staffAddon,
    customersAddon,
    investmentAddon,
  });

  const draftChange: SubscriptionLimitChange = {
    branches: state.draftBranches,
    users: state.draftUsers,
    staffAddon: state.draftStaffAddon,
    customersAddon: state.draftCustomersAddon,
    investmentAddon: state.draftInvestmentAddon,
  };

  return (
    <section className="subscriptionCompareSection subscriptionCalculatorRenew">
      <div className="subscriptionCompareIntro">
        <h3>{isArabic ? "تجديد وتعديل الباقة" : "Renew & edit package"}</h3>
        <p>
          {isArabic
            ? "حدودك الحالية والصفحات المشتركة. تقدر تعدّل الباقة ويُعتمد الطلب من مالك النظام أولاً."
            : "Your current limits and included pages. You can edit the package; the system owner must approve first."}
        </p>
      </div>

      <div
        className="subscriptionBillingToggle"
        role="tablist"
        aria-label={isArabic ? "دورة الفوترة" : "Billing cycle"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={state.billingCycle === "monthly"}
          className={state.billingCycle === "monthly" ? "active" : ""}
          onClick={() => state.setBillingCycle("monthly")}
        >
          {isArabic ? "الاشتراك الشهري" : "Monthly billing"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.billingCycle === "yearly"}
          className={state.billingCycle === "yearly" ? "active" : ""}
          onClick={() => state.setBillingCycle("yearly")}
        >
          {isArabic
            ? `الاشتراك السنوي (وفر ${state.yearlyDiscountPct}%)`
            : `Annual billing (save ${state.yearlyDiscountPct}%)`}
        </button>
      </div>

      <article className="subscriptionCompareCard current subscriptionCalculatorCard">
        <span className="subscriptionCompareBadge current">
          {isArabic ? "حدودك الحالية" : "Your current limits"}
        </span>

        <div className="subscriptionCompareCardHead">
          <h4>{isArabic ? "حاسبة الاشتراك" : "Subscription calculator"}</h4>
          <div className="subscriptionComparePrice">
            <strong>{state.billedAmount.toLocaleString(isArabic ? "ar-EG" : "en-US")}</strong>
            <span>
              {state.currency}
              {state.billingCycle === "monthly"
                ? isArabic
                  ? " / شهر"
                  : " / month"
                : isArabic
                  ? " / سنة"
                  : " / year"}
            </span>
          </div>
          {state.billingCycle === "yearly" ? (
            <p className="subscriptionCompareEquivalent">
              {isArabic
                ? `≈ ${state.yearlyMonthlyEquivalent.toLocaleString("ar-EG")} ${state.currency} / شهر بعد خصم ${state.yearlyDiscountPct}%`
                : `≈ ${state.yearlyMonthlyEquivalent.toLocaleString("en-US")} ${state.currency} / month after ${state.yearlyDiscountPct}% off`}
            </p>
          ) : (
            <p className="subscriptionCompareEquivalent">
              {isArabic
                ? `الأساس الشهري: ${state.quote.monthlyPrice.toLocaleString("ar-EG")} ${state.currency}`
                : `Monthly base: ${state.quote.monthlyPrice.toLocaleString("en-US")} ${state.currency}`}
            </p>
          )}
        </div>

        <div className="subscriptionCompareCardBody">
          {state.editingPackage && isOrgAdmin ? (
            <SubscriptionPackageEditForm
              isArabic={isArabic}
              config={state.config}
              draftBranches={state.draftBranches}
              draftUsers={state.draftUsers}
              draftStaffAddon={state.draftStaffAddon}
              draftCustomersAddon={state.draftCustomersAddon}
              draftInvestmentAddon={state.draftInvestmentAddon}
              onBranchesChange={state.setDraftBranches}
              onUsersChange={state.setDraftUsers}
              onStaffAddonChange={state.setDraftStaffAddon}
              onCustomersAddonChange={state.setDraftCustomersAddon}
              onInvestmentAddonChange={state.setDraftInvestmentAddon}
            />
          ) : (
            <ul className="subscriptionCompareFeatureList">
              <li>
                {isArabic
                  ? `${state.quote.branches} فرع × ${state.config.pricePerBranch.toLocaleString("ar-EG")} ج.م`
                  : `${state.quote.branches} branches × ${state.config.pricePerBranch.toLocaleString("en-US")} EGP`}
              </li>
              <li>
                {isArabic
                  ? `${state.quote.users} مستخدم × ${state.config.pricePerUser.toLocaleString("ar-EG")} ج.م`
                  : `${state.quote.users} users × ${state.config.pricePerUser.toLocaleString("en-US")} EGP`}
              </li>
              {state.quote.staffAddon ? (
                <li>
                  {isArabic
                    ? `إضافة الموظفين: +${state.config.staffAddonPrice.toLocaleString("ar-EG")} ج.م`
                    : `Staff add-on: +${state.config.staffAddonPrice.toLocaleString("en-US")} EGP`}
                </li>
              ) : null}
              {state.quote.customersAddon ? (
                <li>
                  {isArabic
                    ? `إضافة العملاء: +${state.config.customersAddonPrice.toLocaleString("ar-EG")} ج.م`
                    : `Customers add-on: +${state.config.customersAddonPrice.toLocaleString("en-US")} EGP`}
                </li>
              ) : null}
              {state.quote.investmentAddon ? (
                <li>
                  {isArabic
                    ? `إضافة الاستثمار: +${state.config.investmentAddonPrice.toLocaleString("ar-EG")} ج.م`
                    : `Investment add-on: +${state.config.investmentAddonPrice.toLocaleString("en-US")} EGP`}
                </li>
              ) : null}
              {state.billingCycle === "yearly" ? (
                <li>
                  {isArabic
                    ? `خصم سنوي ${state.yearlyDiscountPct}% بدل الدفع الشهري 12 شهر`
                    : `${state.yearlyDiscountPct}% yearly discount vs paying monthly for 12 months`}
                </li>
              ) : null}
            </ul>
          )}

          <SubscriptionPagesAccessList isArabic={isArabic} rows={state.pageRows} />
        </div>

        {isOrgAdmin ? (
          <SubscriptionPackageActions
            isArabic={isArabic}
            currency={state.currency}
            billingCycle={state.billingCycle}
            billedAmount={state.billedAmount}
            editingPackage={state.editingPackage}
            packageChanged={state.packageChanged}
            submittingRequest={submittingRequest}
            pendingRequest={pendingRequest}
            pendingRenewal={pendingRenewal}
            pendingLimitChange={pendingLimitChange}
            onStartEdit={state.startEditingPackage}
            onCancelEdit={state.cancelEditingPackage}
            onSubmitRenewal={() => onSubmitRenewal(state.billingCycle, state.billedAmount)}
            onSubmitLimitChange={() => onSubmitLimitChange(draftChange, state.billedAmount)}
            onShowPaymentInfo={onShowPaymentInfo}
          />
        ) : (
          <p className="subscriptionCompareHint">
            {isArabic
              ? "تواصل مع مدير الصيدلية لتجديد أو تعديل الاشتراك"
              : "Contact your pharmacy admin to renew or edit the package"}
          </p>
        )}
      </article>
    </section>
  );
}
