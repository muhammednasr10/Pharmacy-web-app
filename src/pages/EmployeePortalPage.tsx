import AttendanceDynamicQrPanel from "../components/attendance/AttendanceDynamicQrPanel";
import { formatScheduleWindow, getShiftDisplayName } from "../utils/workSchedule";
import EmployeePortalLeavePanel from "./employee-portal/EmployeePortalLeavePanel";
import EmployeePortalPermissionPanel from "./employee-portal/EmployeePortalPermissionPanel";
import EmployeePortalProfilePanel from "./employee-portal/EmployeePortalProfilePanel";
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
          <h2>{isArabic ? "بروفايلى" : "My Profile"}</h2>
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
    <section className="card employeePortalPage employeeProfilePage">
      <div className="cardHeader employeeProfileHeader">
        <div>
          <h2>{isArabic ? "بروفايلى" : "My Profile"}</h2>
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
        <p className="errorText employeeProfileError">
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

      <div className="employeeProfileActions employeeProfileActions--two">
        <button
          type="button"
          className="employeeProfileActionCard employeeProfileActionCard--leave"
          onClick={() => setActivePanel("leave")}
        >
          <span className="employeeProfileActionIcon" aria-hidden="true">
            🏖️
          </span>
          <strong>{isArabic ? "طلب إجازة" : "Request leave"}</strong>
          <span>{isArabic ? "إجازة يوم أو أكثر" : "One or more days off"}</span>
        </button>
        <button
          type="button"
          className="employeeProfileActionCard employeeProfileActionCard--permission"
          onClick={() => setActivePanel("permission")}
        >
          <span className="employeeProfileActionIcon" aria-hidden="true">
            🕐
          </span>
          <strong>{isArabic ? "طلب إذن" : "Request permission"}</strong>
          <span>{isArabic ? "انصراف مبكر بإذن" : "Approved early leave"}</span>
        </button>
      </div>

      {activePanel === "profile" && <EmployeePortalProfilePanel state={state} />}

      {activePanel === "leave" && (
        <div className="employeeProfileModal">
          <div className="employeeProfileModalBackdrop" onClick={() => setActivePanel("profile")} />
          <div className="employeeProfileModalCard">
            <button
              type="button"
              className="employeeProfileModalClose"
              onClick={() => setActivePanel("profile")}
            >
              ×
            </button>
            <EmployeePortalLeavePanel state={state} />
          </div>
        </div>
      )}

      {activePanel === "permission" && (
        <div className="employeeProfileModal">
          <div className="employeeProfileModalBackdrop" onClick={() => setActivePanel("profile")} />
          <div className="employeeProfileModalCard">
            <button
              type="button"
              className="employeeProfileModalClose"
              onClick={() => setActivePanel("profile")}
            >
              ×
            </button>
            <EmployeePortalPermissionPanel state={state} />
          </div>
        </div>
      )}
    </section>
  );
}
