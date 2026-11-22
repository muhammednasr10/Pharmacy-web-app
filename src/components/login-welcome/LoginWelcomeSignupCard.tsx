import { useState, type FormEvent } from "react";
import { PUBLIC_SIGNUP_EMAIL_DOMAIN } from "../../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import {
  normalizePublicSignupEmail,
  signupEmailLocalPart,
} from "../../utils/publicSignupEmail";
import { LOGIN_WELCOME_SIGNUP_FORM_ID } from "./types";

type LoginWelcomeSignupCardProps = {
  isArabic: boolean;
  loginEmail: string;
  loginPassword: string;
  registerName: string;
  registerPharmacyName: string;
  registerPhone: string;
  registerAddress: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPharmacyNameChange: (value: string) => void;
  onRegisterPhoneChange: (value: string) => void;
  onRegisterAddressChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function LoginWelcomeSignupCard({
  isArabic,
  loginEmail,
  loginPassword,
  registerName,
  registerPharmacyName,
  registerPhone,
  registerAddress,
  onEmailChange,
  onPasswordChange,
  onRegisterNameChange,
  onRegisterPharmacyNameChange,
  onRegisterPhoneChange,
  onRegisterAddressChange,
  onSubmit,
}: LoginWelcomeSignupCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [managerPhone, setManagerPhone] = useState("");

  return (
    <section className="loginWelcomeSignup" aria-label={isArabic ? "صيدلية جديدة" : "New pharmacy"}>
      <div className="loginWelcomePlansHeader">
        <h2>{isArabic ? "صيدلية جديدة" : "New pharmacy"}</h2>
        <p>
          {isArabic
            ? `املأ بيانات الصيدلية، واحسب باقتك تحت، ثم أنشئ الحساب — تجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم تبدأ فورًا.`
            : `Fill pharmacy details, build your plan below, then create the account — your ${TRIAL_SUBSCRIPTION_DAYS}-day trial starts immediately.`}
        </p>
      </div>

      <form id={LOGIN_WELCOME_SIGNUP_FORM_ID} className="loginWelcomeSignupForm" onSubmit={onSubmit}>
        <div className="loginWelcomeSignupRow loginWelcomeSignupRow--pharmacy">
          <input
            type="text"
            value={registerPharmacyName}
            onChange={(e) => onRegisterPharmacyNameChange(e.target.value)}
            placeholder={isArabic ? "اسم الصيدلية" : "Pharmacy name"}
            autoComplete="organization"
            required
          />
          <input
            type="text"
            value={registerAddress}
            onChange={(e) => onRegisterAddressChange(e.target.value)}
            placeholder={isArabic ? "عنوان الصيدلية" : "Pharmacy address"}
            autoComplete="street-address"
          />
          <input
            type="tel"
            value={registerPhone}
            onChange={(e) => onRegisterPhoneChange(e.target.value)}
            placeholder={isArabic ? "رقم تليفون الصيدلية" : "Pharmacy phone"}
            autoComplete="tel"
            inputMode="tel"
            dir={registerPhone.trim() ? "ltr" : isArabic ? "rtl" : "ltr"}
            style={{ textAlign: registerPhone.trim() ? "left" : undefined }}
            required
          />
        </div>

        <div className="loginWelcomeSignupRow loginWelcomeSignupRow--manager">
          <input
            type="text"
            value={registerName}
            onChange={(e) => onRegisterNameChange(e.target.value)}
            placeholder={isArabic ? "اسم المدير" : "Manager name"}
            autoComplete="name"
            required
          />
          <input
            type="tel"
            value={managerPhone}
            onChange={(e) => setManagerPhone(e.target.value)}
            placeholder={isArabic ? "رقم التليفون" : "Phone number"}
            autoComplete="tel"
            inputMode="tel"
            dir={managerPhone.trim() ? "ltr" : isArabic ? "rtl" : "ltr"}
            style={{ textAlign: managerPhone.trim() ? "left" : undefined }}
          />
          <div className="loginWelcomeSignupFieldStack">
            <div className="loginEmailWithDomain" dir="ltr">
              <input
                type="text"
                data-testid="login-email"
                value={signupEmailLocalPart(loginEmail)}
                onChange={(e) => onEmailChange(normalizePublicSignupEmail(e.target.value))}
                placeholder={isArabic ? "اسم المستخدم" : "Username"}
                autoComplete="username"
                spellCheck={false}
                required
              />
              <span className="loginEmailDomainSuffix" aria-hidden="true">
                @{PUBLIC_SIGNUP_EMAIL_DOMAIN}
              </span>
            </div>
            <p className="loginHint loginWelcomeFieldHint">
              {isArabic
                ? `البريد سيكون: ${normalizePublicSignupEmail(loginEmail) || `name@${PUBLIC_SIGNUP_EMAIL_DOMAIN}`}`
                : `Email will be: ${normalizePublicSignupEmail(loginEmail) || `name@${PUBLIC_SIGNUP_EMAIL_DOMAIN}`}`}
            </p>
          </div>
          <div className="loginWelcomeSignupFieldStack">
            <div className="loginPasswordField">
              <input
                type={showPassword ? "text" : "password"}
                data-testid="login-password"
                value={loginPassword}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder={isArabic ? "كلمة المرور" : "Password"}
                autoComplete="new-password"
                required
                minLength={6}
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
            <p className="loginHint loginWelcomeFieldHint">
              {isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters"}
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}
