import { useEffect, type RefObject } from "react";

type UseHardwareBarcodeScannerOptions = {
  disabled?: boolean;
  onScan: (code: string) => void;
  ignoreInputRef?: RefObject<HTMLElement | null>;
  /** Scan while other fields are focused — only skips the dedicated barcode input. */
  allowScanWhileEditing?: boolean;
  minLength?: number;
};

export function useHardwareBarcodeScanner({
  disabled = false,
  onScan,
  ignoreInputRef,
  allowScanWhileEditing = false,
  minLength = 4,
}: UseHardwareBarcodeScannerOptions) {
  useEffect(() => {
    if (disabled) return;

    let buffer = "";
    let lastKeyTime = 0;
    const scanGapMs = 80;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (ignoreInputRef?.current && target === ignoreInputRef.current) return;

      if (!allowScanWhileEditing) {
        const tag = target?.tagName || "";
        const isEditable =
          tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
        if (isEditable) return;
      }

      if (event.key === "Enter") {
        if (buffer.length >= minLength) {
          event.preventDefault();
          onScan(buffer);
          buffer = "";
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now();
        if (now - lastKeyTime > scanGapMs) buffer = "";
        lastKeyTime = now;
        buffer += event.key;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allowScanWhileEditing, disabled, ignoreInputRef, minLength, onScan]);
}
