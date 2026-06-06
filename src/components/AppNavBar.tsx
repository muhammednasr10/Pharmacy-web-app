import { useEffect, useRef } from "react";
import type { Page } from "../types";
import { buildNavigationItems, pageIcons } from "../utils/navigation";

type AppNavBarProps = {
  activePage: Page;
  allowedPages: Page[];
  isArabic: boolean;
  t: Record<string, string>;
  onSelectPage: (page: Page) => void;
};

export default function AppNavBar({
  activePage,
  allowedPages,
  isArabic,
  t,
  onSelectPage,
}: AppNavBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const navigation = buildNavigationItems(allowedPages, isArabic, t);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeButton = track.querySelector<HTMLButtonElement>(".appNavBarItem.active");
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activePage]);

  return (
    <nav className="appNavBar" aria-label={isArabic ? "التنقل بين الصفحات" : "Page navigation"}>
      <div className="appNavBarTrack" ref={trackRef}>
        {navigation.map((item) => (
          <button
            key={item.page}
            type="button"
            className={`appNavBarItem ${activePage === item.page ? "active" : ""}`}
            onClick={() => onSelectPage(item.page)}
            aria-current={activePage === item.page ? "page" : undefined}
          >
            <span className="appNavBarIcon" aria-hidden="true">
              {pageIcons[item.page] || "•"}
            </span>
            <span className="appNavBarLabel">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
