import { useEffect } from "react";

type UseGlobalSearchShortcutOptions = {
  enabled: boolean;
  onFocus: () => void;
};

export function useGlobalSearchShortcut({ enabled, onFocus }: UseGlobalSearchShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && key === "k") {
        event.preventDefault();
        onFocus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, onFocus]);
}
