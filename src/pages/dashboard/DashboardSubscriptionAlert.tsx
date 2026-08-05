import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";

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

  const daysRemaining =
    subscriptionDaysLeft != null && Number.isFinite(subscriptionDaysLeft)
      ? subscriptionDaysLeft
      : null;
  const daysLabel =
    daysRemaining != null
      ? String(daysRemaining)
      : isArabic
        ? "غير محدد"
        : "not set";

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
              ? daysRemaining != null
                ? `متبقي ${daysLabel} يوم على نهاية التجربة المجانية.`
                : `فترة تجريبية ${TRIAL_SUBSCRIPTION_DAYS} يوم — تاريخ الانتهاء غير محدد بعد.`
              : daysRemaining != null
                ? `${daysLabel} days left in your free trial.`
                : `${TRIAL_SUBSCRIPTION_DAYS}-day trial — end date not set yet.`
            : isArabic
              ? daysRemaining != null
                ? `متبقي ${daysLabel} يوم على انتهاء الاشتراك.`
                : "تاريخ انتهاء الاشتراك غير محدد."
              : daysRemaining != null
                ? `${daysLabel} days left until subscription ends.`
                : "Subscription end date is not set."}
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
