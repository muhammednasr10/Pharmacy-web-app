type SubscriptionReadOnlyBannerProps = {
  isArabic: boolean;
  isVisible: boolean;
  subscriptionEndDate?: string;
  onRenew?: () => void;
};

export default function SubscriptionReadOnlyBanner({
  isArabic,
  isVisible,
  subscriptionEndDate,
  onRenew,
}: SubscriptionReadOnlyBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="subscriptionReadOnlyBanner" role="status">
      <div className="subscriptionReadOnlyBannerMain">
        <strong>
          {isArabic
            ? "انتهى الاشتراك — وضع عرض البيانات فقط"
            : "Subscription ended — view-only mode"}
        </strong>
        <p>
          {isArabic
            ? "يمكنك تصفح بياناتك السابقة (مخزون، فواتير، تقارير). لا يمكن إضافة أو تعديل أو حذف سجلات جديدة حتى تجديد الاشتراك."
            : "You can browse your existing data (inventory, invoices, reports). Adding, editing, or deleting records is disabled until you renew."}
          {subscriptionEndDate
            ? isArabic
              ? ` انتهى في: ${subscriptionEndDate}.`
              : ` Ended on: ${subscriptionEndDate}.`
            : ""}
        </p>
      </div>
      {onRenew ? (
        <button type="button" className="subscriptionReadOnlyBannerBtn" onClick={onRenew}>
          {isArabic ? "تجديد الاشتراك" : "Renew subscription"}
        </button>
      ) : null}
    </div>
  );
}
