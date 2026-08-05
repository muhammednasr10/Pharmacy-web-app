import type { SubscriptionRequest } from "../types";
import { subscriptionPaymentInfo } from "../config/subscription";
import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import { whatsappLink } from "../branding";
import { parseTierUpgradePlan } from "../utils/subscriptionFeatures";

type SubscriptionPaymentInstructionsProps = {
  isArabic: boolean;
  request: SubscriptionRequest;
  onClose?: () => void;
};

export default function SubscriptionPaymentInstructions({
  isArabic,
  request,
  onClose,
}: SubscriptionPaymentInstructionsProps) {
  const targetTier = parseTierUpgradePlan(request.plan);
  const isTierUpgrade = Boolean(targetTier);
  const requestTypeLabel = isTierUpgrade
    ? isArabic
      ? `ترقية إلى ${getSubscriptionTierLabel(targetTier!, true)}`
      : `Upgrade to ${getSubscriptionTierLabel(targetTier!, false)}`
    : isArabic
      ? "تجديد اشتراك"
      : "Subscription renewal";

  const whatsappMessage = isTierUpgrade
    ? isArabic
      ? `مرحباً، أرسلت تحويل InstaPay لطلب ترقية الباقة.\nرقم الطلب: ${request.requestNumber}\nالصيدلية: ${request.pharmacyName || request.pharmacyId}\nالترقية: ${getSubscriptionTierLabel(targetTier!, true)}\nالمبلغ: ${request.amount} ${request.currency || subscriptionPaymentInfo.currency}`
      : `Hello, I sent an InstaPay transfer for a package upgrade.\nRequest: ${request.requestNumber}\nPharmacy: ${request.pharmacyName || request.pharmacyId}\nUpgrade: ${getSubscriptionTierLabel(targetTier!, false)}\nAmount: ${request.amount} ${request.currency || subscriptionPaymentInfo.currency}`
    : isArabic
      ? `مرحباً، أرسلت تحويل InstaPay لطلب تجديد الاشتراك.\nرقم الطلب: ${request.requestNumber}\nالصيدلية: ${request.pharmacyName || request.pharmacyId}\nالمبلغ: ${request.amount} ${request.currency || subscriptionPaymentInfo.currency}\nعدد الأيام: ${request.days}`
      : `Hello, I sent an InstaPay transfer for subscription renewal.\nRequest: ${request.requestNumber}\nPharmacy: ${request.pharmacyName || request.pharmacyId}\nAmount: ${request.amount} ${request.currency || subscriptionPaymentInfo.currency}\nDays: ${request.days}`;

  return (
    <section className="subscriptionPaymentCard">
      <div className="subscriptionPaymentHeader">
        <div>
          <h3 id="subscriptionPaymentTitle">
            {isArabic ? "تعليمات الدفع عبر InstaPay" : "InstaPay Payment Instructions"}
          </h3>
          <p>
            {isArabic
              ? "بعد إتمام التحويل، أرسل إيصال الدفع على واتساب لتفعيل الطلب"
              : "After payment, send the receipt on WhatsApp to activate your request"}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="closeBtn"
            onClick={onClose}
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="subscriptionPaymentMeta">
        <div>
          <span>{isArabic ? "رقم الطلب" : "Request #"}</span>
          <strong dir="ltr">{request.requestNumber}</strong>
        </div>
        <div>
          <span>{isArabic ? "نوع الطلب" : "Request type"}</span>
          <strong>{requestTypeLabel}</strong>
        </div>
        <div>
          <span>{isArabic ? "المبلغ المطلوب" : "Amount due"}</span>
          <strong>
            {request.amount} {request.currency || subscriptionPaymentInfo.currency}
          </strong>
        </div>
        {!isTierUpgrade && (
          <div>
            <span>{isArabic ? "مدة التجديد" : "Renewal period"}</span>
            <strong>
              {request.days} {isArabic ? "يوم" : "days"}
            </strong>
          </div>
        )}
      </div>

      <ol className="subscriptionPaymentSteps">
        <li>
          {isArabic
            ? "افتح تطبيق المحفظة أو البنك واختر InstaPay"
            : "Open your wallet or bank app and choose InstaPay"}
        </li>
        <li>
          {isArabic ? "أرسل المبلغ إلى الحساب التالي:" : "Send the amount to this account:"}
          <div className="subscriptionPaymentAccount">
            <div>
              <span>{isArabic ? "اسم المستلم" : "Recipient"}</span>
              <strong>{subscriptionPaymentInfo.instapayName}</strong>
            </div>
            <div>
              <span>{isArabic ? "رقم InstaPay" : "InstaPay number"}</span>
              <strong dir="ltr">{subscriptionPaymentInfo.instapayAccount}</strong>
            </div>
          </div>
        </li>
        <li>
          {isArabic
            ? `في ملاحظة التحويل اكتب اسم الصيدلية: ${request.pharmacyName || request.pharmacyId}`
            : `In the transfer note write the pharmacy name: ${request.pharmacyName || request.pharmacyId}`}
        </li>
        <li>
          {isArabic
            ? "أرسل لقطة شاشة الإيصال على واتساب لتأكيد الدفع"
            : "Send a screenshot of the receipt on WhatsApp to confirm payment"}
        </li>
      </ol>

      <div className="subscriptionPaymentActions">
        <a
          className="completeBtn subscriptionWhatsappBtn"
          href={whatsappLink(whatsappMessage)}
          target="_blank"
          rel="noreferrer"
        >
          {isArabic ? "إرسال الإيصال على واتساب" : "Send receipt on WhatsApp"}
        </a>
        <p className="settingsFieldHint">
          {isArabic
            ? isTierUpgrade
              ? "سيتم مراجعة طلب الترقية وتفعيل الباقة الجديدة بعد تأكيد الدفع"
              : "سيتم مراجعة طلبك وتفعيل الاشتراك بعد تأكيد الدفع"
            : isTierUpgrade
              ? "Your upgrade request will be reviewed and the new package activated after payment confirmation"
              : "Your request will be reviewed and activated after payment confirmation"}
        </p>
      </div>
    </section>
  );
}
