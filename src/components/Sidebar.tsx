import { useEffect, useState } from "react";
import type { AppUser, Page } from "../types";
import DeveloperCredit from "./DeveloperCredit";

function useMobileMenuLayout() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 950px)").matches : false
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 950px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

type SidebarProps = {
  appUser: AppUser | null;
  activePage: Page;
  setActivePage: (page: Page) => void;
  allowedPages: Page[];
  isArabic: boolean;
  t: Record<string, string>;
  pharmacyName: string;
  pharmacyPhone: string;
  isOpen: boolean;
  onCloseMenu: () => void;
  onSelectPage: (page: Page) => void;
};

const pageLabels: Record<Page, string> = {
  dashboard: "dashboard",
  inventory: "inventory",
  pos: "pos",
  invoices: "invoices",
  returns: "returns",
  purchases: "purchases",
  customers: "customers",
  reports: "reports",
  stockMovements: "stockMovements",
  activityLogs: "activityLogs",
  users: "users",
  branches: "branches",
  tenants: "tenants",
  settings: "settings",
};

const pageIcons: Record<Page, string> = {
  dashboard: "🏠",
  inventory: "🧬",
  pos: "💳",
  invoices: "🧾",
  returns: "↩️",
  purchases: "📦",
  customers: "👥",
  reports: "📊",
  stockMovements: "🔄",
  activityLogs: "📜",
  users: "👤",
  branches: "🏢",
  tenants: "🏪",
  settings: "⚙️",
};

export default function Sidebar({
  activePage,
  allowedPages,
  isArabic,
  t,
  pharmacyName,
  pharmacyPhone,
  isOpen,
  onCloseMenu,
  onSelectPage,
}: SidebarProps) {
  const isMobile = useMobileMenuLayout();
  const menuVisible = isOpen;

  const navigation: { page: Page; label: string }[] = allowedPages.map((page) => {
    switch (page) {
      case "dashboard":
        return { page, label: t.dashboard };
      case "inventory":
        return { page, label: t.inventory };
      case "pos":
        return { page, label: t.pos };
      case "invoices":
        return { page, label: t.invoices };
      case "returns":
        return { page, label: isArabic ? "المرتجعات" : "Returns" };
      case "purchases":
        return { page, label: isArabic ? "المشتريات" : "Purchases" };
      case "customers":
        return { page, label: isArabic ? "العملاء" : "Customers" };
      case "reports":
        return { page, label: t.reports };
      case "stockMovements":
        return { page, label: isArabic ? "حركة المخزون" : "Stock Movements" };
      case "activityLogs":
        return { page, label: isArabic ? "سجل النشاط" : "Activity Log" };
      case "users":
        return { page, label: isArabic ? "المستخدمين" : "Users" };
      case "branches":
        return { page, label: isArabic ? "الفروع" : "Branches" };
      case "tenants":
        return { page, label: isArabic ? "الصيدليات (SaaS)" : "Pharmacies (SaaS)" };
      case "settings":
        return { page, label: isArabic ? "الإعدادات" : "Settings" };
      default:
        return { page, label: pageLabels[page] };
    }
  });

  return (
    <>
      {isMobile && (
        <div
          className={`sidebarOverlay ${isOpen ? "visible" : ""}`}
          onClick={onCloseMenu}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar menuPanel ${menuVisible ? "open" : ""} ${isMobile ? "sidebarMobile" : "sidebarDesktop"}`}
        aria-hidden={!menuVisible}
      >
        <div className="sidebarInner">
        <div className="sidebarHeader">
          <div className="logo">
            <div className="logoIcon logoImageBox">F</div>
            <div>
              <h2>{pharmacyName}</h2>
              <p>{pharmacyPhone}</p>
            </div>
          </div>

          <button
            className={`menuCloseBtn ${!isMobile ? "menuCloseBtnDesktop" : ""}`}
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
