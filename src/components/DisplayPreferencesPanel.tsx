import type { FontScale, ThemeMode } from "../utils/displayPreferences";

type DisplayPreferencesPanelProps = {
  isArabic: boolean;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  onThemeModeChange: (mode: ThemeMode) => void;
  onFontScaleChange: (scale: FontScale) => void;
  compact?: boolean;
};

const THEME_OPTIONS: { id: ThemeMode; ar: string; en: string }[] = [
  { id: "light", ar: "فاتح", en: "Light" },
  { id: "dark", ar: "داكن", en: "Dark" },
  { id: "system", ar: "حسب النظام", en: "System" },
];

const FONT_OPTIONS: { id: FontScale; ar: string; en: string; sample: string }[] = [
  { id: "normal", ar: "عادي", en: "Normal", sample: "Aa" },
  { id: "large", ar: "كبير", en: "Large", sample: "Aa" },
  { id: "xlarge", ar: "أكبر", en: "Extra large", sample: "Aa" },
];

export default function DisplayPreferencesPanel({
  isArabic,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
  compact = false,
}: DisplayPreferencesPanelProps) {
  return (
    <div className={`displayPrefsPanel ${compact ? "displayPrefsPanel--compact" : ""}`}>
      <div className="displayPrefsGroup">
        <h3>{isArabic ? "المظهر" : "Appearance"}</h3>
        <p className="displayPrefsHint">
          {isArabic
            ? "يُحفظ على هذا الجهاز فقط — لا يؤثر على باقي المستخدمين"
            : "Saved on this device only — does not affect other users"}
        </p>
        <div
          className="displayPrefsOptions"
          role="radiogroup"
          aria-label={isArabic ? "المظهر" : "Appearance"}
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={themeMode === option.id}
              className={`displayPrefsOption ${themeMode === option.id ? "active" : ""}`}
              onClick={() => onThemeModeChange(option.id)}
            >
              <span className="displayPrefsOptionLabel">{isArabic ? option.ar : option.en}</span>
              {option.id === "system" && (
                <span className="displayPrefsOptionMeta">
                  {isArabic
                    ? resolvedTheme === "dark"
                      ? "داكن الآن"
                      : "فاتح الآن"
                    : resolvedTheme === "dark"
                      ? "Dark now"
                      : "Light now"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="displayPrefsGroup">
        <h3>{isArabic ? "حجم الخط" : "Font size"}</h3>
        <p className="displayPrefsHint">
          {isArabic
            ? "مفيد لشاشة الكاشير والقراءة من مسافة بعيدة"
            : "Helpful for cashier screens and reading from a distance"}
        </p>
        <div
          className="displayPrefsOptions"
          role="radiogroup"
          aria-label={isArabic ? "حجم الخط" : "Font size"}
        >
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={fontScale === option.id}
              className={`displayPrefsOption displayPrefsOption--font displayPrefsFont-${option.id} ${
                fontScale === option.id ? "active" : ""
              }`}
              onClick={() => onFontScaleChange(option.id)}
            >
              <span className="displayPrefsFontSample" aria-hidden="true">
                {option.sample}
              </span>
              <span className="displayPrefsOptionLabel">{isArabic ? option.ar : option.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
