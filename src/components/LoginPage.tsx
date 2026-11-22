import { useEffect, useState, type FormEvent } from "react";
import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import * as pharmacyService from "../services/pharmacyService";
import type { PharmacySignupStatusLookup } from "../services/pharmacy/pharmacySignupRequestService";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";
import AuthLoadingScreen from "./AuthLoadingScreen";
import DeveloperCredit from "./DeveloperCredit";
import LoginWelcomeLanding from "./LoginWelcomeLanding";

type LoginPageProps = {
  status: "loading" | "login" | "denied";
  authMode: "login" | "register";
  loginEmail: string;
  loginPassword: string;
  registerName: string;
  registerPharmacyName: string;
  registerPhone: string;
  registerAddress: string;
  loginError: string;
  registerSuccess: string;
  registering: boolean;
  isArabic: boolean;
  t: Record<string, string>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPharmacyNameChange: (value: string) => void;
  onRegisterPhoneChange: (value: string) => void;
  onRegisterAddressChange: (value: string) => void;
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
  registerPhone,
  registerAddress,
  loginError,
  registerSuccess,
  registering,
  isArabic,
  t,
  onEmailChange,
  onPasswordChange,
  onRegisterNameChange,
  onRegisterPharmacyNameChange,
  onRegisterPhoneChange,
  onRegisterAddressChange,
  onAuthModeChange,
  onSubmit,
  onRegisterSubmit,
  onToggleLang,
  resolvedTheme,
  onToggleTheme,
  onLogout,
}: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [signupStatus, setSignupStatus] = useState<PharmacySignupStatusLookup | null>(null);
  const [signupStatusLoading, setSignupStatusLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const showSignupLanding = showWelcome || authMode === "register";

  useEffect(() => {
    if (authMode === "login" && registerSuccess) {
      setShowWelcome(false);
    }
  }, [authMode, registerSuccess]);

  useEffect(() => {
    if (status !== "login" || showSignupLanding) {
      setSignupStatus(null);
      setSignupStatusLoading(false);
      return;
    }

    const email = loginEmail.trim();
    if (!email.includes("@") || email.length < 5) {
      setSignupStatus(null);
      setSignupStatusLoading(false);
      return;
    }

    let cancelled = false;
    setSignupStatusLoading(true);
    const timer = window.setTimeout(() => {
      void pharmacyService.getPharmacySignupStatusByEmail(email).then((result) => {
        if (cancelled) return;
        setSignupStatus(result);
        setSignupStatusLoading(false);
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loginEmail, showSignupLanding, status]);

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

  if (showSignupLanding) {
    return (
      <LoginWelcomeLanding
        isArabic={isArabic}
        t={t}
        resolvedTheme={resolvedTheme}
        onToggleTheme={onToggleTheme}
        onToggleLang={onToggleLang}
        onSignIn={() => {
          onAuthModeChange("login");
          setShowWelcome(false);
        }}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        registerName={registerName}
        registerPharmacyName={registerPharmacyName}
        registerPhone={registerPhone}
        registerAddress={registerAddress}
        loginError={loginError}
        registerSuccess={registerSuccess}
        registering={registering}
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onRegisterNameChange={onRegisterNameChange}
        onRegisterPharmacyNameChange={onRegisterPharmacyNameChange}
        onRegisterPhoneChange={onRegisterPhoneChange}
        onRegisterAddressChange={onRegisterAddressChange}
        onRegisterSubmit={onRegisterSubmit}
      />
    );
  }

  const signupStatusMessage = (() => {
    if (!signupStatus) return null;
    const note = signupStatus.reviewNote?.trim();
    const req = signupStatus.requestNumber ? ` (${signupStatus.requestNumber})` : "";
    if (signupStatus.status === "pending") {
      return {
        kind: "pending" as const,
        text: isArabic
          ? `طلب التسجيل قيد الاعتماد${req} — انتظر موافقة مالك النظام ثم سجّل الدخول`
          : `Signup request pending approval${req} — wait for the system owner, then sign in`,
      };
    }
    if (signupStatus.status === "approved") {
      return {
        kind: "approved" as const,
        text: isArabic
          ? `تم اعتماد الطلب${req} — يمكنك تسجيل الدخول واستخدام البرنامج`
          : `Request approved${req} — you can sign in and use the app`,
      };
    }
    return {
      kind: "rejected" as const,
      text: isArabic
        ? `تم رفض طلب التسجيل${req}${note ? `: ${note}` : ""}`
        : `Signup request rejected${req}${note ? `: ${note}` : ""}`,
    };
  })();

  return (
    <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
      <form className="loginCard" onSubmit={onSubmit}>
        <img
          src={VICTORY_BRAND_LOGO}
          alt={VICTORY_BRAND_TITLE}
          className="loginBrandLogo"
        />
        <h1>{isArabic ? "تسجيل الدخول" : "Sign in"}</h1>
        <p>{isArabic ? "ادخل بالإيميل وكلمة المرور" : "Sign in with email and password"}</p>

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
            autoComplete="current-password"
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

        {signupStatusLoading && loginEmail.includes("@") && (
          <p className="loginHint">{isArabic ? "جاري التحقق من حالة الطلب..." : "Checking request status..."}</p>
        )}

        {signupStatusMessage && (
          <div
            className={
              signupStatusMessage.kind === "approved"
                ? "loginSuccess"
                : signupStatusMessage.kind === "pending"
                  ? "loginStatusPending"
                  : "loginError"
            }
            role="status"
          >
            {signupStatusMessage.text}
          </div>
        )}

        {loginError && <div className="loginError">{loginError}</div>}
        {registerSuccess && <div className="loginSuccess">{registerSuccess}</div>}

        <button type="submit" data-testid="login-submit">
          {isArabic ? "تسجيل الدخول" : "Sign in"}
        </button>

        <button
          type="button"
          className="loginLangBtn"
          data-testid="auth-mode-toggle"
          onClick={() => {
            onAuthModeChange("login");
            setShowWelcome(true);
          }}
        >
          {isArabic
            ? `صيدلية جديدة؟ احسب الباقة وابدأ تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم`
            : `New pharmacy? Calculate your plan & start a ${TRIAL_SUBSCRIPTION_DAYS}-day trial`}
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

      <DeveloperCredit isArabic={isArabic} variant="login" />
    </div>
  );
}
