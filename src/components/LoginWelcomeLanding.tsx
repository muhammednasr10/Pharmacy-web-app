import type { FormEvent } from "react";
import DeveloperCredit from "./DeveloperCredit";
import LoginWelcomeActionsCard from "./login-welcome/LoginWelcomeActionsCard";
import LoginWelcomeCalculatorCard from "./login-welcome/LoginWelcomeCalculatorCard";
import LoginWelcomeHero from "./login-welcome/LoginWelcomeHero";
import LoginWelcomeProgramPages from "./login-welcome/LoginWelcomeProgramPages";
import LoginWelcomeSignupCard from "./login-welcome/LoginWelcomeSignupCard";
import LoginWelcomeTopbar from "./login-welcome/LoginWelcomeTopbar";
import type { LoginWelcomeLandingProps } from "./login-welcome/types";
import { usePricingCalculatorState } from "./login-welcome/usePricingCalculatorState";

export type { LoginWelcomeLandingProps } from "./login-welcome/types";

export default function LoginWelcomeLanding({
  isArabic,
  t,
  resolvedTheme,
  onToggleTheme,
  onToggleLang,
  onSignIn,
  loginEmail,
  loginPassword,
  registerName,
  registerPharmacyName,
  registerPhone,
  registerAddress,
  loginError,
  registerSuccess,
  registering,
  onEmailChange,
  onPasswordChange,
  onRegisterNameChange,
  onRegisterPharmacyNameChange,
  onRegisterPhoneChange,
  onRegisterAddressChange,
  onRegisterSubmit,
}: LoginWelcomeLandingProps) {
  const pricing = usePricingCalculatorState();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    pricing.persistQuote();
    onRegisterSubmit(event);
  }

  return (
    <div className="loginWelcomePage" dir={isArabic ? "rtl" : "ltr"}>
      <LoginWelcomeTopbar
        isArabic={isArabic}
        langButton={t.langButton}
        resolvedTheme={resolvedTheme}
        onToggleTheme={onToggleTheme}
        onToggleLang={onToggleLang}
        onSignIn={onSignIn}
      />

      <main className="loginWelcomeMain">
        <LoginWelcomeHero isArabic={isArabic} />

        <LoginWelcomeProgramPages
          isArabic={isArabic}
          staffAddonEnabled={pricing.staffAddon}
          customersAddonEnabled={pricing.customersAddon}
          investmentAddonEnabled={pricing.investmentAddon}
        />

        <LoginWelcomeSignupCard
          isArabic={isArabic}
          loginEmail={loginEmail}
          loginPassword={loginPassword}
          registerName={registerName}
          registerPharmacyName={registerPharmacyName}
          registerPhone={registerPhone}
          registerAddress={registerAddress}
          onEmailChange={onEmailChange}
          onPasswordChange={onPasswordChange}
          onRegisterNameChange={onRegisterNameChange}
          onRegisterPharmacyNameChange={onRegisterPharmacyNameChange}
          onRegisterPhoneChange={onRegisterPhoneChange}
          onRegisterAddressChange={onRegisterAddressChange}
          onSubmit={handleSubmit}
        />

        <LoginWelcomeCalculatorCard
          isArabic={isArabic}
          config={pricing.config}
          branches={pricing.branches}
          users={pricing.users}
          staffAddon={pricing.staffAddon}
          customersAddon={pricing.customersAddon}
          investmentAddon={pricing.investmentAddon}
          billingCycle={pricing.billingCycle}
          quote={pricing.quote}
          onBranchesChange={pricing.setBranches}
          onUsersChange={pricing.setUsers}
          onStaffAddonChange={pricing.setStaffAddon}
          onCustomersAddonChange={pricing.setCustomersAddon}
          onInvestmentAddonChange={pricing.setInvestmentAddon}
          onBillingCycleChange={pricing.setBillingCycle}
        />

        <LoginWelcomeActionsCard
          isArabic={isArabic}
          loginError={loginError}
          registerSuccess={registerSuccess}
          registering={registering}
          onSignIn={onSignIn}
        />
      </main>

      <footer className="loginWelcomeFooter">
        <DeveloperCredit isArabic={isArabic} variant="login" />
      </footer>
    </div>
  );
}
