import type { ReactNode } from "react";

type ModalOverlayProps = {
  children: ReactNode;
  /** Extra classes, e.g. `globalSearchOverlay` */
  className?: string;
};

/** Modal backdrop — closes only via explicit close/cancel buttons, not outside clicks. */
export default function ModalOverlay({ children, className }: ModalOverlayProps) {
  const classes = className ? `modalOverlay ${className}` : "modalOverlay";
  return <div className={classes}>{children}</div>;
}
