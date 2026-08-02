import type { SubscriptionTierConfig } from "../../../config/subscriptionTiers";

type SubscriptionTierFeaturesSectionProps = {
  isArabic: boolean;
  tierConfig: SubscriptionTierConfig;
  tierFeatures: string[];
};

export default function SubscriptionTierFeaturesSection({
  isArabic,
  tierConfig,
  tierFeatures,
}: SubscriptionTierFeaturesSectionProps) {
  return (
    <section className="subscriptionEditCard subscriptionTierFeaturesCard">
      <div className="subscriptionEditHeader">
        <span className="subscriptionEditHeaderIcon" aria-hidden="true">
          ✨
        </span>
        <div>
          <h3>{isArabic ? "مميزات باقتك" : "Your package features"}</h3>
          <p>{isArabic ? tierConfig.summaryAr : tierConfig.summaryEn}</p>
        </div>
      </div>
      <ul className="subscriptionTierFeatureList">
        {tierFeatures.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <p className="returnsSectionHint">
        {isArabic
          ? `الحد الأقصى للفروع في باقتك: ${tierConfig.maxBranches}`
          : `Branch limit on your plan: ${tierConfig.maxBranches}`}
      </p>
    </section>
  );
}
