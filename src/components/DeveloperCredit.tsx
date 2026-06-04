import { developerInfo, whatsappLink } from "../branding";

type DeveloperCreditProps = {
  isArabic: boolean;
  variant?: "login" | "sidebar" | "inline" | "topbar";
};

export default function DeveloperCredit({ isArabic, variant = "inline" }: DeveloperCreditProps) {
  const waMessage = isArabic
    ? "السلام عليكم، حابب أستفسر عن نظام إدارة الصيدلية"
    : "Hello, I'd like to ask about the pharmacy management system";

  return (
    <div className={`devCredit devCredit-${variant}`}>
      <span className="devCreditName">
        {isArabic ? "تطوير" : "Developed by"}: {developerInfo.name}
      </span>
      <a className="devCreditPhone" href={`tel:${developerInfo.phone}`} dir="ltr">
        {developerInfo.phone}
      </a>
      <a
        className="devCreditWa"
        href={whatsappLink(waMessage)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span aria-hidden="true">🟢</span>
        <span>{isArabic ? "تواصل معنا على الواتساب" : "Contact us on WhatsApp"}</span>
      </a>
    </div>
  );
}
