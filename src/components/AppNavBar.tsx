import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Page } from "../types";
import { useSubscriptionOptional } from "../contexts/SubscriptionContext";
import {
  buildNavigationTree,
  pageIcons,
  type NavPageEntry,
  type NavGroupEntry,
} from "../utils/navigation";

type MenuAnchor = {
  top: number;
  insetInlineStart: number;
  minWidth: number;
};

type AppNavBarProps = {
  activePage: Page;
  allowedPages: Page[];
  isArabic: boolean;
  t: Record<string, string>;
  pageBadges?: Partial<Record<Page, number>>;
  onSelectPage: (page: Page) => void;
};

function groupBadgeTotal(
  children: NavPageEntry[],
  pageBadges?: Partial<Record<Page, number>>,
) {
  if (!pageBadges) return 0;
  return children.reduce((sum, child) => sum + (pageBadges[child.page] || 0), 0);
}

export default function AppNavBar({
  activePage,
  allowedPages,
  isArabic,
  t,
  pageBadges,
  onSelectPage,
}: AppNavBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupToggleRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const subscription = useSubscriptionOptional();
  const navPages = subscription?.navPages ?? allowedPages;
  const lockedPages = new Set(
    navPages.filter((page) => subscription?.isRouteLocked(page) ?? false),
  );
  const navigation = buildNavigationTree(navPages, isArabic, t, lockedPages);
  const openGroup = navigation.find(
    (entry): entry is NavGroupEntry => entry.kind === "group" && entry.id === openGroupId,
  );

  const updateMenuAnchor = (groupId: string | null) => {
    if (!groupId) {
      setMenuAnchor(null);
      return;
    }
    const button = groupToggleRefs.current[groupId];
    if (!button) {
      setMenuAnchor(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const isRtl = document.documentElement.dir === "rtl";
    setMenuAnchor({
      top: rect.bottom + 8,
      insetInlineStart: isRtl ? window.innerWidth - rect.right : rect.left,
      minWidth: Math.max(rect.width, 190),
    });
  };

  useLayoutEffect(() => {
    updateMenuAnchor(openGroupId);
  }, [openGroupId, activePage, isArabic]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const frameId = window.requestAnimationFrame(() => {
      const activeButton = track.querySelector<HTMLButtonElement>(
        ".appNavBarItem.active, .appNavBarGroupToggle.active",
      );
      activeButton?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activePage]);

  useEffect(() => {
    if (!openGroupId) return;
    const reposition = () => updateMenuAnchor(openGroupId);
    window.addEventListener("resize", reposition);
    trackRef.current?.addEventListener("scroll", reposition, { passive: true });
    return () => {
      window.removeEventListener("resize", reposition);
      trackRef.current?.removeEventListener("scroll", reposition);
    };
  }, [openGroupId]);

  useEffect(() => {
    if (!openGroupId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(".appNavBarGroup") ||
        target?.closest(".appNavBarGroupMenuFloating")
      ) {
        return;
      }
      setOpenGroupId(null);
      setMenuAnchor(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openGroupId]);

  const handleSelect = (page: Page, locked: boolean) => {
    if (locked) {
      subscription?.openUpgradeModal({ type: "page", key: page });
      return;
    }
    setOpenGroupId(null);
    setMenuAnchor(null);
    onSelectPage(page);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroupId((current) => {
      const next = current === groupId ? null : groupId;
      if (!next) setMenuAnchor(null);
      return next;
    });
  };

  return (
    <nav className="appNavBar" aria-label={isArabic ? "التنقل بين الصفحات" : "Page navigation"}>
      <div className="appNavBarTrack" ref={trackRef}>
        {navigation.map((entry) => {
          if (entry.kind === "page") {
            return (
              <button
                key={entry.page}
                type="button"
                className={`appNavBarItem ${activePage === entry.page && !entry.locked ? "active" : ""} ${entry.locked ? "is-tier-locked" : ""}`}
                onClick={() => handleSelect(entry.page, Boolean(entry.locked))}
                aria-current={activePage === entry.page && !entry.locked ? "page" : undefined}
                aria-disabled={entry.locked || undefined}
              >
                <span className="appNavBarIcon" aria-hidden="true">
                  {pageIcons[entry.page] || "•"}
                </span>
                <span className="appNavBarLabel">{entry.label}</span>
                {entry.locked ? (
                  <span className="appNavBarLockIcon" aria-hidden="true">
                    🔒
                  </span>
                ) : null}
                {!entry.locked && pageBadges?.[entry.page] ? (
                  <span className="appNavBarBadge">{pageBadges[entry.page]}</span>
                ) : null}
              </button>
            );
          }

          const isGroupActive = entry.children.some(
            (child) => child.page === activePage && !child.locked,
          );
          const isOpen = openGroupId === entry.id;
          const groupBadge = groupBadgeTotal(entry.children, pageBadges);
          const activeChild = entry.children.find((child) => child.page === activePage);
          const allChildrenLocked =
            entry.children.length > 0 && entry.children.every((child) => child.locked);

          return (
            <div key={entry.id} className={`appNavBarGroup${isOpen ? " open" : ""}`}>
              <button
                ref={(node) => {
                  groupToggleRefs.current[entry.id] = node;
                }}
                type="button"
                className={`appNavBarItem appNavBarGroupToggle ${isGroupActive ? "active" : ""} ${allChildrenLocked ? "is-tier-locked" : ""}`}
                aria-expanded={isOpen}
                onClick={() => {
                  if (allChildrenLocked) {
                    const first = entry.children[0];
                    if (first) subscription?.openUpgradeModal({ type: "page", key: first.page });
                    return;
                  }
                  toggleGroup(entry.id);
                }}
              >
                <span className="appNavBarIcon" aria-hidden="true">
                  {entry.icon}
                </span>
                <span className="appNavBarLabel">
                  {isGroupActive && activeChild ? activeChild.label : entry.label}
                </span>
                <span className={`appNavBarChevron${isOpen ? " expanded" : ""}`} aria-hidden>
                  ▾
                </span>
                {groupBadge > 0 ? <span className="appNavBarBadge">{groupBadge}</span> : null}
              </button>
            </div>
          );
        })}
      </div>

      {openGroup && menuAnchor ? (
        <div
          className="appNavBarGroupMenu appNavBarGroupMenuFloating"
          role="menu"
          style={{
            position: "fixed",
            top: menuAnchor.top,
            insetInlineStart: menuAnchor.insetInlineStart,
            minWidth: menuAnchor.minWidth,
          }}
        >
          <div className="appNavBarGroupMenuTitle">{openGroup.label}</div>
          {openGroup.children.map((child) => (
            <button
              key={child.page}
              type="button"
              role="menuitem"
              className={`appNavBarGroupMenuItem ${activePage === child.page && !child.locked ? "active" : ""} ${child.locked ? "is-tier-locked" : ""}`}
              onClick={() => handleSelect(child.page, Boolean(child.locked))}
              aria-disabled={child.locked || undefined}
            >
              <span className="appNavBarIcon" aria-hidden="true">
                {pageIcons[child.page] || "•"}
              </span>
              <span>{child.label}</span>
              {child.locked ? (
                <span className="appNavBarLockIcon" aria-hidden="true">
                  🔒
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
