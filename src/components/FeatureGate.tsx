import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { TierFeatureKey } from "../config/subscriptionTiers";
import { useSubscriptionOptional } from "../contexts/SubscriptionContext";
import type { Page } from "../types";

type FeatureGateProps = {
  /** Granular feature flag (e.g. branchTransfers). */
  feature?: TierFeatureKey;
  /** Page route key (e.g. branches). */
  page?: Page;
  children: ReactNode;
  /** hide = render nothing when locked; lock = show dimmed wrapper (default). */
  mode?: "hide" | "lock";
  className?: string;
};

export default function FeatureGate({
  feature,
  page,
  children,
  mode = "lock",
  className = "",
}: FeatureGateProps) {
  const subscription = useSubscriptionOptional();

  if (!subscription) {
    return <>{children}</>;
  }

  const { isFeatureAllowed, isRouteAllowed, openUpgradeModal } = subscription;

  const allowed = feature
    ? isFeatureAllowed(feature)
    : page
      ? isRouteAllowed(page)
      : true;

  if (allowed) {
    return <>{children}</>;
  }

  if (mode === "hide") {
    return null;
  }

  const target = feature ? { type: "feature" as const, key: feature } : { type: "page" as const, key: page! };

  const handleActivate = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openUpgradeModal(target);
  };

  return (
    <div
      className={`featureGateLocked ${className}`.trim()}
      role="button"
      tabIndex={0}
      aria-disabled="true"
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          handleActivate(event);
        }
      }}
    >
      <span className="featureGateLockBadge" aria-hidden="true">
        🔒
      </span>
      <div className="featureGateLockedContent" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
