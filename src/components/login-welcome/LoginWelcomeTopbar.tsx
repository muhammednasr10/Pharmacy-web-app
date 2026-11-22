type LoginWelcomeTopbarProps = {
  isArabic: boolean;
  langButton: string;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onSignIn: () => void;
};

export default function LoginWelcomeTopbar({
  isArabic,
  langButton,
  resolvedTheme,
  onToggleTheme,
  onToggleLang,
  onSignIn,
}: LoginWelcomeTopbarProps) {
  return (
    <header className="loginWelcomeTopbar">
      <div className="loginWelcomeTopActions">
        <button
          type="button"
          className="topbarIconBtn topbarActionChip topbarActionChip--theme topbarActionChip--iconOnly"
          onClick={onToggleTheme}
          title={
            isArabic
              ? resolvedTheme === "dark"
                ? "الوضع الفاتح"
                : "الوضع الداكن"
              : resolvedTheme === "dark"
                ? "Light mode"
                : "Dark mode"
          }
          aria-label={
            isArabic
              ? resolvedTheme === "dark"
                ? "التبديل إلى الوضع الفاتح"
                : "التبديل إلى الوضع الداكن"
              : resolvedTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
          }
        >
          <span className="topbarThemeIcon" aria-hidden="true">
            {resolvedTheme === "dark" ? "☀️" : "🌙"}
          </span>
        </button>
        <button
          type="button"
          className="topbarIconBtn topbarActionChip topbarActionChip--lang topbarActionChip--iconOnly"
          onClick={onToggleLang}
          title={langButton}
          aria-label={langButton}
        >
          <span aria-hidden="true">{isArabic ? "EN" : "ع"}</span>
        </button>
        <button type="button" className="loginWelcomeSecondary loginWelcomeTopSignIn" onClick={onSignIn}>
          {isArabic ? "تسجيل الدخول" : "Sign in"}
        </button>
      </div>
    </header>
  );
}
