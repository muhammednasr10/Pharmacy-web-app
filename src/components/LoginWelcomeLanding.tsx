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

const PROGRAM_PAGES = [
  {
    key: "dashboard",
    ar: "لوحة التحكم",
    en: "Dashboard",
    descAr: "ملخص اليوم: مبيعات، تنبيهات مخزون، وخطوات البداية.",
    descEn: "Today's overview: sales, stock alerts, and getting-started steps.",
  },
  {
    key: "inventory",
    ar: "إدارة المخزن",
    en: "Inventory",
    descAr: "إضافة الأدوية، الجرد، الاستيراد، ومتابعة الصلاحية والرصيد.",
    descEn: "Add medicines, stock counts, import, expiry and quantity tracking.",
  },
  {
    key: "pos",
    ar: "نقطة البيع",
    en: "POS",
    descAr: "بيع سريع بالباركود أو الاسم، مع الورديات والدفع النقدي/الفيزا.",
    descEn: "Fast sales by barcode or name, with shifts and cash/card payment.",
  },
  {
    key: "invoices",
    ar: "المبيعات",
    en: "Sales",
    descAr: "سجل الفواتير والبحث والطباعة ومتابعة طرق الدفع.",
    descEn: "Invoice history, search, printing, and payment methods.",
  },
  {
    key: "purchases",
    ar: "المشتريات",
    en: "Purchases",
    descAr: "تسجيل توريد الأدوية للمخزن وتحديث الأسعار والكميات.",
    descEn: "Record stock purchases and update prices and quantities.",
  },
  {
    key: "customers",
    ar: "العملاء",
    en: "Customers",
    descAr: "CRM بسيط: بيانات العملاء والمديونيات والتحصيل.",
    descEn: "Simple CRM: customer data, debts, and collections.",
  },
  {
    key: "reports",
    ar: "التقارير",
    en: "Reports",
    descAr: "مبيعات وأرباح وتكاليف حسب الفترة والطريقة والفرع.",
    descEn: "Sales, profit, and costs by period, method, and branch.",
  },
  {
    key: "users",
    ar: "الموظفين",
    en: "Staff",
    descAr: "حسابات الموظفين والصلاحيات — تُفعَّل كإضافة في الحاسبة.",
    descEn: "Staff accounts and permissions — enabled as a calculator add-on.",
  },
  {
    key: "branches",
    ar: "الفروع",
    en: "Branches",
    descAr: "إدارة أكثر من فرع وتبديل الفرع النشط ونقل المخزون.",
    descEn: "Manage multiple branches, switch active branch, and transfer stock.",
  },
  {
    key: "settings",
    ar: "الإعدادات",
    en: "Settings",
    descAr: "بيانات الصيدلية والاشتراك وتفضيلات النظام.",
    descEn: "Pharmacy profile, subscription, and system preferences.",
  },
] as const;

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
          <button type="button" className="loginWelcomeSecondary loginWelcomeTopSignIn" onClick={onSignIn}>
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </button>
        </div>
      </header>

      <main className="loginWelcomeMain">
        <section className="loginWelcomeHero">
          <div className="loginWelcomeHeroBrandRow">
            <img src={VICTORY_BRAND_LOGO} alt={VICTORY_BRAND_TITLE} className="loginWelcomeHeroLogo" />
            <div className="loginWelcomeHeroCopy">
              <p className="loginWelcomeBrand">{VICTORY_BRAND_TITLE}</p>
              <h1>
                {isArabic
                  ? "احسب باقتك… ثم ابدأ تجربة 14 يوم فورًا"
                  : "Build your plan — then start a 14-day trial"}
              </h1>
            </div>
          </div>
          <p className="loginWelcomeLead">
            {isArabic
              ? "حدد عدد الفروع والمستخدمين والإضافات، وشوف السعر الشهري. بعد الموافقة تدخل مباشرة وتجربة 14 يوم، ومالك النظام بيعتمد الطلب خلال المدة."
              : "Choose branches, users, and add-ons to see the monthly price. After you agree you enter immediately for a 14-day trial while the owner reviews approval."}
          </p>
        </section>

        <section className="loginWelcomePages" aria-label={isArabic ? "صفحات البرنامج" : "App pages"}>
          <div className="loginWelcomePlansHeader">
            <h2>{isArabic ? "صفحات البرنامج" : "What’s inside"}</h2>
            <p>
              {isArabic
                ? "مرّر على أي صفحة عشان يظهر شرحها — مقفولة افتراضيًا عشان الشاشة تفضل بسيطة."
                : "Hover any page to reveal its short description — collapsed by default to keep the screen clean."}
            </p>
          </div>
          <ul className="loginWelcomePageList">
            {PROGRAM_PAGES.map((page) => (
              <li key={page.key} className="loginWelcomePageItem" tabIndex={0}>
                <strong>{isArabic ? page.ar : page.en}</strong>
                <span className="loginWelcomePageDesc">{isArabic ? page.descAr : page.descEn}</span>
              </li>
            ))}
          </ul>
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
                  <em>{isArabic ? config.staffAddonDescAr : config.staffAddonDescEn}</em>
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
