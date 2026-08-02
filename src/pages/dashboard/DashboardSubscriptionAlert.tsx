type DashboardSubscriptionAlertProps = {
  isArabic: boolean;
  subscriptionDaysLeft: number | null;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription: boolean;
  hasAdminRole: boolean;
  canAccessSettings: boolean;
  onOpenSubscriptionSettings: () => void;
};

export default function DashboardSubscriptionAlert({
  isArabic,
  subscriptionDaysLeft,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription,
  hasAdminRole,
  canAccessSettings,
  onOpenSubscriptionSettings,
}: DashboardSubscriptionAlertProps) {
  if (!isTrialSubscription && !isSubscriptionExpired && !isSubscriptionExpiringSoon) {
    return null;
  }

  return (
    <section
      className={
        isSubscriptionExpired
          ? "subscriptionAlert danger"
          : isSubscriptionExpiringSoon
            ? "subscriptionAlert warning"
            : "subscriptionAlert info"
      }
    >
      <strong>
        {isSubscriptionExpired
          ? isArabic
            ? isTrialSubscription
              ? "انتهت الفترة التجريبية"
              : "الاشتراك منتهي"
            : isTrialSubscription
              ? "Trial Ended"
              : "Subscription Expired"
          : isTrialSubscription
            ? isArabic
              ? "فترة تجريبية نشطة"
              : "Active Free Trial"
            : isArabic
              ? "الاشتراك قرب ينتهي"
              : "Subscription Expiring Soon"}
      </strong>
      <span>
        {isSubscriptionExpired
          ? isArabic
            ? isTrialSubscription
              ? "انتهت التجربة المجانية. اشترك للاستمرار في استخدام النظام."
              : "يرجى تجديد الاشتراك لاستمرار استخدام النظام."
            : isTrialSubscription
              ? "Your free trial has ended. Subscribe to keep using the system."
              : "Please renew the subscription to continue using the system."
          : isTrialSubscription
            ? isArabic
              ? `متبقي ${subscriptionDaysLeft} يوم على نهاية التجربة المجانية.`
              : `${subscriptionDaysLeft} days left in your free trial.`
            : isArabic
              ? `متبقي ${subscriptionDaysLeft} يوم على انتهاء الاشتراك.`
              : `${subscriptionDaysLeft} days left until subscription ends.`}
      </span>
      {hasAdminRole && canAccessSettings && (
        <div className="renewActions">
          <button type="button" className="renewBtn" onClick={onOpenSubscriptionSettings}>
            {isArabic
              ? isTrialSubscription && !isSubscriptionExpired
                ? "الاشتراك بعد التجربة"
                : "طلب تجديد اشتراك"
              : isTrialSubscription && !isSubscriptionExpired
                ? "Subscribe after trial"
                : "Request renewal"}
          </button>
        </div>
      )}
    </section>
  );
}
