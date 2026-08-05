import { useMemo, useState } from "react";
import type { SubscriptionRequest } from "../../../types";
import {
  getYearlyPlanAmount,
  YEARLY_SUBSCRIPTION_DISCOUNT,
  subscriptionPaymentInfo,
} from "../../../config/subscription";
import {
  getSubscriptionTier,
  subscriptionTierOrder,
  type SubscriptionTier,
  type SubscriptionTierConfig,
} from "../../../config/subscriptionTiers";
import { parseTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import type { BillingView } from "./types";

type SubscriptionTierComparisonSectionProps = {
  isArabic: boolean;
  currentTier: SubscriptionTier;
  isOrgAdmin: boolean;
  pendingTierUpgrade?: SubscriptionRequest;
  pendingRenewal?: SubscriptionRequest;
  pendingRequest?: SubscriptionRequest;
  submittingTierUpgrade: boolean;
  submittingRequest: boolean;
  onSubmitUpgrade: (targetTier: SubscriptionTier) => void;
  onSubmitRenewal: (billingView: BillingView) => void;
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

const tierIcons: Record<SubscriptionTier, string> = {
  basic: "🏪",
  professional: "⚡",
  premium: "🚀",
};

const featuredTier: SubscriptionTier = "professional";

function getTierRank(tier: SubscriptionTier): number {
  return subscriptionTierOrder.indexOf(tier);
}

function getFeaturesTitle(tierId: SubscriptionTier, isArabic: boolean): string {
  if (tierId === "basic") return isArabic ? "أهم المميزات" : "Key features";
  if (tierId === "professional") return isArabic ? "كل مميزات الأساسي +" : "All Basic features +";
  return isArabic ? "كل مميزات الاحترافي +" : "All Professional features +";
}

function getTierPrice(tier: SubscriptionTierConfig, billingView: BillingView): number {
  if (billingView === "monthly") return tier.packagePrice;
  return getYearlyPlanAmount(tier.packagePrice);
}

export default function SubscriptionTierComparisonSection({
  isArabic,
  currentTier,
  isOrgAdmin,
  pendingTierUpgrade,
  pendingRenewal,
  pendingRequest,
  submittingTierUpgrade,
  submittingRequest,
  onSubmitUpgrade,
  onSubmitRenewal,
  onShowPaymentInfo,
}: SubscriptionTierComparisonSectionProps) {
  const [billingView, setBillingView] = useState<BillingView>("monthly");
  const tiers = useMemo(
    () => subscriptionTierOrder.map((id) => getSubscriptionTier(id)),
    [],
  );
  const yearlyDiscountPct = Math.round(YEARLY_SUBSCRIPTION_DISCOUNT * 100);
  const currency = subscriptionPaymentInfo.currency;

  return (
    <section className="subscriptionCompareSection">
      <div className="subscriptionCompareIntro">
        <h3>{isArabic ? "مقارنة الباقات" : "Compare packages"}</h3>
        <p>
          {isArabic
            ? "اختر الباقة ومدة الفوترة من الأعلى، ثم أرسل طلب التجديد أو الترقية"
            : "Choose a package and billing cycle above, then submit a renewal or upgrade request"}
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
          aria-selected={billingView === "monthly"}
          className={billingView === "monthly" ? "active" : ""}
          onClick={() => setBillingView("monthly")}
        >
          {isArabic ? "الاشتراك الشهري" : "Monthly billing"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={billingView === "yearly"}
          className={billingView === "yearly" ? "active" : ""}
          onClick={() => setBillingView("yearly")}
        >
          {isArabic
            ? `الاشتراك السنوي (وفر ${yearlyDiscountPct}%)`
            : `Annual billing (save ${yearlyDiscountPct}%)`}
        </button>
      </div>

      <div className="subscriptionCompareGrid">
        {tiers.map((tier) => {
          const isCurrent = tier.id === currentTier;
          const isFeatured = tier.id === featuredTier;
          const isHigher = getTierRank(tier.id) > getTierRank(currentTier);
          const isLower = getTierRank(tier.id) < getTierRank(currentTier);
          const price = getTierPrice(tier, billingView);
          const monthlyEquivalent =
            billingView === "yearly" ? Math.round(price / 12) : tier.packagePrice;
          const features = isArabic ? tier.featuresAr : tier.featuresEn;
          const pendingTargetTier = pendingTierUpgrade
            ? parseTierUpgradePlan(pendingTierUpgrade.plan)
            : null;
          const pendingForThisTier = pendingTargetTier === tier.id;

          return (
            <article
              key={tier.id}
              className={`subscriptionCompareCard${isFeatured ? " featured" : ""}${isCurrent ? " current" : ""}`}
            >
              {isFeatured && !isCurrent ? (
                <span className="subscriptionCompareBadge featured">
                  {isArabic ? "الأكثر شيوعاً" : "Most popular"}
                </span>
              ) : null}
              {isCurrent ? (
                <span className="subscriptionCompareBadge current">
                  {isArabic ? "باقتك الحالية" : "Your plan"}
                </span>
              ) : null}

              <div className="subscriptionCompareCardHead">
                <span className="subscriptionCompareIcon" aria-hidden="true">
                  {tierIcons[tier.id]}
                </span>
                <h4>{isArabic ? tier.labelAr : tier.labelEn}</h4>
                <div className="subscriptionComparePrice">
                  <strong>{price.toLocaleString(isArabic ? "ar-EG" : "en-US")}</strong>
                  <span>
                    {currency}
                    {billingView === "monthly"
                      ? isArabic
                        ? " / شهر"
                        : " / month"
                      : isArabic
                        ? " / سنة"
                        : " / year"}
                  </span>
                </div>
                {billingView === "yearly" ? (
                  <p className="subscriptionCompareEquivalent">
                    {isArabic
                      ? `≈ ${monthlyEquivalent.toLocaleString("ar-EG")} ${currency} / شهر`
                      : `≈ ${monthlyEquivalent.toLocaleString("en-US")} ${currency} / month`}
                  </p>
                ) : (
                  <p className="subscriptionCompareEquivalent">
                    {isArabic ? tier.summaryAr : tier.summaryEn}
                  </p>
                )}
              </div>

              <div className="subscriptionCompareCardBody">
                <h5>{getFeaturesTitle(tier.id, isArabic)}</h5>
                <ul className="subscriptionCompareFeatureList">
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>

              {isOrgAdmin ? (
                <div className="subscriptionCompareCardAction">
                  {isCurrent ? (
                    pendingRenewal ? (
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
                        onClick={() => onSubmitRenewal(billingView)}
                      >
                        {submittingRequest
                          ? isArabic
                            ? "جاري الإرسال..."
                            : "Submitting..."
                          : billingView === "yearly"
                            ? isArabic
                              ? `تجديد سنوي — ${price.toLocaleString("ar-EG")} ${currency}`
                              : `Renew yearly — ${price.toLocaleString("en-US")} ${currency}`
                            : isArabic
                              ? `تجديد شهري — ${price.toLocaleString("ar-EG")} ${currency}`
                              : `Renew monthly — ${price.toLocaleString("en-US")} ${currency}`}
                      </button>
                    )
                  ) : isLower ? (
                    <button type="button" className="subscriptionCompareBtn muted" disabled>
                      {isArabic ? "باقة أدنى" : "Lower tier"}
                    </button>
                  ) : pendingRequest && !pendingForThisTier ? (
                    <button type="button" className="subscriptionCompareBtn muted" disabled>
                      {isArabic ? "طلب قيد المراجعة" : "Request pending"}
                    </button>
                  ) : pendingForThisTier && pendingTierUpgrade ? (
                    <button
                      type="button"
                      className="subscriptionCompareBtn outline"
                      onClick={() => onShowPaymentInfo(pendingTierUpgrade)}
                    >
                      {isArabic ? "تعليمات الدفع" : "Payment info"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`subscriptionCompareBtn${isFeatured ? " primary" : ""}`}
                      disabled={submittingTierUpgrade || Boolean(pendingRequest)}
                      onClick={() => onSubmitUpgrade(tier.id)}
                    >
                      {submittingTierUpgrade
                        ? isArabic
                          ? "جاري الإرسال..."
                          : "Submitting..."
                        : isArabic
                          ? `ترقية إلى ${tier.labelAr}`
                          : `Upgrade to ${tier.labelEn}`}
                    </button>
                  )}
                </div>
              ) : isHigher ? (
                <p className="subscriptionCompareHint">
                  {isArabic
                    ? "تواصل مع مدير الصيدلية لترقية الباقة"
                    : "Contact your pharmacy admin to upgrade"}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
