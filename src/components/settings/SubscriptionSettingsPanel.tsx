import SubscriptionPaymentModal from "./subscription/SubscriptionPaymentModal";
import SubscriptionHeroSection, { SubscriptionProgressSection } from "./subscription/SubscriptionHeroSection";
import SubscriptionRequestsHistory from "./subscription/SubscriptionRequestsHistory";
import SubscriptionCalculatorRenewSection from "./subscription/SubscriptionCalculatorRenewSection";
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
    subscriptionTier = "basic",
    maxBranches = 1,
    maxUsers = 1,
    staffAddonEnabled = false,
    customersAddonEnabled = false,
    investmentAddonEnabled = false,
    pharmacySubscriptionRequests,
    subscriptionRenewLogs,
    subscriptionDaysLeft,
  } = props;

  const state = useSubscriptionSettingsState(props);
  const { displayValues } = state;
  const limitsLabel = isArabic
    ? `${maxBranches} فرع · ${maxUsers} مستخدم`
    : `${maxBranches} branches · ${maxUsers} users`;

  return (
    <>
      <div className="settingsTabPanel subscriptionTab">
        <SubscriptionHeroSection
          isArabic={isArabic}
          subscriptionTone={displayValues.subscriptionTone}
          subscriptionStatusLabel={displayValues.subscriptionStatusLabel}
          subscriptionMessage={displayValues.subscriptionMessage}
          daysLeftLabel={displayValues.daysLeftLabel}
          subscriptionTierLabel={limitsLabel}
          billingPeriodLabel={getSubscriptionPlanLabel(settingsForm.subscriptionPlan)}
          formattedEndDate={displayValues.formattedEndDate}
          renewalsCount={subscriptionRenewLogs.length}
        />

        <SubscriptionCalculatorRenewSection
          isArabic={isArabic}
          isOrgAdmin={isOrgAdmin}
          subscriptionTier={subscriptionTier}
          maxBranches={maxBranches}
          maxUsers={maxUsers}
          staffAddon={staffAddonEnabled}
          customersAddon={customersAddonEnabled}
          investmentAddon={investmentAddonEnabled}
          pendingRenewal={state.pendingRenewal}
          pendingLimitChange={state.pendingLimitChange}
          pendingRequest={state.pendingRequest}
          submittingRequest={state.submittingRequest}
          onSubmitRenewal={(billingView, amount) =>
            void state.handleSubmitRenewalRequest(billingView, amount)
          }
          onSubmitLimitChange={(change, amount) =>
            void state.handleSubmitLimitChangeRequest(change, amount)
          }
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
