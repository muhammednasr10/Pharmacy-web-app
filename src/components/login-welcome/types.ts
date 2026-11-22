import type { FormEvent } from "react";

export type LoginWelcomeLandingProps = {
  isArabic: boolean;
  t: Record<string, string>;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onSignIn: () => void;
  loginEmail: string;
  loginPassword: string;
  registerName: string;
  registerPharmacyName: string;
  registerPhone: string;
  registerAddress: string;
  loginError: string;
  registerSuccess: string;
  registering: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterNameChange: (value: string) => void;
  onRegisterPharmacyNameChange: (value: string) => void;
  onRegisterPhoneChange: (value: string) => void;
  onRegisterAddressChange: (value: string) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const LOGIN_WELCOME_SIGNUP_FORM_ID = "login-welcome-signup-form";
