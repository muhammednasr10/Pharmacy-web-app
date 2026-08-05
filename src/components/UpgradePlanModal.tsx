import {
  getUpgradeModalCopy,
  useSubscriptionOptional,
} from "../contexts/SubscriptionContext";

type UpgradePlanModalProps = {
  isArabic: boolean;
};

export default function UpgradePlanModal({ isArabic }: UpgradePlanModalProps) {
  const subscription = useSubscriptionOptional();
  if (!subscription) return null;

  const {
    tier,
    upgradeModalOpen,
    upgradeTarget,
    closeUpgradeModal,
    onNavigateToSubscription,
  } = subscription;

  if (!upgradeModalOpen) return null;

  const { title, message, ctaLabel, dismissLabel, nextHint } = getUpgradeModalCopy(
    tier,
    upgradeTarget,
    isArabic,
  );

  const handleUpgrade = () => {
    closeUpgradeModal();
    onNavigateToSubscription?.();
  };

  return (
    <div
      className="modalOverlay upgradePlanOverlay"
      role="presentation"
      onClick={closeUpgradeModal}
    >
      <div
        className="upgradePlanModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgradePlanTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="upgradePlanModalGlow" aria-hidden="true" />

        <div className="upgradePlanModalHeader">
          <div className="upgradePlanModalIcon" aria-hidden="true">
            🔒
          </div>
          <div>
            <h2 id="upgradePlanTitle">{title}</h2>
            <p className="upgradePlanModalHint">{nextHint}</p>
          </div>
          <button
            type="button"
            className="upgradePlanModalClose"
            onClick={closeUpgradeModal}
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            ×
          </button>
        </div>

        <p className="upgradePlanModalMessage">{message}</p>

        <div className="upgradePlanModalActions">
          <button type="button" className="upgradePlanModalDismiss" onClick={closeUpgradeModal}>
            {dismissLabel}
          </button>
          <button type="button" className="upgradePlanModalCta" onClick={handleUpgrade}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
