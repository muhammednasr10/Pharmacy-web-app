import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { CashierShift } from "../types";

type PosQuickSaleCardProps = {
  open: boolean;
  isArabic: boolean;
  activeShift: CashierShift | null;
  branchLabel?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function PosQuickSaleCard({
  open,
  isArabic,
  activeShift,
  branchLabel,
  onClose,
  children,
}: PosQuickSaleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const syncFullscreenState = useCallback(() => {
    setIsFullscreen(document.fullscreenElement === cardRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      if (document.fullscreenElement === cardRef.current) {
        void document.exitFullscreen?.();
      }
      setIsFullscreen(false);
    }
  }, [open]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, [syncFullscreenState]);

  async function toggleFullscreen() {
    const element = cardRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch {
      setIsFullscreen((current) => !current);
    }
  }

  if (!open) return null;

  const useCssFullscreen = isFullscreen && document.fullscreenElement !== cardRef.current;

  return (
    <div
      className={`posQuickSaleOverlay${useCssFullscreen ? " is-fullscreen" : ""}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !useCssFullscreen) {
          onClose();
        }
      }}
    >
      <div
        ref={cardRef}
        className={`posQuickSaleCard card${useCssFullscreen ? " is-css-fullscreen" : ""}`}
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
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? (isArabic ? "خروج من ملء الشاشة" : "Exit fullscreen") : isArabic ? "ملء الشاشة" : "Fullscreen"}
              aria-label={isFullscreen ? (isArabic ? "خروج من ملء الشاشة" : "Exit fullscreen") : isArabic ? "ملء الشاشة" : "Fullscreen"}
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

        <div className="posQuickSaleCardBody">{children}</div>
      </div>
    </div>
  );
}
