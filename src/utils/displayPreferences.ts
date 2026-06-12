export type ThemeMode = "light" | "dark" | "system";
export type FontScale = "normal" | "large" | "xlarge";

const THEME_KEY = "pharmacy_theme_mode";
const FONT_SCALE_KEY = "pharmacy_font_scale";

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

export function readFontScale(): FontScale {
  if (typeof window === "undefined") return "normal";
  const stored = localStorage.getItem(FONT_SCALE_KEY);
  if (stored === "normal" || stored === "large" || stored === "xlarge") return stored;
  return "normal";
}

export function saveThemeMode(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
}

export function saveFontScale(scale: FontScale) {
  localStorage.setItem(FONT_SCALE_KEY, scale);
}

export function resolveThemeMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyDisplayPreferences(themeMode: ThemeMode, fontScale: FontScale) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolveThemeMode(themeMode);
  root.dataset.fontScale = fontScale;
  root.dataset.themeMode = themeMode;
}

export function initDisplayPreferences() {
  applyDisplayPreferences(readThemeMode(), readFontScale());
}
