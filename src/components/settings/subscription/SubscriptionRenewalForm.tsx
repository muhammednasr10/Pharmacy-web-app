import type { RequestPlan } from "./types";
import { buildRequestPlanOptions } from "./subscriptionSettingsHelpers";

type RequestPlanOption = ReturnType<typeof buildRequestPlanOptions>[number];

type SubscriptionRenewalFormProps = {
  isArabic: boolean;
  requestPlan: RequestPlan;
  onRequestPlanChange: (plan: RequestPlan) => void;
  requestPlanOptions: RequestPlanOption[];
  customDays: number;
  onCustomDaysChange: (days: number) => void;
  requestDays: number;
  requestAmount: number;
  submittingRequest: boolean;
  onSubmit: () => void;
};

export default function SubscriptionRenewalForm({
  isArabic,
  requestPlan,
  onRequestPlanChange,
  requestPlanOptions,
  customDays,
  onCustomDaysChange,
  requestDays,
  requestAmount,
  submittingRequest,
  onSubmit,
}: SubscriptionRenewalFormProps) {
  return (
    <section className="subscriptionEditCard">
      <div className="subscriptionEditHeader">
        <span className="subscriptionEditHeaderIcon" aria-hidden="true">
          📝
        </span>
        <div>
          <h3>{isArabic ? "طلب تجديد اشتراك" : "Request Subscription Renewal"}</h3>
          <p>
            {isArabic
              ? "اختر الخطة أو عدد الأيام، ثم أرسل الطلب واتبع تعليمات InstaPay"
              : "Choose a plan or number of days, submit the request, then follow InstaPay instructions"}
          </p>
        </div>
      </div>

      <div className="subscriptionEditBody">
        <div className="subscriptionEditField">
          <label>{isArabic ? "خطة الاشتراك المطلوبة" : "Requested plan"}</label>
          <div
            className="subscriptionPlanGrid"
            role="radiogroup"
            aria-label={isArabic ? "خطة الاشتراك" : "Subscription plan"}
          >
            {requestPlanOptions.map((plan) => {
              const selected = requestPlan === plan.value;
              return (
                <button
                  key={plan.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`subscriptionPlanOption${selected ? " selected" : ""}`}
                  onClick={() => onRequestPlanChange(plan.value)}
                >
                  <span className="subscriptionPlanCheck" aria-hidden="true">
                    {selected ? "✓" : ""}
                  </span>
                  <strong>{plan.label}</strong>
                  <small>{plan.hint}</small>
                </button>
              );
            })}
          </div>
        </div>

        {requestPlan === "custom" && (
          <div className="subscriptionEditField">
            <label>{isArabic ? "عدد أيام التجديد" : "Renewal days"}</label>
            <div className="subscriptionDateInputWrap">
              <span className="subscriptionFieldIcon" aria-hidden="true">
                #
              </span>
              <input
                type="number"
                min={7}
                max={730}
                value={customDays}
                onChange={(e) => onCustomDaysChange(Number(e.target.value) || 7)}
              />
            </div>
            <p className="settingsFieldHint">
              {isArabic
                ? "حدد عدد الأيام التي تريد تمديد الاشتراك بها (7 إلى 730 يوم)"
                : "Set how many days to extend the subscription (7 to 730 days)"}
            </p>
          </div>
        )}

        <div className="subscriptionRequestSummary">
          <div>
            <span>{isArabic ? "مدة التجديد" : "Period"}</span>
            <strong>
              {requestDays} {isArabic ? "يوم" : "days"}
            </strong>
          </div>
          <div>
            <span>{isArabic ? "المبلغ المطلوب" : "Amount"}</span>
            <strong>
              {requestAmount} {isArabic ? "ج.م" : "EGP"}
            </strong>
          </div>
        </div>

        <div className="subscriptionSaveBar">
          <button
            type="button"
            className="completeBtn subscriptionSaveBtn"
            disabled={submittingRequest}
            onClick={() => void onSubmit()}
          >
            {submittingRequest
              ? isArabic
                ? "جاري إرسال الطلب..."
                : "Submitting..."
              : isArabic
                ? "إرسال طلب التجديد"
                : "Submit renewal request"}
          </button>
        </div>
      </div>
    </section>
  );
}
