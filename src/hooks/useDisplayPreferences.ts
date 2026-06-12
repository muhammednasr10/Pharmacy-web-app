import { useCallback, useEffect, useState } from "react";
import {
  applyDisplayPreferences,
  readFontScale,
  readThemeMode,
  resolveThemeMode,
  saveFontScale,
  saveThemeMode,
  type FontScale,
  type ThemeMode,
} from "../utils/displayPreferences";

export function useDisplayPreferences() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());
  const [fontScale, setFontScaleState] = useState<FontScale>(() => readFontScale());
  const resolvedTheme = resolveThemeMode(themeMode);

  useEffect(() => {
    applyDisplayPreferences(themeMode, fontScale);
  }, [themeMode, fontScale]);

  useEffect(() => {
    if (themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDisplayPreferences("system", fontScale);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode, fontScale]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    saveThemeMode(mode);
    setThemeModeState(mode);
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    saveFontScale(scale);
    setFontScaleState(scale);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setThemeMode(next);
  }, [resolvedTheme, setThemeMode]);

  return {
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    toggleTheme,
  };
}
