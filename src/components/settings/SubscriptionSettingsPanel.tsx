import SubscriptionPaymentInstructions from "../SubscriptionPaymentInstructions";
import SubscriptionHeroSection, { SubscriptionProgressSection } from "./subscription/SubscriptionHeroSection";
import SubscriptionRenewalForm from "./subscription/SubscriptionRenewalForm";
import SubscriptionRequestsHistory from "./subscription/SubscriptionRequestsHistory";
import SubscriptionTierFeaturesSection from "./subscription/SubscriptionTierFeaturesSection";
import SubscriptionTierUpgradeSection from "./subscription/SubscriptionTierUpgradeSection";
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
    submitTierUpgradeRequest,
    pharmacySubscriptionRequests,
    subscriptionRenewLogs,
    subscriptionDaysLeft,
  } = props;

  const state = useSubscriptionSettingsState(props);
  const { tierDerived, displayValues } = state;

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

        <SubscriptionTierFeaturesSection
          isArabic={isArabic}
          tierConfig={tierDerived.tierConfig}
          tierFeatures={tierDerived.tierFeatures}
        />

        {isOrgAdmin &&
          tierDerived.tierUpgradeTarget &&
          tierDerived.tierUpgradeConfig &&
          submitTierUpgradeRequest && (
            <SubscriptionTierUpgradeSection
              isArabic={isArabic}
              tierUpgradeConfig={tierDerived.tierUpgradeConfig}
              tierUpgradeAmount={tierDerived.tierUpgradeAmount}
              pendingTierUpgrade={state.pendingTierUpgrade}
              pendingRequest={state.pendingRequest}
              submittingTierUpgrade={state.submittingTierUpgrade}
              onSubmitUpgrade={state.handleSubmitTierUpgradeRequest}
              onShowPaymentInfo={state.setPaymentRequest}
            />
          )}

        {settingsForm.subscriptionPlan !== "lifetime" && (
          <SubscriptionProgressSection
            isArabic={isArabic}
            subscriptionTone={displayValues.subscriptionTone}
            subscriptionDaysLeft={subscriptionDaysLeft}
            progressPercent={displayValues.progressPercent}
          />
        )}

        {isOrgAdmin && (
          <SubscriptionRenewalForm
            isArabic={isArabic}
            requestPlan={state.requestPlan}
            onRequestPlanChange={state.setRequestPlan}
            requestPlanOptions={state.requestPlanOptions}
            customDays={state.customDays}
            onCustomDaysChange={state.setCustomDays}
            requestDays={state.requestDays}
            requestAmount={state.requestAmount}
            submittingRequest={state.submittingRequest}
            onSubmit={state.handleSubmitSubscriptionRequest}
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

      {state.paymentRequest && (
        <div className="modalOverlay">
          <div
            className="invoiceModal subscriptionPaymentModal"
            onClick={(e) => e.stopPropagation()}
          >
            <SubscriptionPaymentInstructions
              isArabic={isArabic}
              request={state.paymentRequest}
              onClose={() => state.setPaymentRequest(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
