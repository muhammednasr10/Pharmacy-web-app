import type { SubscriptionTone } from "./types";

type SubscriptionHeroSectionProps = {
  isArabic: boolean;
  subscriptionTone: SubscriptionTone;
  subscriptionStatusLabel: string;
  subscriptionMessage: string;
  daysLeftLabel: string;
  subscriptionTierLabel?: string;
  billingPeriodLabel: string;
  formattedEndDate: string;
  renewalsCount: number;
};

export default function SubscriptionHeroSection({
  isArabic,
  subscriptionTone,
  subscriptionStatusLabel,
  subscriptionMessage,
  daysLeftLabel,
  subscriptionTierLabel,
  billingPeriodLabel,
  formattedEndDate,
  renewalsCount,
}: SubscriptionHeroSectionProps) {
  return (
    <>
      <section className={`subscriptionHero ${subscriptionTone}`}>
        <div className="subscriptionHeroMain">
          <span className={`subscriptionStatusPill ${subscriptionTone}`}>
            {subscriptionStatusLabel}
          </span>
          <h3>{isArabic ? "الاشتراك والترخيص" : "Subscription & License"}</h3>
          <p>{subscriptionMessage}</p>
        </div>

        <div className="subscriptionHeroDays">
          <span>{isArabic ? "الأيام المتبقية" : "Days Left"}</span>
          <strong>{daysLeftLabel}</strong>
          <small>{isArabic ? "يوم" : "days"}</small>
        </div>
      </section>

      <div className="subscriptionStatsGrid">
        {subscriptionTierLabel && (
          <div className={`subscriptionStatCard ${subscriptionTone}`}>
            <span>{isArabic ? "باقة الاشتراك" : "Package"}</span>
            <strong>{subscriptionTierLabel}</strong>
          </div>
        )}
        <div className={`subscriptionStatCard ${subscriptionTone}`}>
          <span>{isArabic ? "مدة التجديد" : "Billing period"}</span>
          <strong>{billingPeriodLabel}</strong>
        </div>
        <div className={`subscriptionStatCard ${subscriptionTone}`}>
          <span>{isArabic ? "تاريخ الانتهاء" : "End Date"}</span>
          <strong>{formattedEndDate}</strong>
        </div>
        <div className={`subscriptionStatCard ${subscriptionTone}`}>
          <span>{isArabic ? "حالة النظام" : "System Access"}</span>
          <strong>{subscriptionStatusLabel}</strong>
        </div>
        <div className={`subscriptionStatCard ${subscriptionTone}`}>
          <span>{isArabic ? "عدد التجديدات" : "Renewals Logged"}</span>
          <strong>{renewalsCount}</strong>
        </div>
      </div>
    </>
  );
}

type SubscriptionProgressSectionProps = {
  isArabic: boolean;
  subscriptionTone: SubscriptionTone;
  subscriptionDaysLeft: number | string | null;
  progressPercent: number;
};

export function SubscriptionProgressSection({
  isArabic,
  subscriptionTone,
  subscriptionDaysLeft,
  progressPercent,
}: SubscriptionProgressSectionProps) {
  return (
    <div className="subscriptionProgressCard">
      <div className="subscriptionProgressHeader">
        <span>{isArabic ? "مدة الاشتراك المتبقية" : "Remaining subscription period"}</span>
        <strong>
          {subscriptionDaysLeft !== null && Number(subscriptionDaysLeft) >= 0
            ? `${subscriptionDaysLeft} ${isArabic ? "يوم" : "days"}`
            : isArabic
              ? "منتهي"
              : "Expired"}
        </strong>
      </div>
      <div className="subscriptionProgressTrack">
        <div
          className={`subscriptionProgressFill ${subscriptionTone}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
