import { SettingsPage } from "../../pages/lazyPages";
import { resolveMaxBranches } from "../../utils/branchLimits";
import { resolveMaxUsers } from "../../utils/userLimits";
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
  | "pharmacySettings"
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
  pharmacySettings,
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

  const maxBranches = pharmacySettings ? resolveMaxBranches(pharmacySettings) : 1;
  const maxUsers = pharmacySettings ? resolveMaxUsers(pharmacySettings) : 1;

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
      subscriptionTier={orgSubscriptionTier}
      maxBranches={maxBranches}
      maxUsers={maxUsers}
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
