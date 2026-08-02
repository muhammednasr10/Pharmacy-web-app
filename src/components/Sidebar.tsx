import { useEffect, useState } from "react";
import type { Page } from "../types";
import { useSubscriptionOptional } from "../contexts/SubscriptionContext";
import DeveloperCredit from "./DeveloperCredit";
import {
  BILLING_NAV_GROUP_ID,
  buildNavigationTree,
  isBillingNavPage,
  pageIcons,
  type NavPageEntry,
} from "../utils/navigation";

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
  pageBadges?: Partial<Record<Page, number>>;
};

function groupBadgeTotal(
  children: NavPageEntry[],
  pageBadges?: Partial<Record<Page, number>>,
) {
  if (!pageBadges) return 0;
  return children.reduce((sum, child) => sum + (pageBadges[child.page] || 0), 0);
}

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
  pageBadges,
}: SidebarProps) {
  const subscription = useSubscriptionOptional();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const navPages = subscription?.navPages ?? allowedPages;
  const lockedPages = new Set(
    navPages.filter((page) => subscription?.isRouteLocked(page) ?? false),
  );

  const navigation = buildNavigationTree(navPages, isArabic, t, lockedPages);

  useEffect(() => {
    if (!isBillingNavPage(activePage)) return;
    setExpandedGroups((prev) => {
      if (prev.has(BILLING_NAV_GROUP_ID)) return prev;
      const next = new Set(prev);
      next.add(BILLING_NAV_GROUP_ID);
      return next;
    });
  }, [activePage]);

  const handleSelect = (page: Page, locked: boolean) => {
    if (locked) {
      subscription?.openUpgradeModal({ type: "page", key: page });
      return;
    }
    onSelectPage(page);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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
            {navigation.map((entry) => {
              if (entry.kind === "page") {
                return (
                  <button
                    key={entry.page}
                    className={`sidebarNavItem ${activePage === entry.page && !entry.locked ? "active" : ""} ${entry.locked ? "is-tier-locked" : ""}`}
                    onClick={() => handleSelect(entry.page, Boolean(entry.locked))}
                    type="button"
                    aria-disabled={entry.locked || undefined}
                  >
                    <span className="sidebarIcon">{pageIcons[entry.page] || "•"}</span>
                    <span className="sidebarLabel">{entry.label}</span>
                    {entry.locked ? (
                      <span className="sidebarLockIcon" aria-hidden="true">
                        🔒
                      </span>
                    ) : null}
                    {!entry.locked && pageBadges?.[entry.page] ? (
                      <span className="sidebarNavBadge">{pageBadges[entry.page]}</span>
                    ) : null}
                  </button>
                );
              }

              const isGroupActive = entry.children.some(
                (child) => child.page === activePage && !child.locked,
              );
              const isExpanded = expandedGroups.has(entry.id) || isGroupActive;
              const groupBadge = groupBadgeTotal(entry.children, pageBadges);
              const allChildrenLocked =
                entry.children.length > 0 && entry.children.every((child) => child.locked);

              return (
                <div key={entry.id} className="sidebarNavGroup">
                  <button
                    type="button"
                    className={`sidebarNavItem sidebarNavGroupToggle ${isGroupActive ? "active" : ""} ${allChildrenLocked ? "is-tier-locked" : ""}`}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      if (allChildrenLocked) {
                        const first = entry.children[0];
                        if (first) subscription?.openUpgradeModal({ type: "page", key: first.page });
                        return;
                      }
                      toggleGroup(entry.id);
                    }}
                  >
                    <span className="sidebarIcon">{entry.icon}</span>
                    <span className="sidebarLabel">{entry.label}</span>
                    <span className={`sidebarNavChevron${isExpanded ? " expanded" : ""}`} aria-hidden>
                      ▾
                    </span>
                    {groupBadge > 0 ? <span className="sidebarNavBadge">{groupBadge}</span> : null}
                  </button>
                  {isExpanded ? (
                    <div className="sidebarNavGroupChildren">
                      {entry.children.map((child) => (
                        <button
                          key={child.page}
                          type="button"
                          className={`sidebarNavItem sidebarNavSubItem ${activePage === child.page && !child.locked ? "active" : ""} ${child.locked ? "is-tier-locked" : ""}`}
                          onClick={() => handleSelect(child.page, Boolean(child.locked))}
                          aria-disabled={child.locked || undefined}
                        >
                          <span className="sidebarIcon">{pageIcons[child.page] || "•"}</span>
                          <span className="sidebarLabel">{child.label}</span>
                          {child.locked ? (
                            <span className="sidebarLockIcon" aria-hidden="true">
                              🔒
                            </span>
                          ) : null}
                          {!child.locked && pageBadges?.[child.page] ? (
                            <span className="sidebarNavBadge">{pageBadges[child.page]}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="sidebarFooter">
            <DeveloperCredit isArabic={isArabic} variant="sidebar" />
          </div>
        </div>
      </aside>
    </>
  );
}
