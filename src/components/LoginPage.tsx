import type { FormEvent } from "react";
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
  googleLoading: boolean;
  isArabic: boolean;
  t: Record<string, string>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPharmacyNameChange: (value: string) => void;
  onAuthModeChange: (mode: "login" | "register") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn: () => void;
  onToggleLang: () => void;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  onThemeModeChange: (mode: ThemeMode) => void;
  onFontScaleChange: (scale: FontScale) => void;
  onToggleTheme: () => void;
  onLogout?: () => void;
};

function GoogleIcon() {
  return (
    <svg className="loginGoogleIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
  googleLoading,
  isArabic,
  t,
  onEmailChange,
  onPasswordChange,
  onRegisterNameChange,
  onRegisterPharmacyNameChange,
  onAuthModeChange,
  onSubmit,
  onRegisterSubmit,
  onGoogleSignIn,
  onToggleLang,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
  onToggleTheme,
  onLogout,
}: LoginPageProps) {
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
              ? "إنشاء حساب"
              : "Create account"
            : isArabic
              ? "تسجيل الدخول"
              : "Login"}
        </h1>
        <p>
          {isRegister
            ? isArabic
              ? `سجّل صيدليتك واحصل على تجربة مجانية ${TRIAL_SUBSCRIPTION_DAYS} يوماً`
              : `Register your pharmacy and get a free ${TRIAL_SUBSCRIPTION_DAYS}-day trial`
            : isArabic
              ? "ادخل بالإيميل وكلمة المرور أو عبر Google"
              : "Sign in with email and password or Google"}
        </p>

        <button
          type="button"
          className="loginGoogleBtn"
          disabled={googleLoading || registering}
          onClick={onGoogleSignIn}
        >
          <GoogleIcon />
          {googleLoading
            ? isArabic
              ? "جاري التحويل..."
              : "Redirecting..."
            : isRegister
              ? isArabic
                ? "المتابعة مع Google"
                : "Continue with Google"
              : isArabic
                ? "الدخول مع Google"
                : "Sign in with Google"}
        </button>

        <div className="loginDivider">{isArabic ? "أو" : "or"}</div>

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
          value={loginEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={isArabic ? "البريد الإلكتروني" : "Email"}
          autoComplete="username"
        />
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={isArabic ? "كلمة المرور" : "Password"}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />

        {isRegister && (
          <>
            <p className="loginHint">
              {isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters"}
            </p>
            <p className="loginHint">
              {isArabic
                ? `بعد التسجيل تبدأ فترة تجريبية ${TRIAL_SUBSCRIPTION_DAYS} يوماً. استخدم بريداً حقيقياً (Gmail / Outlook).`
                : `After signup you get a ${TRIAL_SUBSCRIPTION_DAYS}-day trial. Use a real email (Gmail / Outlook).`}
            </p>
          </>
        )}

        {loginError && <div className="loginError">{loginError}</div>}
        {registerSuccess && <div className="loginSuccess">{registerSuccess}</div>}

        <button type="submit" disabled={registering || googleLoading}>
          {registering
            ? isArabic
              ? "جاري الإنشاء..."
              : "Creating..."
            : isRegister
              ? isArabic
                ? "إنشاء حساب بالإيميل"
                : "Create account with email"
              : isArabic
                ? "دخول بالإيميل"
                : "Sign in with email"}
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
              ? "مستخدم جديد؟ إنشاء حساب"
              : "New user? Create account"}
        </button>

        <button type="button" className="loginLangBtn" onClick={onToggleLang}>
          {t.langButton}
        </button>

        <button type="button" className="loginLangBtn" onClick={onToggleTheme}>
          {resolvedTheme === "dark"
            ? isArabic
              ? "☀️ الوضع الفاتح"
              : "☀️ Light mode"
            : isArabic
              ? "🌙 الوضع الداكن"
              : "🌙 Dark mode"}
        </button>
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
