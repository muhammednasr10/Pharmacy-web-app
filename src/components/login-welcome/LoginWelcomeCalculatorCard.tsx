import type {
  PricingBillingCycle,
  PricingCalculatorConfig,
  PricingCalculatorQuote,
} from "../../config/pricingCalculator";
import {
  getQuoteBillingAmount,
  getYearlyDiscountPercent,
} from "../../config/pricingCalculator";
import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import { formatBillingPrice, formatMonthlyPrice } from "./programPages";

type LoginWelcomeCalculatorCardProps = {
  isArabic: boolean;
  config: PricingCalculatorConfig;
  branches: number;
  users: number;
  staffAddon: boolean;
  customersAddon: boolean;
  billingCycle: PricingBillingCycle;
  quote: PricingCalculatorQuote;
  onBranchesChange: (value: number) => void;
  onUsersChange: (value: number) => void;
  onStaffAddonChange: (value: boolean) => void;
  onCustomersAddonChange: (value: boolean) => void;
  onBillingCycleChange: (value: PricingBillingCycle) => void;
};

export default function LoginWelcomeCalculatorCard({
  isArabic,
  config,
  branches,
  users,
  staffAddon,
  customersAddon,
  billingCycle,
  quote,
  onBranchesChange,
  onUsersChange,
  onStaffAddonChange,
  onCustomersAddonChange,
  onBillingCycleChange,
}: LoginWelcomeCalculatorCardProps) {
  const yearlyDiscountPct = getYearlyDiscountPercent();
  const billedAmount = getQuoteBillingAmount(quote.monthlyPrice, billingCycle);
  const yearlyMonthlyEquivalent =
    billingCycle === "yearly" ? Math.round(billedAmount / 12) : quote.monthlyPrice;

  const extrasLabel = [
    quote.staffAddon ? (isArabic ? "موظفين" : "staff") : null,
    quote.customersAddon ? (isArabic ? "عملاء" : "customers") : null,
  ]
    .filter(Boolean)
    .join(isArabic ? " · " : " · ");

  return (
    <section
      className="loginWelcomeCalculator"
      aria-label={isArabic ? "حاسبة الاشتراك" : "Subscription calculator"}
    >
      <div className="loginWelcomePlansHeader">
        <h2>{isArabic ? "حاسبة الاشتراك" : "Subscription calculator"}</h2>
        <p>
          {isArabic
            ? "حدّد عدد الفروع والمستخدمين والإضافات، واختار شهري أو سنوي — السعر يتحدث مباشرة."
            : "Set branches, users, and add-ons, choose monthly or yearly — the total updates live."}
        </p>
      </div>

      <div
        className="subscriptionBillingToggle loginWelcomeBillingToggle"
        role="tablist"
        aria-label={isArabic ? "دورة الفوترة" : "Billing cycle"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === "monthly"}
          className={billingCycle === "monthly" ? "active" : ""}
          onClick={() => onBillingCycleChange("monthly")}
        >
          {isArabic ? "الاشتراك الشهري" : "Monthly billing"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === "yearly"}
          className={billingCycle === "yearly" ? "active" : ""}
          onClick={() => onBillingCycleChange("yearly")}
        >
          {isArabic
            ? `الاشتراك السنوي (وفر ${yearlyDiscountPct}%)`
            : `Annual billing (save ${yearlyDiscountPct}%)`}
        </button>
      </div>

      <div className="loginWelcomeCalcGrid">
        <label className="loginWelcomeCalcField">
          <span>{isArabic ? "عدد الفروع" : "Branches"}</span>
          <div className="loginWelcomeCalcFieldControl">
            <input
              type="number"
              min={1}
              max={50}
              value={branches}
              onChange={(e) => onBranchesChange(Number(e.target.value) || 1)}
            />
            <small>
              {isArabic
                ? `${config.pricePerBranch.toLocaleString("ar-EG")} ج.م لكل فرع / شهر`
                : `${config.pricePerBranch.toLocaleString("en-EG")} EGP per branch / month`}
            </small>
          </div>
        </label>

        <label className="loginWelcomeCalcField">
          <span>{isArabic ? "عدد المستخدمين" : "Users"}</span>
          <div className="loginWelcomeCalcFieldControl">
            <input
              type="number"
              min={1}
              max={200}
              value={users}
              onChange={(e) => onUsersChange(Number(e.target.value) || 1)}
            />
            <small>
              {isArabic
                ? `${config.pricePerUser.toLocaleString("ar-EG")} ج.م لكل مستخدم / شهر`
                : `${config.pricePerUser.toLocaleString("en-EG")} EGP per user / month`}
            </small>
          </div>
        </label>

        {config.staffAddonEnabled ? (
          <label className={`loginWelcomeCalcAddon${staffAddon ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={staffAddon}
              onChange={(e) => onStaffAddonChange(e.target.checked)}
            />
            <span>
              <strong>{isArabic ? config.staffAddonTitleAr : config.staffAddonTitleEn}</strong>
              <em>{isArabic ? config.staffAddonDescAr : config.staffAddonDescEn}</em>
              <b>
                {isArabic
                  ? `+ ${config.staffAddonPrice.toLocaleString("ar-EG")} ج.م / شهر`
                  : `+ ${config.staffAddonPrice.toLocaleString("en-EG")} EGP / month`}
              </b>
            </span>
          </label>
        ) : null}

        {config.customersAddonEnabled ? (
          <label className={`loginWelcomeCalcAddon${customersAddon ? " is-on" : ""}`}>
            <input
              type="checkbox"
              checked={customersAddon}
              onChange={(e) => onCustomersAddonChange(e.target.checked)}
            />
            <span>
              <strong>
                {isArabic ? config.customersAddonTitleAr : config.customersAddonTitleEn}
              </strong>
              <em>{isArabic ? config.customersAddonDescAr : config.customersAddonDescEn}</em>
              <b>
                {isArabic
                  ? `+ ${config.customersAddonPrice.toLocaleString("ar-EG")} ج.م / شهر`
                  : `+ ${config.customersAddonPrice.toLocaleString("en-EG")} EGP / month`}
              </b>
            </span>
          </label>
        ) : null}
      </div>

      <div className="loginWelcomeCalcTotal">
        <div>
          <span>
            {billingCycle === "yearly"
              ? isArabic
                ? "الإجمالي السنوي"
                : "Yearly total"
              : isArabic
                ? "الإجمالي الشهري"
                : "Monthly total"}
          </span>
          <strong>{formatBillingPrice(billedAmount, billingCycle, isArabic)}</strong>
        </div>
        {billingCycle === "yearly" ? (
          <p>
            {isArabic
              ? `≈ ${formatMonthlyPrice(yearlyMonthlyEquivalent, isArabic)} بعد خصم ${yearlyDiscountPct}% · الأساس الشهري ${formatMonthlyPrice(quote.monthlyPrice, isArabic)}`
              : `≈ ${formatMonthlyPrice(yearlyMonthlyEquivalent, false)} after ${yearlyDiscountPct}% off · monthly base ${formatMonthlyPrice(quote.monthlyPrice, false)}`}
          </p>
        ) : (
          <p>
            {isArabic
              ? `${quote.branches} فروع · ${quote.users} مستخدم${extrasLabel ? ` · ${extrasLabel}` : ""} · تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم`
              : `${quote.branches} branches · ${quote.users} users${extrasLabel ? ` · ${extrasLabel}` : ""} · ${TRIAL_SUBSCRIPTION_DAYS}-day trial`}
          </p>
        )}
      </div>
    </section>
  );
}
