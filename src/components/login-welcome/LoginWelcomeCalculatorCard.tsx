import type {
  PricingCalculatorConfig,
  PricingCalculatorQuote,
} from "../../config/pricingCalculator";
import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import { formatMonthlyPrice } from "./programPages";

type LoginWelcomeCalculatorCardProps = {
  isArabic: boolean;
  config: PricingCalculatorConfig;
  branches: number;
  users: number;
  staffAddon: boolean;
  quote: PricingCalculatorQuote;
  onBranchesChange: (value: number) => void;
  onUsersChange: (value: number) => void;
  onStaffAddonChange: (value: boolean) => void;
};

export default function LoginWelcomeCalculatorCard({
  isArabic,
  config,
  branches,
  users,
  staffAddon,
  quote,
  onBranchesChange,
  onUsersChange,
  onStaffAddonChange,
}: LoginWelcomeCalculatorCardProps) {
  return (
    <section className="loginWelcomeCalculator" aria-label={isArabic ? "حاسبة الباقة" : "Plan calculator"}>
      <div className="loginWelcomePlansHeader">
        <h2>{isArabic ? "حاسبة الباقة" : "Plan calculator"}</h2>
        <p>
          {isArabic
            ? "الأسعار يحددها مالك النظام من تبويب الباقات — الرقم يتحدث مباشرة."
            : "Prices are set by the system owner in Packages — totals update live."}
        </p>
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
                ? `${config.pricePerBranch.toLocaleString("ar-EG")} ج.م لكل فرع`
                : `${config.pricePerBranch.toLocaleString("en-EG")} EGP per branch`}
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
                ? `${config.pricePerUser.toLocaleString("ar-EG")} ج.م لكل مستخدم`
                : `${config.pricePerUser.toLocaleString("en-EG")} EGP per user`}
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
      </div>

      <div className="loginWelcomeCalcTotal">
        <div>
          <span>{isArabic ? "الإجمالي الشهري" : "Monthly total"}</span>
          <strong>{formatMonthlyPrice(quote.monthlyPrice, isArabic)}</strong>
        </div>
        <p>
          {isArabic
            ? `${quote.branches} فروع · ${quote.users} مستخدم${quote.staffAddon ? " · موظفين" : ""} · تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم`
            : `${quote.branches} branches · ${quote.users} users${quote.staffAddon ? " · staff" : ""} · ${TRIAL_SUBSCRIPTION_DAYS}-day trial`}
        </p>
      </div>
    </section>
  );
}
