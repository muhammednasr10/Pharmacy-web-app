import type { AppUser, Page } from "../types";

type SidebarProps = {
  appUser: AppUser | null;
  activePage: Page;
  setActivePage: (page: Page) => void;
  allowedPages: Page[];
  isArabic: boolean;
  t: Record<string, string>;
  pharmacyName: string;
  pharmacyPhone: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
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
  settings: "⚙️",
};

export default function Sidebar({
  activePage,
  allowedPages,
  isArabic,
  t,
  pharmacyName,
  pharmacyPhone,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onSelectPage,
}: SidebarProps) {
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
      case "settings":
        return { page, label: isArabic ? "الإعدادات" : "Settings" };
      default:
        return { page, label: pageLabels[page] };
    }
  });

  return (
    <>
      <div
        className={`sidebarOverlay ${mobileOpen ? "visible" : ""}`}
        onClick={onCloseMobile}
      />
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="sidebarHeader">
          <div className="logo">
            <div className="logoIcon logoImageBox">F</div>
            {!collapsed && (
              <div>
                <h2>{pharmacyName}</h2>
                <p>{pharmacyPhone}</p>
              </div>
            )}
          </div>

          <button
            className="sidebarCollapseBtn"
            onClick={onToggleCollapse}
            aria-label={isArabic ? "طي الشريط الجانبي" : "Toggle Sidebar"}
            type="button"
          >
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
      </aside>
    </>
  );
}
