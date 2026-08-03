import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { CashierShift } from "../types";

type PosQuickSaleCardProps = {
  open: boolean;
  isArabic: boolean;
  activeShift: CashierShift | null;
  branchLabel?: string;
  onClose: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  children: ReactNode;
};

export default function PosQuickSaleCard({
  open,
  isArabic,
  activeShift,
  branchLabel,
  onClose,
  onFullscreenChange,
  children,
}: PosQuickSaleCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setFullscreen = useCallback(
    (next: boolean) => {
      setIsFullscreen(next);
      onFullscreenChange?.(next);
    },
    [onFullscreenChange],
  );

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
    }
  }, [open, setFullscreen]);

  useEffect(() => {
    if (!open || !isFullscreen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setFullscreen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, isFullscreen, setFullscreen]);

  function toggleFullscreen() {
    setFullscreen(!isFullscreen);
  }

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
              className="posQuickSaleIconBtn"
              onClick={toggleFullscreen}
              title={
                isFullscreen
                  ? isArabic
                    ? "خروج من ملء الشاشة"
                    : "Exit fullscreen"
                  : isArabic
                    ? "ملء الشاشة"
                    : "Fullscreen"
              }
              aria-label={
                isFullscreen
                  ? isArabic
                    ? "خروج من ملء الشاشة"
                    : "Exit fullscreen"
                  : isArabic
                    ? "ملء الشاشة"
                    : "Fullscreen"
              }
            >
              {isFullscreen ? "⤢" : "⛶"}
            </button>
            <button
              type="button"
              className="posQuickSaleIconBtn"
              onClick={onClose}
              title={isArabic ? "تصغير" : "Minimize"}
              aria-label={isArabic ? "تصغير" : "Minimize"}
            >
              ✕
            </button>
          </div>
        </div>

        <div className={`posQuickSaleCardBody${isFullscreen ? " is-fullscreen-body" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
