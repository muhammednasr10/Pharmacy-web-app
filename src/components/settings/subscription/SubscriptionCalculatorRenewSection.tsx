import { useEffect, useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  computePricingQuote,
  getQuoteBillingAmount,
  getYearlyDiscountPercent,
  type PricingBillingCycle,
  type PricingCalculatorConfig,
} from "../../../config/pricingCalculator";
import { subscriptionPaymentInfo } from "../../../config/subscription";
import * as pharmacyService from "../../../services/pharmacyService";
import type { BillingView } from "./types";

type Props = {
  isArabic: boolean;
  isOrgAdmin: boolean;
  maxBranches: number;
  maxUsers: number;
  staffAddon?: boolean;
  customersAddon?: boolean;
  pendingRenewal?: SubscriptionRequest;
  pendingRequest?: SubscriptionRequest;
  submittingRequest: boolean;
  onSubmitRenewal: (billingView: BillingView, amount: number) => void;
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

export default function SubscriptionCalculatorRenewSection({
  isArabic,
  isOrgAdmin,
  maxBranches,
  maxUsers,
  staffAddon = false,
  customersAddon = false,
  pendingRenewal,
  pendingRequest,
  submittingRequest,
  onSubmitRenewal,
  onShowPaymentInfo,
}: Props) {
  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CALCULATOR_CONFIG);
  const [billingCycle, setBillingCycle] = useState<PricingBillingCycle>("monthly");
  const yearlyDiscountPct = getYearlyDiscountPercent();
  const currency = subscriptionPaymentInfo.currency;

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .loadPricingCalculatorConfig()
      .then((row) => {
        if (!cancelled) setConfig(row);
      })
      .catch(() => {
        if (!cancelled) setConfig(DEFAULT_PRICING_CALCULATOR_CONFIG);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo(
    () =>
      computePricingQuote(config, {
        branches: maxBranches,
        users: maxUsers,
        staffAddon: Boolean(config.staffAddonEnabled && staffAddon),
        customersAddon: Boolean(config.customersAddonEnabled && customersAddon),
        billingCycle,
      }),
    [config, maxBranches, maxUsers, staffAddon, customersAddon, billingCycle],
  );

  const billedAmount = getQuoteBillingAmount(quote.monthlyPrice, billingCycle);
  const yearlyMonthlyEquivalent =
    billingCycle === "yearly" ? Math.round(billedAmount / 12) : quote.monthlyPrice;

  return (
    <section className="subscriptionCompareSection subscriptionCalculatorRenew">
      <div className="subscriptionCompareIntro">
        <h3>{isArabic ? "تجديد الاشتراك" : "Renew subscription"}</h3>
        <p>
          {isArabic
            ? "السعر محسوم من حدود الصيدلية الحالية (فروع ومستخدمين) عبر حاسبة الاشتراك"
            : "Price is calculated from your current branch and user limits via the subscription calculator"}
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
          aria-selected={billingCycle === "monthly"}
          className={billingCycle === "monthly" ? "active" : ""}
          onClick={() => setBillingCycle("monthly")}
        >
          {isArabic ? "الاشتراك الشهري" : "Monthly billing"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billingCycle === "yearly"}
          className={billingCycle === "yearly" ? "active" : ""}
          onClick={() => setBillingCycle("yearly")}
        >
          {isArabic
            ? `الاشتراك السنوي (وفر ${yearlyDiscountPct}%)`
            : `Annual billing (save ${yearlyDiscountPct}%)`}
        </button>
      </div>

      <article className="subscriptionCompareCard current subscriptionCalculatorCard">
        <span className="subscriptionCompareBadge current">
          {isArabic ? "حدودك الحالية" : "Your current limits"}
        </span>

        <div className="subscriptionCompareCardHead">
          <h4>{isArabic ? "حاسبة الاشتراك" : "Subscription calculator"}</h4>
          <div className="subscriptionComparePrice">
            <strong>{billedAmount.toLocaleString(isArabic ? "ar-EG" : "en-US")}</strong>
            <span>
              {currency}
              {billingCycle === "monthly"
                ? isArabic
                  ? " / شهر"
                  : " / month"
                : isArabic
                  ? " / سنة"
                  : " / year"}
            </span>
          </div>
          {billingCycle === "yearly" ? (
            <p className="subscriptionCompareEquivalent">
              {isArabic
                ? `≈ ${yearlyMonthlyEquivalent.toLocaleString("ar-EG")} ${currency} / شهر بعد خصم ${yearlyDiscountPct}%`
                : `≈ ${yearlyMonthlyEquivalent.toLocaleString("en-US")} ${currency} / month after ${yearlyDiscountPct}% off`}
            </p>
          ) : (
            <p className="subscriptionCompareEquivalent">
              {isArabic
                ? `الأساس الشهري: ${quote.monthlyPrice.toLocaleString("ar-EG")} ${currency}`
                : `Monthly base: ${quote.monthlyPrice.toLocaleString("en-US")} ${currency}`}
            </p>
          )}
        </div>

        <div className="subscriptionCompareCardBody">
          <ul className="subscriptionCompareFeatureList">
            <li>
              {isArabic
                ? `${quote.branches} فرع × ${config.pricePerBranch.toLocaleString("ar-EG")} ج.م`
                : `${quote.branches} branches × ${config.pricePerBranch.toLocaleString("en-US")} EGP`}
            </li>
            <li>
              {isArabic
                ? `${quote.users} مستخدم × ${config.pricePerUser.toLocaleString("ar-EG")} ج.م`
                : `${quote.users} users × ${config.pricePerUser.toLocaleString("en-US")} EGP`}
            </li>
            {quote.staffAddon ? (
              <li>
                {isArabic
                  ? `إضافة الموظفين: +${config.staffAddonPrice.toLocaleString("ar-EG")} ج.م`
                  : `Staff add-on: +${config.staffAddonPrice.toLocaleString("en-US")} EGP`}
              </li>
            ) : null}
            {quote.customersAddon ? (
              <li>
                {isArabic
                  ? `إضافة العملاء: +${config.customersAddonPrice.toLocaleString("ar-EG")} ج.م`
                  : `Customers add-on: +${config.customersAddonPrice.toLocaleString("en-US")} EGP`}
              </li>
            ) : null}
            {billingCycle === "yearly" ? (
              <li>
                {isArabic
                  ? `خصم سنوي ${yearlyDiscountPct}% بدل الدفع الشهري 12 شهر`
                  : `${yearlyDiscountPct}% yearly discount vs paying monthly for 12 months`}
              </li>
            ) : null}
          </ul>
        </div>

        {isOrgAdmin ? (
          <div className="subscriptionCompareCardAction">
            {pendingRenewal ? (
              <button
                type="button"
                className="subscriptionCompareBtn outline"
                onClick={() => onShowPaymentInfo(pendingRenewal)}
              >
                {isArabic ? "تعليمات الدفع" : "Payment info"}
              </button>
            ) : (
              <button
                type="button"
                className="subscriptionCompareBtn primary"
                disabled={submittingRequest || Boolean(pendingRequest)}
                onClick={() => onSubmitRenewal(billingCycle, billedAmount)}
              >
                {submittingRequest
                  ? isArabic
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : billingCycle === "yearly"
                    ? isArabic
                      ? `تجديد سنوي — ${billedAmount.toLocaleString("ar-EG")} ${currency}`
                      : `Renew yearly — ${billedAmount.toLocaleString("en-US")} ${currency}`
                    : isArabic
                      ? `تجديد شهري — ${billedAmount.toLocaleString("ar-EG")} ${currency}`
                      : `Renew monthly — ${billedAmount.toLocaleString("en-US")} ${currency}`}
              </button>
            )}
          </div>
        ) : (
          <p className="subscriptionCompareHint">
            {isArabic
              ? "تواصل مع مدير الصيدلية لتجديد الاشتراك"
              : "Contact your pharmacy admin to renew"}
          </p>
        )}
      </article>
    </section>
  );
}
