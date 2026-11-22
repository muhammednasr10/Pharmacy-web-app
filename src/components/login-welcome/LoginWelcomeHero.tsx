import { VICTORY_BRAND_LOGO, VICTORY_BRAND_TITLE } from "../../config/brand";
import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";

type LoginWelcomeHeroProps = {
  isArabic: boolean;
};

export default function LoginWelcomeHero({ isArabic }: LoginWelcomeHeroProps) {
  return (
    <section className="loginWelcomeHero">
      <div className="loginWelcomeHeroBrandRow">
        <img src={VICTORY_BRAND_LOGO} alt={VICTORY_BRAND_TITLE} className="loginWelcomeHeroLogo" />
        <div className="loginWelcomeHeroCopy">
          <p className="loginWelcomeBrand">{VICTORY_BRAND_TITLE}</p>
          <h1>
            {isArabic
              ? "احسب باقتك… ثم سجّل صيدلية جديدة"
              : "Build your plan — then register your pharmacy"}
          </h1>
        </div>
      </div>
      <p className="loginWelcomeLead">
        {isArabic
          ? `حدّد الفروع والمستخدمين والإضافات، وشوف السعر الشهري، وبعدين سجّل الحساب في نفس الصفحة. التجربة ${TRIAL_SUBSCRIPTION_DAYS} يوم تبدأ فور التسجيل.`
          : `Choose branches, users, and add-ons to see the monthly price, then register on the same page. Your ${TRIAL_SUBSCRIPTION_DAYS}-day trial starts right after signup.`}
      </p>
    </section>
  );
}
