import type { EmployeePortalPageState } from "./useEmployeePortalState";

type Props = { state: EmployeePortalPageState };

export default function EmployeePortalLeavePanel({ state }: Props) {
  const { isArabic, busy, leaveForm, setLeaveForm, submitLeaveRequest } = state;

  return (
    <div className="employeePortalForm cardInner">
      <h3>{isArabic ? "طلب إجازة" : "Leave request"}</h3>
      <label>
        {isArabic ? "من تاريخ" : "From"}
        <input
          type="date"
          className="tableInput"
          value={leaveForm.workDate}
          onChange={(e) => setLeaveForm((prev) => ({ ...prev, workDate: e.target.value }))}
        />
      </label>
      <label>
        {isArabic ? "إلى تاريخ" : "To"}
        <input
          type="date"
          className="tableInput"
          value={leaveForm.endDate}
          onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
        />
      </label>
      <label>
        {isArabic ? "السبب (اختياري)" : "Reason (optional)"}
        <textarea
          className="tableInput"
          rows={3}
          value={leaveForm.reason}
          onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
        />
      </label>
      <button
        type="button"
        className="completeBtn"
        disabled={!!busy}
        onClick={() => void submitLeaveRequest()}
      >
        {isArabic ? "إرسال الطلب" : "Submit request"}
      </button>
    </div>
  );
}
