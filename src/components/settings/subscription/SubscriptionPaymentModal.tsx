import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { SubscriptionRequest } from "../../../types";
import SubscriptionPaymentInstructions from "../../SubscriptionPaymentInstructions";

type SubscriptionPaymentModalProps = {
  isArabic: boolean;
  request: SubscriptionRequest;
  onClose: () => void;
};

function getPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("app-portal-root") || document.body;
}

export default function SubscriptionPaymentModal({
  isArabic,
  request,
  onClose,
}: SubscriptionPaymentModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const portalRoot = getPortalRoot();
  if (!portalRoot) return null;

  return createPortal(
    <div
      className="modalOverlay subscriptionPaymentOverlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="invoiceModal subscriptionPaymentModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscriptionPaymentTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <SubscriptionPaymentInstructions
          isArabic={isArabic}
          request={request}
          onClose={onClose}
        />
      </div>
    </div>,
    portalRoot,
  );
}
