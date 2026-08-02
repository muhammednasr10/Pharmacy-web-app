import type { EmployeePortalPageState } from "./useEmployeePortalState";

type Props = { state: EmployeePortalPageState };

export default function EmployeePortalPermissionPanel({ state }: Props) {
  const { isArabic, busy, permissionForm, setPermissionForm, submitPermissionRequest } = state;

  return (
    <div className="employeePortalForm cardInner">
      <h3>{isArabic ? "طلب إذن انصراف" : "Early leave permission"}</h3>
      <label>
        {isArabic ? "التاريخ" : "Date"}
        <input
          type="date"
          className="tableInput"
          value={permissionForm.workDate}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, workDate: e.target.value }))}
        />
      </label>
      <label>
        {isArabic ? "وقت الانصراف المتوقع" : "Expected leave time"}
        <input
          type="time"
          className="tableInput"
          value={permissionForm.requestedTime}
          onChange={(e) =>
            setPermissionForm((prev) => ({ ...prev, requestedTime: e.target.value }))
          }
        />
      </label>
      <label>
        {isArabic ? "السبب (اختياري)" : "Reason (optional)"}
        <textarea
          className="tableInput"
          rows={3}
          value={permissionForm.reason}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, reason: e.target.value }))}
        />
      </label>
      <button
        type="button"
        className="completeBtn"
        disabled={!!busy}
        onClick={() => void submitPermissionRequest()}
      >
        {isArabic ? "إرسال الطلب" : "Submit request"}
      </button>
    </div>
  );
}
