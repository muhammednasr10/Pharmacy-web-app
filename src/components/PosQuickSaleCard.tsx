import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { CashierShift } from "../types";

type PosQuickSaleCardProps = {
  open: boolean;
  isArabic: boolean;
  activeShift: CashierShift | null;
  branchLabel?: string;
  /** Open already filling the page (default true). */
  startFullscreen?: boolean;
  onClose: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  children: ReactNode;
};

export default function PosQuickSaleCard({
  open,
  isArabic,
  activeShift,
  branchLabel,
  startFullscreen = true,
  onClose,
  onFullscreenChange,
  children,
}: PosQuickSaleCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(startFullscreen);

  const setFullscreen = useCallback(
    (next: boolean) => {
      setIsFullscreen(next);
      onFullscreenChange?.(next);
    },
    [onFullscreenChange],
  );

  useEffect(() => {
    if (open) {
      setFullscreen(startFullscreen);
      return;
    }
    setFullscreen(false);
  }, [open, startFullscreen, setFullscreen]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (isFullscreen) {
        setFullscreen(false);
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, isFullscreen, setFullscreen, onClose]);

  if (!open) return null;

  return (
    <div
      className={`posQuickSaleOverlay${isFullscreen ? " is-fullscreen" : ""}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isFullscreen) {
          onClose();
        }
      }}
    >
      <div
        className={`posQuickSaleCard card${isFullscreen ? " is-css-fullscreen is-expanded" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={isArabic ? "بيع سريع" : "Quick sale"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="posQuickSaleCardHeader">
          <div className="posQuickSaleCardTitles">
            <h3>{isArabic ? "بيع سريع — باركود" : "Quick sale — barcode"}</h3>
            <div className="posQuickSaleCardMeta">
              {activeShift ? <span className="posQuickSaleShiftTag">{activeShift.shiftNumber}</span> : null}
              {branchLabel ? (
                <span className="mutedText">
                  {isArabic ? `مخزن ${branchLabel}` : `${branchLabel} warehouse`}
                </span>
              ) : null}
            </div>
          </div>
          <div className="posQuickSaleCardActions">
            <button
              type="button"
              className="posQuickSaleActionBtn"
              onClick={() => setFullscreen(!isFullscreen)}
              title={
                isFullscreen
                  ? isArabic
                    ? "وضع نافذة"
                    : "Windowed"
                  : isArabic
                    ? "ملء الصفحة"
                    : "Fill page"
              }
            >
              {isFullscreen
                ? isArabic
                  ? "وضع نافذة"
                  : "Windowed"
                : isArabic
                  ? "ملء الصفحة"
                  : "Fill page"}
            </button>
            <button
              type="button"
              className="posQuickSaleActionBtn"
              onClick={onClose}
              title={isArabic ? "طي كارت البيع" : "Collapse sale card"}
            >
              {isArabic ? "طي" : "Collapse"}
            </button>
            <button
              type="button"
              className="posQuickSaleActionBtn posQuickSaleActionBtn--danger"
              onClick={onClose}
              title={isArabic ? "إغلاق كارت البيع" : "Close sale card"}
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>

        <div className={`posQuickSaleCardBody${isFullscreen ? " is-fullscreen-body" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
