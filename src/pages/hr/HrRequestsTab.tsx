import { requestBranchLabel, requestStatusLabel, requestTypeLabel } from "./helpers";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrRequestsTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    loading,
    showBranchColumn,
    employeeRequestColSpan,
    employeeRequests,
    canManage,
    canManageHrFor,
    busyAction,
    reviewRequest,
    staffRows,
    resolveBranchLabel,
  } = state;

  if (activeTab !== "requests") return null;

  return (
            <div className="settingsTabPanel">
              <p className="returnsSectionHint">
                {isArabic
                  ? "مراجعة طلبات الإجازة والإذن من الموظفين. الموافقة على الإجازة تُسجّل أيام «إجازة» تلقائياً."
                  : "Review employee leave and permission requests. Approving leave marks those days as leave automatically."}
              </p>
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الموظف" : "Employee"}</th>
                      {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                      <th>{isArabic ? "النوع" : "Type"}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                      <th>{isArabic ? "التفاصيل" : "Details"}</th>
                      <th>{isArabic ? "الحالة" : "Status"}</th>
                      {canManage && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={employeeRequestColSpan} className="empty">
                          {isArabic ? "جاري التحميل..." : "Loading..."}
                        </td>
                      </tr>
                    ) : employeeRequests.length === 0 ? (
                      <tr>
                        <td colSpan={employeeRequestColSpan} className="empty">
                          {isArabic ? "لا توجد طلبات" : "No requests"}
                        </td>
                      </tr>
                    ) : (
                      employeeRequests.map((req) => (
                        <tr key={req.id}>
                          <td>{req.employeeName}</td>
                          {showBranchColumn && <td>{requestBranchLabel(req, staffRows, resolveBranchLabel)}</td>}
                          <td>{requestTypeLabel(req.requestType, isArabic)}</td>
                          <td>
                            {req.requestType === "leave" && req.endDate && req.endDate !== req.workDate
                              ? `${req.workDate} → ${req.endDate}`
                              : req.workDate}
                          </td>
                          <td>
                            {req.requestType === "permission" && req.requestedTime
                              ? `${isArabic ? "انصراف" : "Leave at"} ${req.requestedTime}`
                              : req.reason || "—"}
                          </td>
                          <td>
                            <span
                              className={`badge ${req.status === "pending" ? "warn" : req.status === "approved" ? "ok" : "danger"}`}
                            >
                              {requestStatusLabel(req.status, isArabic)}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              {req.status === "pending" && canManageHrFor(req.pharmacyId) ? (
                                <div className="hrRequestActions">
                                  <button
                                    type="button"
                                    className="completeBtn smallBtn"
                                    disabled={!!busyAction}
                                    onClick={() => void reviewRequest(req, "approved")}
                                  >
                                    {isArabic ? "موافقة" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    className="deleteBtn smallBtn"
                                    disabled={!!busyAction}
                                    onClick={() => {
                                      const note = window.prompt(
                                        isArabic
                                          ? "سبب الرفض (اختياري)"
                                          : "Rejection reason (optional)",
                                      );
                                      if (note === null) return;
                                      void reviewRequest(req, "rejected", note);
                                    }}
                                  >
                                    {isArabic ? "رفض" : "Reject"}
                                  </button>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
  );
}
