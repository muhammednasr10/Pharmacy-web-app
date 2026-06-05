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
      {variant === "topbar" ? (
        <>
          <div className="devCreditTopbarHead">
            <span className="devCreditTopbarIcon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div className="devCreditTopbarText">
              <span className="devCreditLabel">
                {isArabic ? "الدعم الفني والتطوير" : "Support & development"}
              </span>
              <span className="devCreditName">{developerInfo.name}</span>
              <a className="devCreditPhone" href={`tel:${developerInfo.phone}`} dir="ltr">
                {developerInfo.phone}
              </a>
            </div>
          </div>
          <a
            className="devCreditWaBtn"
            href={whatsappLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
            <span>{isArabic ? "واتساب" : "WhatsApp"}</span>
          </a>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
