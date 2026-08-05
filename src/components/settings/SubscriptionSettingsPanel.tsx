import SubscriptionPaymentModal from "./subscription/SubscriptionPaymentModal";
import SubscriptionHeroSection, { SubscriptionProgressSection } from "./subscription/SubscriptionHeroSection";
import SubscriptionRequestsHistory from "./subscription/SubscriptionRequestsHistory";
import SubscriptionTierComparisonSection from "./subscription/SubscriptionTierComparisonSection";
import { useSubscriptionSettingsState } from "./subscription/useSubscriptionSettingsState";
import type { SubscriptionSettingsPanelProps } from "./subscription/types";

export type { SubscriptionSettingsPanelProps } from "./subscription/types";

export default function SubscriptionSettingsPanel(props: SubscriptionSettingsPanelProps) {
  const {
    isArabic,
    isOrgAdmin,
    t,
    settingsForm,
    getSubscriptionPlanLabel,
    subscriptionTierLabel,
    subscriptionTier = "basic",
    pharmacySubscriptionRequests,
    subscriptionRenewLogs,
    subscriptionDaysLeft,
  } = props;

  const state = useSubscriptionSettingsState(props);
  const { displayValues } = state;

  return (
    <>
      <div className="settingsTabPanel subscriptionTab">
        <SubscriptionHeroSection
          isArabic={isArabic}
          subscriptionTone={displayValues.subscriptionTone}
          subscriptionStatusLabel={displayValues.subscriptionStatusLabel}
          subscriptionMessage={displayValues.subscriptionMessage}
          daysLeftLabel={displayValues.daysLeftLabel}
          subscriptionTierLabel={subscriptionTierLabel}
          billingPeriodLabel={getSubscriptionPlanLabel(settingsForm.subscriptionPlan)}
          formattedEndDate={displayValues.formattedEndDate}
          renewalsCount={subscriptionRenewLogs.length}
        />

        <SubscriptionTierComparisonSection
          isArabic={isArabic}
          currentTier={subscriptionTier}
          isOrgAdmin={isOrgAdmin}
          pendingTierUpgrade={state.pendingTierUpgrade}
          pendingRenewal={state.pendingRenewal}
          pendingRequest={state.pendingRequest}
          submittingTierUpgrade={state.submittingTierUpgrade}
          submittingRequest={state.submittingRequest}
          onSubmitUpgrade={(targetTier) => void state.handleSubmitTierUpgradeRequest(targetTier)}
          onSubmitRenewal={(billingView) => void state.handleSubmitRenewalRequest(billingView)}
          onShowPaymentInfo={state.setPaymentRequest}
        />

        {settingsForm.subscriptionPlan !== "lifetime" && (
          <SubscriptionProgressSection
            isArabic={isArabic}
            subscriptionTone={displayValues.subscriptionTone}
            subscriptionDaysLeft={subscriptionDaysLeft}
            progressPercent={displayValues.progressPercent}
          />
        )}

        <SubscriptionRequestsHistory
          isArabic={isArabic}
          t={t}
          pharmacySubscriptionRequests={pharmacySubscriptionRequests}
          subscriptionRenewLogs={subscriptionRenewLogs}
          onShowPaymentInfo={state.setPaymentRequest}
        />
      </div>

      {state.paymentRequest ? (
        <SubscriptionPaymentModal
          isArabic={isArabic}
          request={state.paymentRequest}
          onClose={() => state.setPaymentRequest(null)}
        />
      ) : null}
    </>
  );
}
