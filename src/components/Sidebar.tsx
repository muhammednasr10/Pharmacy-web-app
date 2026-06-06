import type { Page } from "../types";
import DeveloperCredit from "./DeveloperCredit";
import { buildNavigationItems, pageIcons } from "../utils/navigation";

type SidebarProps = {
  activePage: Page;
  allowedPages: Page[];
  isArabic: boolean;
  t: Record<string, string>;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyLogo?: string;
  isOpen: boolean;
  onCloseMenu: () => void;
  onSelectPage: (page: Page) => void;
};

export default function Sidebar({
  activePage,
  allowedPages,
  isArabic,
  t,
  pharmacyName,
  pharmacyPhone,
  pharmacyLogo = "",
  isOpen,
  onCloseMenu,
  onSelectPage,
}: SidebarProps) {
  const navigation = buildNavigationItems(allowedPages, isArabic, t);

  return (
    <>
      <div
        className={`sidebarOverlay ${isOpen ? "visible" : ""}`}
        onClick={onCloseMenu}
        aria-hidden="true"
      />
      <aside
        className={`sidebar sidebarPanel ${isOpen ? "open" : ""}`}
        aria-hidden={!isOpen}
        aria-label={isArabic ? "القائمة الجانبية" : "Sidebar menu"}
      >
        <div className="sidebarInner">
          <div className="sidebarHeader">
            <div className="logo">
              <div className="logoIcon logoImageBox">
                {pharmacyLogo ? (
                  <img src={pharmacyLogo} alt="" />
                ) : (
                  pharmacyName.trim().charAt(0) || "F"
                )}
              </div>
              <div>
                <h2>{pharmacyName}</h2>
                <p>{pharmacyPhone}</p>
              </div>
            </div>

            <button
              className="menuCloseBtn"
              onClick={onCloseMenu}
              aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}
              type="button"
            >
              <span />
              <span />
            </button>
          </div>

          <nav className="sidebarNav">
            {navigation.map((item) => (
              <button
                key={item.page}
                className={`sidebarNavItem ${activePage === item.page ? "active" : ""}`}
                onClick={() => onSelectPage(item.page)}
                type="button"
              >
                <span className="sidebarIcon">{pageIcons[item.page] || "•"}</span>
                <span className="sidebarLabel">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebarFooter">
            <DeveloperCredit isArabic={isArabic} variant="sidebar" />
          </div>
        </div>
      </aside>
    </>
  );
}
