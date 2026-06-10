type TierUpgradeNoticeProps = {
  isArabic: boolean;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
};

export default function TierUpgradeNotice({
  isArabic,
  message,
  onAction,
  actionLabel,
}: TierUpgradeNoticeProps) {
  return (
    <div className="tierUpgradeNotice" role="status">
      <p>{message}</p>
      {onAction ? (
        <button type="button" className="smallBtn" onClick={onAction}>
          {actionLabel || (isArabic ? "الاشتراك والباقة" : "Subscription & plan")}
        </button>
      ) : null}
    </div>
  );
}
