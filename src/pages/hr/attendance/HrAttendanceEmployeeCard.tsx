import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatTime } from "../../../utils/hrFormatters";
import { getEmployeeJobRoleLabel } from "../../../utils/roles";
import { getShiftDisplayName } from "../../../utils/workSchedule";
import type { AttendanceRecord } from "../../../types";
import type { HrStaffRow } from "../types";
import type { HrPageState } from "../useHrPageState";
import { resolveAttendanceCardStatus } from "./attendanceCardStatus";

type Props = {
  emp: HrStaffRow;
  todayRecord?: AttendanceRecord;
  state: Pick<
    HrPageState,
    | "isArabic"
    | "busyAction"
    | "todayIso"
    | "showOrgHr"
    | "resolveBranchLabel"
    | "payrollConfig"
    | "canManageHrFor"
    | "showAttendanceActions"
    | "handleCheckIn"
    | "handleCheckOut"
    | "setAttendanceEmployeeFilter"
  >;
};

export default function HrAttendanceEmployeeCard({ emp, todayRecord, state }: Props) {
  const {
    isArabic,
    busyAction,
    todayIso,
    showOrgHr,
    resolveBranchLabel,
    payrollConfig,
    canManageHrFor,
    showAttendanceActions,
    handleCheckIn,
    handleCheckOut,
    setAttendanceEmployeeFilter,
  } = state;

  const shiftLabel = emp.useCustomWorkSchedule
    ? isArabic
      ? "جدول مخصص"
      : "Custom schedule"
    : getShiftDisplayName(emp.assignedShiftId, payrollConfig.workShifts, isArabic);
  const canManageThis = canManageHrFor(emp.pharmacyId);
  const roleLabel = emp.jobTitle ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic) : "";
  const checkedIn = Boolean(todayRecord?.checkIn);
  const checkedOut = Boolean(todayRecord?.checkOut);
  const status = resolveAttendanceCardStatus(checkedIn, checkedOut, isArabic);
  const inBusy = busyAction === `in-${emp.attendanceKey}`;
  const outBusy = busyAction === `out-${emp.attendanceKey}`;
  const branchLabel = showOrgHr && resolveBranchLabel ? resolveBranchLabel(emp.pharmacyId) : "";

  return (
    <article className={`hrAttendanceEmployeeCard hrAttendanceEmployeeCard--${status.tone}`}>
      <div className="hrAttendanceEmployeeCardHead">
        <EmployeePhotoThumb photoBase64={emp.photoBase64} name={emp.name} variant="form" />
        <div className="hrAttendanceEmployeeCardBody">
          <div className="hrAttendanceEmployeeCardTitleRow">
            <strong>{emp.name}</strong>
            <span className={`hrAttendanceCardStatus hrAttendanceCardStatus--${status.tone}`}>
              {status.label}
            </span>
          </div>
          {roleLabel ? <span className="hrAttendanceEmployeeCardRole">{roleLabel}</span> : null}
          <span dir="ltr" className="hrAttendanceEmployeeCardMeta">
            {emp.employeeCode ? <code>{emp.employeeCode}</code> : <code>—</code>}
            {emp.phone ? ` · ${emp.phone}` : ""}
          </span>
          <span className="hrAttendanceEmployeeCardMeta">
            {shiftLabel}
            {branchLabel ? ` · ${branchLabel}` : ""}
          </span>
        </div>
      </div>

      <div className="hrAttendanceEmployeeCardToday">
        <div className="hrAttendanceTimeChip">
          <span>{isArabic ? "حضور" : "In"}</span>
          <strong>{formatTime(todayRecord?.checkIn, isArabic)}</strong>
        </div>
        <div className="hrAttendanceTimeChip">
          <span>{isArabic ? "انصراف" : "Out"}</span>
          <strong>{formatTime(todayRecord?.checkOut, isArabic)}</strong>
        </div>
      </div>

      {showAttendanceActions && canManageThis ? (
        <div className="hrAttendanceEmployeeCardQuick">
          <button
            type="button"
            className="hrAttendanceCardBtn hrAttendanceCardBtn--in"
            disabled={!!busyAction || checkedIn}
            onClick={() => void handleCheckIn(emp.attendanceKey, emp.name, todayIso)}
          >
            {inBusy ? "…" : isArabic ? "حضور" : "Check in"}
          </button>
          <button
            type="button"
            className="hrAttendanceCardBtn hrAttendanceCardBtn--out"
            disabled={!!busyAction || !checkedIn || checkedOut}
            onClick={() => void handleCheckOut(emp.attendanceKey, emp.name, todayIso)}
          >
            {outBusy ? "…" : isArabic ? "انصراف" : "Check out"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="hrAttendanceEmployeeCardAction"
        onClick={() => setAttendanceEmployeeFilter(emp.attendanceKey)}
      >
        {isArabic ? "فتح سجل الحضور" : "Open attendance log"}
      </button>
    </article>
  );
}
