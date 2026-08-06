import { useState, type FormEvent } from "react";
import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";
import AuthLoadingScreen from "./AuthLoadingScreen";
import DeveloperCredit from "./DeveloperCredit";
import DisplayPreferencesPanel from "./DisplayPreferencesPanel";

type LoginPageProps = {
  status: "loading" | "login" | "denied";
  authMode: "login" | "register";
  loginEmail: string;
  loginPassword: string;
  registerName: string;
  registerPharmacyName: string;
  loginError: string;
  registerSuccess: string;
  registering: boolean;
  isArabic: boolean;
  t: Record<string, string>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPharmacyNameChange: (value: string) => void;
  onAuthModeChange: (mode: "login" | "register") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleLang: () => void;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  onThemeModeChange: (mode: ThemeMode) => void;
  onFontScaleChange: (scale: FontScale) => void;
  onToggleTheme: () => void;
  onLogout?: () => void;
};

export default function LoginPage({
  status,
  authMode,
  loginEmail,
  loginPassword,
  registerName,
  registerPharmacyName,
  loginError,
  registerSuccess,
  registering,
  isArabic,
  t,
  onEmailChange,
  onPasswordChange,
  onRegisterNameChange,
  onRegisterPharmacyNameChange,
  onAuthModeChange,
  onSubmit,
  onRegisterSubmit,
  onToggleLang,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
  onToggleTheme,
  onLogout,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (status === "loading") {
    return <AuthLoadingScreen isArabic={isArabic} />;
  }

  if (status === "denied") {
    return (
      <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
        <div className="loginCard">
          <img
            src={VICTORY_BRAND_LOGO}
            alt={VICTORY_BRAND_TITLE}
            className="loginBrandLogo"
          />
          <h1>{isArabic ? "غير مسموح بالدخول" : "Access denied"}</h1>
          <p>
            {isArabic
              ? "حسابك غير مربوط بالنظام أو تم إيقافه"
              : "Your account is not linked to the system or is inactive"}
          </p>
          <button onClick={onLogout}>{isArabic ? "تسجيل خروج" : "Logout"}</button>
        </div>
        <DeveloperCredit isArabic={isArabic} variant="login" />
      </div>
    );
  }

  const isRegister = authMode === "register";

  return (
    <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
      <form className="loginCard" onSubmit={isRegister ? onRegisterSubmit : onSubmit}>
        <img
          src={VICTORY_BRAND_LOGO}
          alt={VICTORY_BRAND_TITLE}
          className="loginBrandLogo"
        />
        <h1>
          {isRegister
            ? isArabic
              ? "صيدلية جديدة"
              : "New pharmacy"
            : isArabic
              ? "تسجيل الدخول"
              : "Sign in"}
        </h1>
        <p>
          {isRegister
            ? isArabic
              ? "سجّل بيانات صيدليتك وابدأ نسخة تجريبية مجانية فوراً"
              : "Enter your pharmacy details and start a free trial right away"
            : isArabic
              ? "ادخل بالإيميل وكلمة المرور"
              : "Sign in with email and password"}
        </p>
        {isRegister && (
          <p className="loginTrialBadge" role="status">
            {isArabic
              ? `نسخة تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم — بدون التزام`
              : `${TRIAL_SUBSCRIPTION_DAYS}-day trial — no commitment`}
          </p>
        )}

        {isRegister && (
          <>
            <input
              type="text"
              value={registerPharmacyName}
              onChange={(e) => onRegisterPharmacyNameChange(e.target.value)}
              placeholder={isArabic ? "اسم الصيدلية" : "Pharmacy name"}
              autoComplete="organization"
            />
            <input
              type="text"
              value={registerName}
              onChange={(e) => onRegisterNameChange(e.target.value)}
              placeholder={isArabic ? "اسم المدير" : "Your full name"}
              autoComplete="name"
            />
          </>
        )}

        <input
          type="text"
          data-testid="login-email"
          value={loginEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={isArabic ? "البريد الإلكتروني" : "Email"}
          autoComplete="username"
        />
        <div className="loginPasswordField">
          <input
            type={showPassword ? "text" : "password"}
            data-testid="login-password"
            value={loginPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={isArabic ? "كلمة المرور" : "Password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          <button
            type="button"
            className="loginPasswordToggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={
              showPassword
                ? isArabic
                  ? "إخفاء كلمة المرور"
                  : "Hide password"
                : isArabic
                  ? "إظهار كلمة المرور"
                  : "Show password"
            }
            title={
              showPassword
                ? isArabic
                  ? "إخفاء كلمة المرور"
                  : "Hide password"
                : isArabic
                  ? "إظهار كلمة المرور"
                  : "Show password"
            }
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.58 10.58A2 2 0 0012 15a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 5c5.52 0 10 4.48 10 7a11.2 11.2 0 01-2.09 2.91M6.1 6.1A11.17 11.17 0 002 12c0 2.52 4.48 7 10 7 1.74 0 3.37-.45 4.8-1.24"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2 12s4.48-7 10-7 10 7 10 7-4.48 7-10 7-10-7-10-7z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            )}
          </button>
        </div>

        {isRegister && (
          <p className="loginHint">
            {isArabic
              ? "كلمة المرور 6 أحرف على الأقل — بعد الإنشاء تُفتح صيدليتك مباشرة"
              : "Password must be at least 6 characters — your pharmacy opens right after signup"}
          </p>
        )}

        {loginError && <div className="loginError">{loginError}</div>}
        {registerSuccess && <div className="loginSuccess">{registerSuccess}</div>}

        <button type="submit" data-testid="login-submit" disabled={registering}>
          {registering
            ? isArabic
              ? "جاري فتح التجربة..."
              : "Starting trial..."
            : isRegister
              ? isArabic
                ? "ابدأ التجربة المجانية"
                : "Start free trial"
              : isArabic
                ? "تسجيل الدخول"
                : "Sign in"}
        </button>

        <button
          type="button"
          className="loginLangBtn"
          onClick={() => {
            onAuthModeChange(isRegister ? "login" : "register");
          }}
        >
          {isRegister
            ? isArabic
              ? "لديك حساب؟ تسجيل الدخول"
              : "Already have an account? Sign in"
            : isArabic
              ? "صيدلية جديدة؟ ابدأ التجربة المجانية"
              : "New pharmacy? Start free trial"}
        </button>

        <div className="loginUtilityIcons">
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
            <svg
              className="topbarMetaIcon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className="loginDisplayPrefs">
        <DisplayPreferencesPanel
          isArabic={isArabic}
          themeMode={themeMode}
          fontScale={fontScale}
          resolvedTheme={resolvedTheme}
          onThemeModeChange={onThemeModeChange}
          onFontScaleChange={onFontScaleChange}
          compact
        />
      </div>

      <DeveloperCredit isArabic={isArabic} variant="login" />
    </div>
  );
}
