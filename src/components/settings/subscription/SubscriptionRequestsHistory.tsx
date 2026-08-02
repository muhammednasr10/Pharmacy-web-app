import type { ActivityLog, SubscriptionRequest } from "../../../types";
import { isTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import { getRequestStatusLabel, getRequestTypeLabel } from "./subscriptionSettingsHelpers";

type SubscriptionRequestsHistoryProps = {
  isArabic: boolean;
  t: Record<string, string>;
  pharmacySubscriptionRequests: SubscriptionRequest[];
  subscriptionRenewLogs: ActivityLog[];
  onShowPaymentInfo: (request: SubscriptionRequest) => void;
};

export default function SubscriptionRequestsHistory({
  isArabic,
  t,
  pharmacySubscriptionRequests,
  subscriptionRenewLogs,
  onShowPaymentInfo,
}: SubscriptionRequestsHistoryProps) {
  return (
    <>
      <section className="subscriptionHistoryCard">
        <div className="subscriptionPanelHeader">
          <h3>{isArabic ? "طلبات الاشتراك" : "Subscription Requests"}</h3>
          <p>
            {isArabic
              ? "سجل طلبات التجديد وترقية الباقة وحالة كل طلب"
              : "Renewal and package upgrade requests and their status"}
          </p>
        </div>

        {pharmacySubscriptionRequests.length === 0 ? (
          <div className="subscriptionEmptyState">
            <span aria-hidden="true">📋</span>
            <p>{isArabic ? "لا توجد طلبات حتى الآن" : "No requests yet"}</p>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="subscriptionHistoryTable">
              <thead>
                <tr>
                  <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{t.date}</th>
                  <th>{isArabic ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {pharmacySubscriptionRequests.map((request) => (
                  <tr key={request.id}>
                    <td dir="ltr">{request.requestNumber}</td>
                    <td>{getRequestTypeLabel(isArabic, request.plan)}</td>
                    <td>
                      {isTierUpgradePlan(request.plan)
                        ? `${request.amount} ${request.currency || "EGP"}`
                        : `${request.days} ${isArabic ? "يوم" : "days"} · ${request.amount} ${request.currency || "EGP"}`}
                    </td>
                    <td>
                      <span className={`subscriptionRequestBadge ${request.status}`}>
                        {getRequestStatusLabel(isArabic, request.status)}
                      </span>
                    </td>
                    <td>
                      {request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}
                    </td>
                    <td>
                      {request.status === "pending" ? (
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => onShowPaymentInfo(request)}
                        >
                          {isArabic ? "تعليمات الدفع" : "Payment info"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="subscriptionHistoryCard">
        <div className="subscriptionPanelHeader">
          <h3>{isArabic ? "سجل تفعيلات الاشتراك" : "Activation History"}</h3>
          <p>
            {isArabic
              ? "آخر عمليات تفعيل الاشتراك بعد الاعتماد"
              : "Latest subscription activations after approval"}
          </p>
        </div>

        {subscriptionRenewLogs.length === 0 ? (
          <div className="subscriptionEmptyState">
            <span aria-hidden="true">📋</span>
            <p>{isArabic ? "لا توجد تجديدات مسجلة حتى الآن" : "No renewals recorded yet"}</p>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="subscriptionHistoryTable">
              <thead>
                <tr>
                  <th>{isArabic ? "الوصف" : "Description"}</th>
                  <th>{isArabic ? "المستخدم" : "User"}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionRenewLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.description}</td>
                    <td>
                      <span className="subscriptionUserBadge">{log.userName || "-"}</span>
                    </td>
                    <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
