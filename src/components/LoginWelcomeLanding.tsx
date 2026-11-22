import { useEffect, useState } from "react";
import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import { getCachedSubscriptionTierConfigs } from "../config/subscriptionTierCache";
import {
  subscriptionTierOrder,
  type SubscriptionTier,
  type SubscriptionTierConfig,
} from "../config/subscriptionTiers";
import * as pharmacyService from "../services/pharmacyService";
import DeveloperCredit from "./DeveloperCredit";
import DisplayPreferencesPanel from "./DisplayPreferencesPanel";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";

type LoginWelcomeLandingProps = {
  isArabic: boolean;
  t: Record<string, string>;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  onThemeModeChange: (mode: ThemeMode) => void;
  onFontScaleChange: (scale: FontScale) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onStartTrial: () => void;
  onSignIn: () => void;
};

function formatPrice(amount: number, isArabic: boolean) {
  const value = Math.max(0, Math.round(amount));
  return isArabic
    ? `${value.toLocaleString("ar-EG")} ج.م / شهر`
    : `${value.toLocaleString("en-EG")} EGP / month`;
}

export default function LoginWelcomeLanding({
  isArabic,
  t,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
  onToggleTheme,
  onToggleLang,
  onStartTrial,
  onSignIn,
}: LoginWelcomeLandingProps) {
  const [tiers, setTiers] = useState<Record<SubscriptionTier, SubscriptionTierConfig>>(() =>
    getCachedSubscriptionTierConfigs(),
  );

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .loadSubscriptionTierConfigs()
      .then((configs) => {
        if (!cancelled) setTiers(configs);
      })
      .catch(() => {
        if (!cancelled) setTiers(getCachedSubscriptionTierConfigs());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="loginWelcomePage" dir={isArabic ? "rtl" : "ltr"}>
      <header className="loginWelcomeTopbar">
        <img src={VICTORY_BRAND_LOGO} alt={VICTORY_BRAND_TITLE} className="loginWelcomeLogo" />
        <div className="loginWelcomeTopActions">
          <button
            type="button"
            className="topbarIconBtn topbarActionChip topbarActionChip--theme topbarActionChip--iconOnly"
            onClick={onToggleTheme}
            title={
              isArabic
                ? resolvedTheme === "dark"
                  ? "الوضع الفاتح"
                  : "الوضع الداكن"
                : resolvedTheme === "dark"
                  ? "Light mode"
                  : "Dark mode"
            }
            aria-label={
              isArabic
                ? resolvedTheme === "dark"
                  ? "التبديل إلى الوضع الفاتح"
                  : "التبديل إلى الوضع الداكن"
                : resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
            }
          >
            <span className="topbarThemeIcon" aria-hidden="true">
              {resolvedTheme === "dark" ? "☀️" : "🌙"}
            </span>
          </button>
          <button
            type="button"
            className="topbarIconBtn topbarActionChip topbarActionChip--lang topbarActionChip--iconOnly"
            onClick={onToggleLang}
            title={t.langButton}
            aria-label={t.langButton}
          >
            <span aria-hidden="true">{isArabic ? "EN" : "ع"}</span>
          </button>
        </div>
      </header>

      <main className="loginWelcomeMain">
        <section className="loginWelcomeHero">
          <p className="loginWelcomeBrand">{VICTORY_BRAND_TITLE}</p>
          <h1>
            {isArabic
              ? "نظام إدارة صيدليات… من البيع للمخزون والتقارير في مكان واحد"
              : "Pharmacy management — sales, stock, and reports in one place"}
          </h1>
          <p className="loginWelcomeLead">
            {isArabic
              ? `ابدأ بتجربة مجانية ${TRIAL_SUBSCRIPTION_DAYS} يوم على الباقة الاحترافية، واختار الباقة المناسبة لحجم صيدليتك.`
              : `Start a free ${TRIAL_SUBSCRIPTION_DAYS}-day Professional trial, then pick the plan that fits your pharmacy.`}
          </p>
          <div className="loginWelcomeActions">
            <button type="button" className="loginWelcomePrimary" onClick={onStartTrial}>
              {isArabic ? `ابدأ التجربة المجانية (${TRIAL_SUBSCRIPTION_DAYS} يوم)` : `Start free trial (${TRIAL_SUBSCRIPTION_DAYS} days)`}
            </button>
            <button type="button" className="loginWelcomeSecondary" onClick={onSignIn}>
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </button>
          </div>
        </section>

        <section className="loginWelcomePlans" aria-label={isArabic ? "الباقات" : "Plans"}>
          <div className="loginWelcomePlansHeader">
            <h2>{isArabic ? "الباقات والأسعار" : "Plans & pricing"}</h2>
            <p>
              {isArabic
                ? "كل باقة توضح الحد والميزات والسعر الشهري — الأسعار من إعدادات Victory الحالية."
                : "Each plan shows limits, features, and monthly price — from your current Victory settings."}
            </p>
          </div>

          <div className="loginWelcomePlanGrid">
            {subscriptionTierOrder.map((tierId) => {
              const tier = tiers[tierId];
              const features = isArabic ? tier.featuresAr : tier.featuresEn;
              const isFeatured = tierId === "professional";
              return (
                <article
                  key={tierId}
                  className={`loginWelcomePlan${isFeatured ? " is-featured" : ""}`}
                >
                  {isFeatured ? (
                    <span className="loginWelcomePlanBadge">
                      {isArabic ? "يشمل التجربة المجانية" : "Includes free trial"}
                    </span>
                  ) : null}
                  <h3>{isArabic ? tier.labelAr : tier.labelEn}</h3>
                  <p className="loginWelcomePlanPrice">{formatPrice(tier.packagePrice, isArabic)}</p>
                  <p className="loginWelcomePlanSummary">
                    {isArabic ? tier.summaryAr : tier.summaryEn}
                  </p>
                  <ul>
                    {features.slice(0, 6).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={isFeatured ? "loginWelcomePrimary" : "loginWelcomeSecondary"}
                    onClick={onStartTrial}
                  >
                    {isArabic ? "ابدأ الآن" : "Get started"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="loginWelcomeFooter">
        <DisplayPreferencesPanel
          isArabic={isArabic}
          themeMode={themeMode}
          fontScale={fontScale}
          resolvedTheme={resolvedTheme}
          onThemeModeChange={onThemeModeChange}
          onFontScaleChange={onFontScaleChange}
          compact
        />
        <DeveloperCredit isArabic={isArabic} variant="login" />
      </footer>
    </div>
  );
}
