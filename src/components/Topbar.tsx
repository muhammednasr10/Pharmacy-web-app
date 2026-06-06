import { useEffect, useRef, useState } from "react";
import type { AppUser } from "../types";
import { isPharmacyAdmin, isSuperAdmin, getRoleLabel } from "../utils/roles";

export type AlertKind = "expired" | "low" | "expiring";

export type AlertItem = {
  id: string;
  kind: AlertKind;
  name: string;
  detail: string;
};

export type BranchOption = {
  id: string;
  name: string;
  name_en?: string;
};

type TopbarProps = {
  title: string;
  subtitle?: string;
  pharmacyLogo?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  appUser: AppUser | null;
  isArabic: boolean;
  t: Record<string, string>;
  lang: string;
  onToggleLang: () => void;
  onLogout: () => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  alertItems: AlertItem[];
  alertTotal: number;
  onAlertNavigate: (filter: "low" | "expiring" | "expired") => void;
  branches: BranchOption[];
  activeBranchId: string | null;
  onSwitchBranch: (id: string) => void;
};

const KIND_META: Record<AlertKind, { dot: string; ar: string; en: string }> = {
  expired: { dot: "#f04438", ar: "أدوية منتهية", en: "Expired" },
  low: { dot: "#f79009", ar: "نواقص المخزون", en: "Low stock" },
  expiring: { dot: "#2e90fa", ar: "قرب الانتهاء", en: "Expiring soon" },
};

export default function Topbar({
  title,
  subtitle = "",
  pharmacyLogo = "",
  pharmacyPhone = "",
  pharmacyAddress = "",
  appUser,
  isArabic,
  t,
  onToggleLang,
  onLogout,
  onToggleMenu,
  isMenuOpen,
  alertItems,
  alertTotal,
  onAlertNavigate,
  branches,
  activeBranchId,
  onSwitchBranch,
}: TopbarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!alertsOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [alertsOpen]);

  const navigate = (filter: "low" | "expiring" | "expired") => {
    onAlertNavigate(filter);
    setAlertsOpen(false);
  };

  const userInitial = (appUser?.name || "?").trim().charAt(0) || "?";
  const showBranchSwitch =
    (isSuperAdmin(appUser) || (isPharmacyAdmin(appUser) && branches.length > 1)) &&
    branches.length > 0;

  return (
    <header className="topbar">
      <button
        className={`menuBtn ${isMenuOpen ? "open" : ""}`}
        onClick={onToggleMenu}
        type="button"
        aria-label={isArabic ? (isMenuOpen ? "إغلاق القائمة" : "فتح القائمة") : isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
      >
        <span className="menuBtnLine" />
        <span className="menuBtnLine" />
        <span className="menuBtnLine" />
      </button>

      <div className="topbarIdentityCard">
          <div className="topbarPharmacyBlock">
            <div className="topbarPharmacyAvatar logoImageBox" aria-hidden="true">
              {pharmacyLogo ? (
                <img src={pharmacyLogo} alt="" />
              ) : (
                title.trim().charAt(0) || "P"
              )}
            </div>
            <div className="topbarPharmacyContent">
              <span className="topbarSectionLabel topbarPharmacyLabel">
                {isArabic ? "الصيدلية" : "Pharmacy"}
              </span>
              <h1 className="topbarPharmacyName">{title}</h1>
              {subtitle ? <p className="topbarPharmacySubtitle">{subtitle}</p> : null}
              {(pharmacyPhone || pharmacyAddress) && (
                <div className="topbarPharmacyMeta">
                  {pharmacyPhone && (
                    <div className="topbarPharmacyMetaItem">
                      <span className="topbarPharmacyMetaIcon" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path d="M9.5 7h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="topbarPharmacyMetaText" dir="ltr">
                        {pharmacyPhone}
                      </span>
                    </div>
                  )}
                  {pharmacyAddress && (
                    <div className="topbarPharmacyMetaItem">
                      <span className="topbarPharmacyMetaIcon" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                      <span className="topbarPharmacyMetaText">{pharmacyAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="topbarIdentityDivider topbarIdentityDivider--account" aria-hidden="true" />

          <div className="topbarAccountBlock">
            <div className="topbarAccountAvatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="topbarAccountContent">
              <span className="topbarSectionLabel">{isArabic ? "الحساب" : "Account"}</span>
              <strong className="topbarAccountName">{appUser?.name}</strong>
              <span className="topbarRoleChip">
                {appUser ? getRoleLabel(appUser.role, isArabic) : ""}
              </span>
            </div>
          </div>

          <div className="topbarIdentityDivider topbarIdentityDivider--actions" aria-hidden="true" />

          <div className="topbarControlsBlock">
            <span className="topbarSectionLabel">{isArabic ? "التحكم" : "Controls"}</span>
            <div className="topbarActionRow">
              {showBranchSwitch && (
                <label className="topbarMetaChip topbarBranchChip" title={isArabic ? "الفرع النشط" : "Active branch"}>
                  <svg className="topbarMetaIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 20V8l8-4 8 4v12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  <select
                    value={activeBranchId || ""}
                    onChange={(e) => onSwitchBranch(e.target.value)}
                    aria-label={isArabic ? "الفرع النشط" : "Active branch"}
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {(isArabic ? branch.name : branch.name_en) || branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="alertBell" ref={alertRef}>
                <button
                  type="button"
                  className={`topbarIconBtn alertBellBtn ${alertsOpen ? "open" : ""}`}
                  onClick={() => setAlertsOpen((value) => !value)}
                  aria-label={isArabic ? "التنبيهات" : "Notifications"}
                  aria-expanded={alertsOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3a6 6 0 0 0-6 6v3.6c0 .5-.2 1-.6 1.4L4 15.4c-.6.6-.2 1.6.7 1.6h14.6c.9 0 1.3-1 .7-1.6l-1.4-1.4a2 2 0 0 1-.6-1.4V9a6 6 0 0 0-6-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 19a2.5 2.5 0 0 0 5 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  {alertTotal > 0 && (
                    <span className="alertBadge">{alertTotal > 99 ? "99+" : alertTotal}</span>
                  )}
                </button>

                {alertsOpen && (
                  <div className="alertDropdown" dir={isArabic ? "rtl" : "ltr"}>
                    <div className="alertDropdownHeader">
                      <strong>{isArabic ? "التنبيهات" : "Notifications"}</strong>
                      <span>
                        {alertTotal} {isArabic ? "تنبيه" : "alerts"}
                      </span>
                    </div>

                    {alertItems.length === 0 ? (
                      <div className="alertEmpty">
                        {isArabic ? "لا توجد تنبيهات حالياً 🎉" : "No notifications 🎉"}
                      </div>
                    ) : (
                      <ul className="alertList">
                        {alertItems.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="alertRow"
                              onClick={() =>
                                navigate(item.kind === "expired" ? "expired" : item.kind === "low" ? "low" : "expiring")
                              }
                            >
                              <span
                                className="alertDot"
                                style={{ background: KIND_META[item.kind].dot }}
                              />
                              <span className="alertText">
                                <span className="alertName">{item.name}</span>
                                <span className="alertDetail">{item.detail}</span>
                              </span>
                              <span className="alertKindLabel">
                                {isArabic ? KIND_META[item.kind].ar : KIND_META[item.kind].en}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="alertDropdownFooter">
                      <button type="button" className="alertFooterBtn" onClick={() => navigate("low")}>
                        {isArabic ? "عرض كل النواقص في المخزون" : "View all in inventory"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="topbarActionChip topbarActionChip--lang" onClick={onToggleLang}>
                <svg className="topbarMetaIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <span>{t.langButton}</span>
              </button>

              <button type="button" className="topbarActionChip topbarActionChip--logout" onClick={onLogout}>
                <svg className="topbarMetaIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 6V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path d="M13 12H3m0 0 3-3M3 12l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isArabic ? "تسجيل خروج" : "Logout"}</span>
              </button>
            </div>
          </div>
      </div>
    </header>
  );
}
