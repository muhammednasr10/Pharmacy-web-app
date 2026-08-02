import { Suspense } from "react";
import LoginPage from "./components/LoginPage";
import AppShell from "./components/AppShell";
import PageLoadingCard from "./components/PageLoadingCard";
import UpgradePlanModal from "./components/UpgradePlanModal";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { LazyAppModals, LazyAppPageRouter } from "./components/lazyAppModules";
import { useAppState } from "./hooks/useAppState";

function App() {
  const {
    loginScreenStatus,
    loginFormProps,
    isArabic,
    t,
    lang,
    setLang,
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    toggleTheme,
    handleLogout,
    appUser,
    orgSubscriptionTier,
    openSubscriptionSettings,
    pageRouterProps,
    appModalsProps,
    appShellProps,
  } = useAppState();

  if (loginScreenStatus) {
    return (
      <LoginPage
        status={loginScreenStatus}
        {...loginFormProps}
        isArabic={isArabic}
        t={t}
        onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
        themeMode={themeMode}
        fontScale={fontScale}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={setThemeMode}
        onFontScaleChange={setFontScale}
        onToggleTheme={toggleTheme}
        onLogout={loginScreenStatus === "denied" ? handleLogout : undefined}
      />
    );
  }

  return (
    <SubscriptionProvider
      appUser={appUser!}
      tier={orgSubscriptionTier}
      isArabic={isArabic}
      onNavigateToSubscription={openSubscriptionSettings}
    >
      <AppShell
        {...appShellProps}
        children={
          <Suspense fallback={<PageLoadingCard isArabic={isArabic} />}>
            <LazyAppPageRouter {...pageRouterProps} />
          </Suspense>
        }
        modals={
          <>
            <UpgradePlanModal isArabic={isArabic} />
            <Suspense fallback={null}>
              <LazyAppModals {...appModalsProps} />
            </Suspense>
          </>
        }
      />
    </SubscriptionProvider>
  );
}

export default App;
