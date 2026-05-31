import type { AppUser } from "../types";

type TopbarProps = {
  title: string;
  subtitle: string;
  appUser: AppUser | null;
  isArabic: boolean;
  t: Record<string, string>;
  lang: string;
  onToggleLang: () => void;
  onLogout: () => void;
  onToggleMenu: () => void;
};

export default function Topbar({
  title,
  subtitle,
  appUser,
  isArabic,
  t,
  onToggleLang,
  onLogout,
  onToggleMenu,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbarBrand">
        <button className="menuBtn" onClick={onToggleMenu} type="button" aria-label={isArabic ? "فتح القائمة" : "Open menu"}>
          <span />
          <span />
          <span />
        </button>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="topbarActions">
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
