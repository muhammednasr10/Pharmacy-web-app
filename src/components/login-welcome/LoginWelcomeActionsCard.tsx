import { LOGIN_WELCOME_SIGNUP_FORM_ID } from "./types";

type LoginWelcomeActionsCardProps = {
  isArabic: boolean;
  loginError: string;
  registerSuccess: string;
  registering: boolean;
  onSignIn: () => void;
};

export default function LoginWelcomeActionsCard({
  isArabic,
  loginError,
  registerSuccess,
  registering,
  onSignIn,
}: LoginWelcomeActionsCardProps) {
  return (
    <section className="loginWelcomeActionsCard" aria-label={isArabic ? "بدء التجربة" : "Start trial"}>
      {loginError ? <div className="loginError">{loginError}</div> : null}
      {registerSuccess ? <div className="loginSuccess">{registerSuccess}</div> : null}

      <div className="loginWelcomeActionsCardButtons">
        <button
          type="submit"
          form={LOGIN_WELCOME_SIGNUP_FORM_ID}
          data-testid="login-submit"
          className="loginWelcomePrimary"
          disabled={registering}
        >
          {registering
            ? isArabic
              ? "جاري إنشاء الحساب..."
              : "Creating account..."
            : isArabic
              ? "إنشاء الحساب وبدء التجربة"
              : "Create account & start trial"}
        </button>

        <button type="button" className="loginWelcomeSecondary" onClick={onSignIn}>
          {isArabic ? "لديك حساب؟ تسجيل الدخول" : "Already have an account? Sign in"}
        </button>
      </div>
    </section>
  );
}
