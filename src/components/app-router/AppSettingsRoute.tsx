import { SettingsPage } from "../../pages/lazyPages";
import { getSubscriptionTierLabel } from "../../config/subscriptionTiers";
import type { AppPageRouterProps } from "./types";

export type AppSettingsRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "getPharmacyId"
  | "appUser"
  | "settingsInitialTab"
  | "t"
  | "settingsForm"
  | "setSettingsForm"
  | "isSubscriptionExpired"
  | "isSubscriptionExpiringSoon"
  | "isTrialSubscription"
  | "getSubscriptionPlanLabel"
  | "orgSubscriptionTier"
  | "handleSubmitSubscriptionRequest"
  | "handleSubmitTierUpgradeRequest"
  | "pharmacySubscriptionRequests"
  | "hasRole"
  | "subscriptionRenewLogs"
  | "subscriptionDaysLeft"
  | "handleLogoUpload"
  | "savePharmacySettings"
  | "exportBackupCSV"
  | "handleRequestExpiryNotificationPermission"
  | "handleSendExpiryNotifyNow"
  | "handleOpenExpiryWhatsappDigest"
  | "handleOpenExpiryEmailDigest"
  | "themeMode"
  | "fontScale"
  | "resolvedTheme"
  | "setThemeMode"
  | "setFontScale"
>;

export default function AppSettingsRoute({
  displayPage,
  canOpenPage,
  isArabic,
  getPharmacyId,
  appUser,
  settingsInitialTab,
  t,
  settingsForm,
  setSettingsForm,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription,
  getSubscriptionPlanLabel,
  orgSubscriptionTier,
  handleSubmitSubscriptionRequest,
  handleSubmitTierUpgradeRequest,
  pharmacySubscriptionRequests,
  hasRole,
  subscriptionRenewLogs,
  subscriptionDaysLeft,
  handleLogoUpload,
  savePharmacySettings,
  exportBackupCSV,
  handleRequestExpiryNotificationPermission,
  handleSendExpiryNotifyNow,
  handleOpenExpiryWhatsappDigest,
  handleOpenExpiryEmailDigest,
  themeMode,
  fontScale,
  resolvedTheme,
  setThemeMode,
  setFontScale,
}: AppSettingsRouteProps) {
  if (!canOpenPage("settings")) return null;

  return (
    <SettingsPage
      isArabic={isArabic}
      pharmacyId={getPharmacyId()}
      appUser={appUser}
      initialTab={settingsInitialTab}
      t={t}
      settingsForm={settingsForm}
      setSettingsForm={setSettingsForm}
      isSubscriptionExpired={isSubscriptionExpired}
      isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
      isTrialSubscription={isTrialSubscription}
      getSubscriptionPlanLabel={getSubscriptionPlanLabel}
      subscriptionTierLabel={getSubscriptionTierLabel(orgSubscriptionTier, isArabic)}
      subscriptionTier={orgSubscriptionTier}
      submitSubscriptionRequest={handleSubmitSubscriptionRequest}
      submitTierUpgradeRequest={handleSubmitTierUpgradeRequest}
      pharmacySubscriptionRequests={pharmacySubscriptionRequests}
      hasRole={hasRole}
      subscriptionRenewLogs={subscriptionRenewLogs}
      subscriptionDaysLeft={subscriptionDaysLeft}
      handleLogoUpload={handleLogoUpload}
      savePharmacySettings={savePharmacySettings}
      exportBackupCSV={exportBackupCSV}
      onRequestExpiryNotificationPermission={handleRequestExpiryNotificationPermission}
      onSendExpiryNotifyNow={handleSendExpiryNotifyNow}
      onOpenExpiryWhatsappDigest={handleOpenExpiryWhatsappDigest}
      onOpenExpiryEmailDigest={handleOpenExpiryEmailDigest}
      themeMode={themeMode}
      fontScale={fontScale}
      resolvedTheme={resolvedTheme}
      onThemeModeChange={setThemeMode}
      onFontScaleChange={setFontScale}
    />
  );
}
