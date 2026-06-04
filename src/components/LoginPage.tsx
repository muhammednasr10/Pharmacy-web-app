import type { FormEvent } from "react";
import DeveloperCredit from "./DeveloperCredit";

type LoginPageProps = {
  status: "loading" | "login" | "denied";
  loginEmail: string;
  loginPassword: string;
  loginError: string;
  isArabic: boolean;
  t: Record<string, string>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleLang: () => void;
  onLogout?: () => void;
};

export default function LoginPage({
  status,
  loginEmail,
  loginPassword,
  loginError,
  isArabic,
  t,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleLang,
  onLogout,
}: LoginPageProps) {
  if (status === "loading") {
    return (
      <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
        <div className="loginCard">
          <div className="loginLogo logoImageBox" />
          <h1>{isArabic ? "جاري التحميل..." : "Loading..."}</h1>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
        <div className="loginCard">
          <div className="loginLogo logoImageBox" />
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

  return (
    <div className="loginPage" dir={isArabic ? "rtl" : "ltr"}>
      <form className="loginCard" onSubmit={onSubmit}>
        <div className="loginLogo logoImageBox" />
        <h1>{isArabic ? "تسجيل الدخول" : "Login"}</h1>
        <p>
          {isArabic
            ? "ادخل بياناتك للوصول إلى نظام الصيدلية"
            : "Enter your credentials to access the pharmacy system"}
        </p>
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={isArabic ? "البريد الإلكتروني" : "Email"}
        />
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={isArabic ? "كلمة المرور" : "Password"}
        />
        {loginError && <div className="loginError">{loginError}</div>}
        <button type="submit">{isArabic ? "دخول" : "Login"}</button>
        <button type="button" className="loginLangBtn" onClick={onToggleLang}>
          {t.langButton}
        </button>
      </form>
      <DeveloperCredit isArabic={isArabic} variant="login" />
    </div>
  );
}
