import { useEffect, useState } from "react";
import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../config/brand";
import DeveloperCredit from "./DeveloperCredit";

type AuthLoadingScreenProps = {
  isArabic: boolean;
};

const LOADING_STEPS = {
  ar: [
    "جاري التحقق من جلستك...",
    "جاري تحميل بيانات الصيدلية...",
    "جاري تجهيز لوحة التحكم...",
  ],
  en: ["Verifying your session...", "Loading pharmacy data...", "Preparing your workspace..."],
};

export default function AuthLoadingScreen({ isArabic }: AuthLoadingScreenProps) {
  const steps = isArabic ? LOADING_STEPS.ar : LOADING_STEPS.en;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="authLoadingPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="authLoadingCard">
        <div className="authLoadingGlow" aria-hidden="true" />
        <img
          src={VICTORY_BRAND_LOGO}
          alt={VICTORY_BRAND_TITLE}
          className="authLoadingLogo"
        />
        <div className="authLoadingSpinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 className="authLoadingTitle">
          {isArabic ? "جاري التحميل" : "Loading"}
        </h1>
        <p className="authLoadingStep">{steps[stepIndex]}</p>
        <p className="authLoadingHint">
          {isArabic
            ? "لحظات ويُفتح نظام Victory"
            : "Victory will open in a moment"}
        </p>
      </div>
      <DeveloperCredit isArabic={isArabic} variant="login" />
    </div>
  );
}
