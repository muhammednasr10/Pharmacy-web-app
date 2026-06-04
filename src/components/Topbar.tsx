import { useEffect, useRef, useState } from "react";
import type { AppUser } from "../types";
import DeveloperCredit from "./DeveloperCredit";

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

  return (
    <header className="topbar">
      <div className="topbarBrand">
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
        <div className="topbarInfo">
          <div className="topbarTitle">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {(pharmacyPhone || pharmacyAddress) && (
            <div className="topbarPharmacyMeta">
              {pharmacyPhone && (
                <span>
                  {isArabic ? "الهاتف" : "Phone"}: <strong dir="ltr">{pharmacyPhone}</strong>
                </span>
              )}
              {pharmacyAddress && (
                <span>
                  {isArabic ? "العنوان" : "Address"}: <strong>{pharmacyAddress}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="topbarDeveloper">
          <DeveloperCredit isArabic={isArabic} variant="topbar" />
        </div>
      </div>

      <div className="topbarActions">
        {appUser?.role === "admin" && branches.length > 1 && (
          <label className="branchSwitch" title={isArabic ? "الفرع النشط" : "Active branch"}>
            <span className="branchSwitchIcon" aria-hidden="true">🏢</span>
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
            className={`alertBellBtn ${alertsOpen ? "open" : ""}`}
            onClick={() => setAlertsOpen((value) => !value)}
            aria-label={isArabic ? "التنبيهات" : "Notifications"}
            aria-expanded={alertsOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

        <div className="userBadge">
          <strong>{appUser?.name}</strong>
          <span>{appUser?.role}</span>
        </div>
        <button className="langBtn" onClick={onToggleLang}>
          {t.langButton}
        </button>
        <button className="logoutBtn" onClick={onLogout}>
          {isArabic ? "تسجيل خروج" : "Logout"}
        </button>
      </div>
    </header>
  );
}
