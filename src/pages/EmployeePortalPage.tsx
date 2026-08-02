import AttendanceDynamicQrPanel from "../components/attendance/AttendanceDynamicQrPanel";
import { formatScheduleWindow, getShiftDisplayName } from "../utils/workSchedule";
import EmployeePortalAttendancePanel from "./employee-portal/EmployeePortalAttendancePanel";
import EmployeePortalLeavePanel from "./employee-portal/EmployeePortalLeavePanel";
import EmployeePortalPermissionPanel from "./employee-portal/EmployeePortalPermissionPanel";
import { useEmployeePortalState } from "./employee-portal/useEmployeePortalState";
import type { EmployeePortalPageProps } from "./employee-portal/types";

export type { EmployeePortalPageProps } from "./employee-portal/types";

export default function EmployeePortalPage(props: EmployeePortalPageProps) {
  const state = useEmployeePortalState(props);
  const {
    isArabic,
    loading,
    error,
    staff,
    branchGeofenceReady,
    branchLabel,
    payrollConfig,
    schedule,
    activePanel,
    setActivePanel,
  } = state;

  if (loading) {
    return (
      <section className="card employeePortalPage">
        <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      </section>
    );
  }

  if (!staff) {
    return (
      <section className="card employeePortalPage">
        <div className="cardHeader">
          <h2>{isArabic ? "حضوري" : "My Attendance"}</h2>
        </div>
        <p className="empty">
          {isArabic
            ? "حسابك غير مربوط بموظف نشط. اطلب من المدير ربط حسابك بملف موظف."
            : "Your account is not linked to an active employee profile. Ask your manager to link your account."}
        </p>
      </section>
    );
  }

  return (
    <section className="card employeePortalPage">
      <div className="cardHeader">
        <div>
          <h2>{isArabic ? "حضوري" : "My Attendance"}</h2>
          <p className="returnsSectionHint">
            {staff.name}
            {schedule && payrollConfig && (
              <>
                {" · "}
                {getShiftDisplayName(schedule.shiftId, payrollConfig.workShifts, isArabic)} (
                {formatScheduleWindow(schedule, isArabic)})
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p className="errorText" style={{ padding: "0 1rem" }}>
          {isArabic
            ? "تأكد من تنفيذ supabase/add-employee-requests.sql في Supabase"
            : "Run supabase/add-employee-requests.sql in Supabase if tables are missing"}
        </p>
      )}

      {branchGeofenceReady && staff && (
        <AttendanceDynamicQrPanel
          isArabic={isArabic}
          pharmacyId={staff.pharmacyId}
          branchLabel={branchLabel}
        />
      )}

      <div className="employeePortalTabs">
        <button
          type="button"
          className={activePanel === "attendance" ? "active" : ""}
          onClick={() => setActivePanel("attendance")}
        >
          {isArabic ? "اليوم" : "Today"}
        </button>
        <button
          type="button"
          className={activePanel === "leave" ? "active" : ""}
          onClick={() => setActivePanel("leave")}
        >
          {isArabic ? "طلب إجازة" : "Request leave"}
        </button>
        <button
          type="button"
          className={activePanel === "permission" ? "active" : ""}
          onClick={() => setActivePanel("permission")}
        >
          {isArabic ? "طلب إذن" : "Request permission"}
        </button>
      </div>

      {activePanel === "attendance" && <EmployeePortalAttendancePanel state={state} />}
      {activePanel === "leave" && <EmployeePortalLeavePanel state={state} />}
      {activePanel === "permission" && <EmployeePortalPermissionPanel state={state} />}
    </section>
  );
}
