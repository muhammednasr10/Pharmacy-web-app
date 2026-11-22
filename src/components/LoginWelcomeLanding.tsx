import { useEffect, useMemo, useState } from "react";
import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  computePricingQuote,
  savePricingQuote,
  type PricingCalculatorConfig,
} from "../config/pricingCalculator";
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
  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CALCULATOR_CONFIG);
  const [branches, setBranches] = useState(1);
  const [users, setUsers] = useState(3);
  const [staffAddon, setStaffAddon] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .loadPricingCalculatorConfig()
      .then((row) => {
        if (!cancelled) setConfig(row);
      })
      .catch(() => {
        if (!cancelled) setConfig(DEFAULT_PRICING_CALCULATOR_CONFIG);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quote = useMemo(
    () => computePricingQuote(config, { branches, users, staffAddon }),
    [config, branches, users, staffAddon],
  );

  function handleAgree() {
    savePricingQuote(quote);
    onStartTrial();
  }

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
              ? "احسب باقتك… ثم ابدأ تجربة 14 يوم فورًا"
              : "Build your plan — then start a 14-day trial"}
          </h1>
          <p className="loginWelcomeLead">
            {isArabic
              ? "حدد عدد الفروع والمستخدمين والإضافات، وشوف السعر الشهري. بعد الموافقة تدخل مباشرة وتجربة 14 يوم، ومالك النظام بيعتمد الطلب خلال المدة."
              : "Choose branches, users, and add-ons to see the monthly price. After you agree you enter immediately for a 14-day trial while the owner reviews approval."}
          </p>
          <div className="loginWelcomeActions">
            <button type="button" className="loginWelcomeSecondary" onClick={onSignIn}>
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </button>
          </div>
        </section>

        <section className="loginWelcomeCalculator" aria-label={isArabic ? "حاسبة الباقة" : "Plan calculator"}>
          <div className="loginWelcomePlansHeader">
            <h2>{isArabic ? "حاسبة الباقة" : "Plan calculator"}</h2>
            <p>
              {isArabic
                ? "الأسعار يحددها مالك النظام من تبويب الباقات — الرقم يتحدث مباشرة."
                : "Prices are set by the system owner in Packages — totals update live."}
            </p>
          </div>

          <div className="loginWelcomeCalcGrid">
            <label className="loginWelcomeCalcField">
              <span>{isArabic ? "عدد الفروع" : "Branches"}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={branches}
                onChange={(e) => setBranches(Number(e.target.value) || 1)}
              />
              <small>
                {isArabic
                  ? `${config.pricePerBranch.toLocaleString("ar-EG")} ج.م لكل فرع`
                  : `${config.pricePerBranch.toLocaleString("en-EG")} EGP per branch`}
              </small>
            </label>

            <label className="loginWelcomeCalcField">
              <span>{isArabic ? "عدد المستخدمين" : "Users"}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={users}
                onChange={(e) => setUsers(Number(e.target.value) || 1)}
              />
              <small>
                {isArabic
                  ? `${config.pricePerUser.toLocaleString("ar-EG")} ج.م لكل مستخدم`
                  : `${config.pricePerUser.toLocaleString("en-EG")} EGP per user`}
              </small>
            </label>

            {config.staffAddonEnabled ? (
              <label className="loginWelcomeCalcAddon">
                <input
                  type="checkbox"
                  checked={staffAddon}
                  onChange={(e) => setStaffAddon(e.target.checked)}
                />
                <span>
                  <strong>{isArabic ? config.staffAddonTitleAr : config.staffAddonTitleEn}</strong>
                  <em>
                    {isArabic ? config.staffAddonDescAr : config.staffAddonDescEn}
                  </em>
                  <b>
                    {isArabic
                      ? `+ ${config.staffAddonPrice.toLocaleString("ar-EG")} ج.م / شهر`
                      : `+ ${config.staffAddonPrice.toLocaleString("en-EG")} EGP / month`}
                  </b>
                </span>
              </label>
            ) : null}
          </div>

          <div className="loginWelcomeCalcTotal">
            <div>
              <span>{isArabic ? "الإجمالي الشهري" : "Monthly total"}</span>
              <strong>{formatPrice(quote.monthlyPrice, isArabic)}</strong>
            </div>
            <p>
              {isArabic
                ? `${quote.branches} فروع · ${quote.users} مستخدم${quote.staffAddon ? " · موظفين" : ""} · تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم بعد الموافقة`
                : `${quote.branches} branches · ${quote.users} users${quote.staffAddon ? " · staff" : ""} · ${TRIAL_SUBSCRIPTION_DAYS}-day trial after agree`}
            </p>
            <button type="button" className="loginWelcomePrimary" onClick={handleAgree}>
              {isArabic ? "موافق وبدء التجربة" : "Agree & start trial"}
            </button>
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
