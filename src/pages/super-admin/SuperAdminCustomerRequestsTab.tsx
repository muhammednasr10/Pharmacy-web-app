import { getCustomerRequestCategoryLabel } from "../../utils/customerRequests";
import { getSuperAdminSubscriptionWhatsappUrl } from "../../utils/superAdminNotify";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminCustomerRequestsTab({ state }: Props) {
  const {
    isArabic,
    pendingCustomerRequestsCount,
    customerRequestFilter,
    setCustomerRequestFilter,
    customerRequestRows,
    onRefreshAdminRequests,
    requestUpdating,
    handleApproveRequest,
    handleRejectRequest,
    handleApproveLoginRequest,
    handleRejectLoginRequest,
    handleApproveRoleRequest,
    handleRejectRoleRequest,
    formatEndDateAfterApproval,
    getCustomerRequestResult,
    isCustomerRequestBusy,
  } = state;

  return (
          <section className="saasRequestsPanel settingsTabPanel">
            <div className="saasPageHeader">
              <div>
                <h3>{isArabic ? "طلبات العملاء" : "Customer requests"}</h3>
                <p className="pageHint">
                  {isArabic
                    ? "كل الطلبات الواردة من الصيدليات: تجديد اشتراك، ترقية باقة، مستخدمين جدد، تعديلات حسابات، ربط، وأدوار جديدة — الطلبات المعتمدة أو المرفوضة تختفي من القائمة"
                    : "All pharmacy requests: renewals, upgrades, new users, account edits, links, and new roles — approved or rejected requests leave this list"}
                </p>
              </div>
              <span className={`saasRequestsCount${pendingCustomerRequestsCount ? " active" : ""}`}>
                {pendingCustomerRequestsCount} {isArabic ? "قيد المراجعة" : "pending"}
              </span>
              <button type="button" className="printBtn" onClick={() => void onRefreshAdminRequests()}>
                {isArabic ? "تحديث" : "Refresh"}
              </button>
            </div>

            <div className="saasCustomerRequestFilters" role="tablist" aria-label={isArabic ? "تصفية الطلبات" : "Filter requests"}>
              {(
                [
                  { id: "all" as const, ar: "الكل", en: "All" },
                  { id: "subscription" as const, ar: "اشتراك", en: "Subscription" },
                  { id: "login" as const, ar: "حسابات دخول", en: "Login accounts" },
                  { id: "role" as const, ar: "أدوار", en: "Roles" },
                ] as const
              ).map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={customerRequestFilter === filter.id}
                  className={`saasCustomerRequestFilterBtn${customerRequestFilter === filter.id ? " active" : ""}`}
                  onClick={() => setCustomerRequestFilter(filter.id)}
                >
                  {isArabic ? filter.ar : filter.en}
                </button>
              ))}
            </div>

            {customerRequestRows.length === 0 ? (
              <p className="empty">
                {isArabic ? "لا توجد طلبات قيد المراجعة حالياً" : "No pending customer requests"}
              </p>
            ) : (
              <div className="tableWrap">
                <table className="dataTable saasRequestsTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                      <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                      <th>{isArabic ? "التصنيف" : "Category"}</th>
                      <th>{isArabic ? "النوع" : "Type"}</th>
                      <th>{isArabic ? "التفاصيل" : "Details"}</th>
                      <th>{isArabic ? "مقدم الطلب" : "Requested by"}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                      <th>{isArabic ? "النتيجة بعد الاعتماد" : "Result after approval"}</th>
                      <th>{isArabic ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRequestRows.map((row) => {
                      const loginAccount = row.loginAccount;
                      const subscriptionRequest = row.subscriptionRequest;
                      const proposedPassword =
                        loginAccount?.pendingPassword || loginAccount?.password;

                      return (
                        <tr key={row.key}>
                          <td dir="ltr">
                            <code>{row.requestNumber}</code>
                          </td>
                          <td>
                            <strong>{row.pharmacyName}</strong>
                            <small className="saasSub" dir="ltr">
                              {row.pharmacyId}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                row.category === "subscription"
                                  ? "ok"
                                  : row.category === "role"
                                    ? "warn"
                                    : "warn"
                              }`}
                            >
                              {getCustomerRequestCategoryLabel(row.category, isArabic)}
                            </span>
                          </td>
                          <td>{row.typeLabel}</td>
                          <td dir="ltr">
                            {row.details}
                            {loginAccount && proposedPassword ? (
                              <small className="saasSub">
                                {isArabic ? "كلمة المرور:" : "Password:"}{" "}
                                <code>{proposedPassword}</code>
                              </small>
                            ) : null}
                          </td>
                          <td>{row.requestedBy || "—"}</td>
                          <td>
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                          </td>
                          <td>
                            <strong>{getCustomerRequestResult(row)}</strong>
                          </td>
                          <td>
                            <div className="saasActions">
                              {subscriptionRequest ? (
                                <a
                                  className="smallBtn"
                                  href={getSuperAdminSubscriptionWhatsappUrl(subscriptionRequest)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={
                                    isArabic
                                      ? "نسخ تفاصيل الطلب على واتساب"
                                      : "Share request details on WhatsApp"
                                  }
                                >
                                  WhatsApp
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="smallBtn"
                                disabled={isCustomerRequestBusy(row)}
                                onClick={() => {
                                  if (subscriptionRequest) {
                                    void handleApproveRequest(subscriptionRequest.id);
                                    return;
                                  }
                                  if (loginAccount) {
                                    void handleApproveLoginRequest(loginAccount.id);
                                    return;
                                  }
                                  if (row.customRole) {
                                    void handleApproveRoleRequest(row.customRole.id);
                                  }
                                }}
                              >
                                {isArabic ? "اعتماد" : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="dangerBtn"
                                disabled={isCustomerRequestBusy(row)}
                                onClick={() => {
                                  if (subscriptionRequest) {
                                    void handleRejectRequest(subscriptionRequest.id);
                                    return;
                                  }
                                  if (loginAccount) {
                                    void handleRejectLoginRequest(loginAccount.id);
                                    return;
                                  }
                                  if (row.customRole) {
                                    void handleRejectRoleRequest(row.customRole.id);
                                  }
                                }}
                              >
                                {isArabic ? "رفض" : "Reject"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
  );
}
