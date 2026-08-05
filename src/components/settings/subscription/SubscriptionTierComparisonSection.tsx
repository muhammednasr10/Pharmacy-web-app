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

type BillingView = "monthly" | "yearly";

type SubscriptionTierComparisonSectionProps = {
  isArabic: boolean;
  currentTier: SubscriptionTier;
  isOrgAdmin: boolean;
  pendingTierUpgrade?: SubscriptionRequest;
  pendingRequest?: SubscriptionRequest;
  submittingTierUpgrade: boolean;
  onSubmitUpgrade: (targetTier: SubscriptionTier) => void;
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
  pendingRequest,
  submittingTierUpgrade,
  onSubmitUpgrade,
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
            ? "اختر الباقة المناسبة لصيدليتك — الأسعار بالجنيه المصري"
            : "Choose the package that fits your pharmacy — prices in EGP"}
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
                    <button type="button" className="subscriptionCompareBtn current" disabled>
                      {isArabic ? "باقتك الحالية" : "Current plan"}
                    </button>
                  ) : isLower ? (
                    <button type="button" className="subscriptionCompareBtn muted" disabled>
                      {isArabic ? "باقة أدنى" : "Lower tier"}
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
