import { useEffect } from "react";

type UseGlobalSearchShortcutOptions = {
  enabled: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function useGlobalSearchShortcut({
  enabled,
  isOpen,
  onOpen,
  onClose,
}: UseGlobalSearchShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && key === "k") {
        event.preventDefault();
        if (isOpen) onClose();
        else onOpen();
        return;
      }

      if (isOpen && key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, isOpen, onOpen, onClose]);
}
