import * as pharmacyService from "../../services/pharmacyService";
import SecureAttendanceScanner from "../../components/attendance/SecureAttendanceScanner";
import {
  formatAttendanceMethodLabel,
  getAttendanceCheckInMethod,
  getAttendanceCheckOutMethod,
} from "../../utils/attendanceMethod";
import {
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
} from "../../utils/workSchedule";
import { formatTime, requestTypeLabel, statusLabel } from "./helpers";
import type { EmployeePortalPageState } from "./useEmployeePortalState";

type Props = { state: EmployeePortalPageState };

export default function EmployeePortalAttendancePanel({ state }: Props) {
  const {
    isArabic,
    staff,
    branchGeofenceReady,
    busy,
    todayRecord,
    todayIso,
    todayTiming,
    todayEarlyLeaveBadge,
    monthRecords,
    schedule,
    graceMinutes,
    approvedPermissions,
    requests,
    loadAll,
    handleCheckIn,
    handleCheckOut,
  } = state;

  if (!staff || !schedule) return null;

  return (
    <>
      <div className="employeePortalToday cardInner">
        <div className="employeePortalTodayGrid">
          <div>
            <span className="employeePortalLabel">{isArabic ? "التاريخ" : "Date"}</span>
            <strong>{todayIso}</strong>
          </div>
          <div>
            <span className="employeePortalLabel">{isArabic ? "الحالة" : "Status"}</span>
            <strong>
              {todayRecord
                ? statusLabel(todayRecord.status, isArabic)
                : statusLabel("", isArabic)}
            </strong>
            {todayTiming?.isLate && (
              <span className="hrAttendanceFlag hrAttendanceFlagLate">
                {isArabic ? "تأخير" : "Late"}
              </span>
            )}
            {todayEarlyLeaveBadge === "permission" && (
              <span className="hrAttendanceFlag hrAttendanceFlagPermission">
                {isArabic ? "إذن" : "Permission"}
              </span>
            )}
            {todayEarlyLeaveBadge === "deduction" && (
              <span className="hrAttendanceFlag hrAttendanceFlagDeduction">
                {isArabic ? "خصم" : "Deduction"}
              </span>
            )}
          </div>
          <div>
            <span className="employeePortalLabel">{isArabic ? "حضور" : "Check in"}</span>
            <strong>{formatTime(todayRecord?.checkIn, isArabic)}</strong>
          </div>
          <div>
            <span className="employeePortalLabel">{isArabic ? "انصراف" : "Check out"}</span>
            <strong>{formatTime(todayRecord?.checkOut, isArabic)}</strong>
          </div>
        </div>

        <div className="employeePortalActions">
          {!branchGeofenceReady && (
            <p className="employeePortalSecureHint">
              {isArabic
                ? "لتفعيل «حضور بصمة» اطلب من المدير ضبط إحداثيات الفرع من الإعدادات ← بيانات الصيدلية."
                : "For fingerprint attendance, ask admin to set branch GPS in Settings → Pharmacy."}
            </p>
          )}

          {!todayRecord?.checkIn && (
            <div className="employeePortalActionGroup">
              {branchGeofenceReady && (
                <SecureAttendanceScanner
                  isArabic={isArabic}
                  action="check_in"
                  disabled={!!busy}
                  onSuccess={() => void loadAll()}
                />
              )}
              <button
                type="button"
                className="ghostBtn employeePortalManualBtn"
                disabled={!!busy}
                onClick={() => void handleCheckIn()}
              >
                {isArabic ? "حضور يدوي" : "Manual check-in"}
              </button>
            </div>
          )}

          {todayRecord?.checkIn && !todayRecord?.checkOut && (
            <div className="employeePortalActionGroup">
              {branchGeofenceReady && (
                <SecureAttendanceScanner
                  isArabic={isArabic}
                  action="check_out"
                  disabled={!!busy}
                  onSuccess={() => void loadAll()}
                />
              )}
              <button
                type="button"
                className="printBtn employeePortalManualBtn"
                disabled={!!busy}
                onClick={() => void handleCheckOut()}
              >
                {isArabic ? "انصراف يدوي" : "Manual check-out"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="employeePortalSection cardInner">
        <h3>{isArabic ? "سجل الشهر" : "This month"}</h3>
        {monthRecords.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد سجلات" : "No records"}</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable compactTable">
              <thead>
                <tr>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "حضور" : "In"}</th>
                  <th>{isArabic ? "انصراف" : "Out"}</th>
                  <th>{isArabic ? "طريقة التسجيل" : "Method"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {monthRecords
                  .slice()
                  .sort((a, b) => b.workDate.localeCompare(a.workDate))
                  .map((record) => {
                    const rowSchedule = schedule;
                    const approvedEarlyLeave = isEarlyLeaveApproved(
                      record.earlyLeaveOutcome,
                      pharmacyService.hasApprovedPermissionForDate(
                        approvedPermissions,
                        staff.attendanceKey,
                        staff.employeeId,
                        record.workDate,
                      ),
                    );
                    const timing = evaluateAttendanceTiming(
                      record.workDate,
                      record.checkIn,
                      record.checkOut,
                      rowSchedule,
                      graceMinutes,
                      { approvedEarlyLeave },
                    );
                    const rawEarlyLeave = evaluateAttendanceTiming(
                      record.workDate,
                      record.checkIn,
                      record.checkOut,
                      rowSchedule,
                      graceMinutes,
                      { approvedEarlyLeave: false },
                    ).isEarlyLeave;
                    const earlyLeaveBadge = rawEarlyLeave
                      ? resolveEarlyLeaveOutcome(record.earlyLeaveOutcome)
                      : null;
                    const checkInMethod = getAttendanceCheckInMethod(record);
                    const checkOutMethod = getAttendanceCheckOutMethod(record);
                    return (
                      <tr key={record.id || record.workDate}>
                        <td>{record.workDate}</td>
                        <td>{formatTime(record.checkIn, isArabic)}</td>
                        <td>{formatTime(record.checkOut, isArabic)}</td>
                        <td>
                          <div className="attendanceMethodCell">
                            {checkInMethod && (
                              <span
                                className={`attendanceMethodBadge ${checkInMethod === "secure" ? "secure" : "manual"}`}
                              >
                                {isArabic ? "حضور" : "In"}:{" "}
                                {formatAttendanceMethodLabel(checkInMethod, isArabic)}
                              </span>
                            )}
                            {checkOutMethod && (
                              <span
                                className={`attendanceMethodBadge ${checkOutMethod === "secure" ? "secure" : "manual"}`}
                              >
                                {isArabic ? "انصراف" : "Out"}:{" "}
                                {formatAttendanceMethodLabel(checkOutMethod, isArabic)}
                              </span>
                            )}
                            {!checkInMethod && !checkOutMethod ? "—" : null}
                          </div>
                        </td>
                        <td>
                          {statusLabel(record.status, isArabic)}
                          {timing.isLate && (
                            <span className="hrAttendanceFlag hrAttendanceFlagLate">
                              {isArabic ? "تأخير" : "Late"}
                            </span>
                          )}
                          {earlyLeaveBadge === "permission" && (
                            <span className="hrAttendanceFlag hrAttendanceFlagPermission">
                              {isArabic ? "إذن" : "Permission"}
                            </span>
                          )}
                          {earlyLeaveBadge === "deduction" && (
                            <span className="hrAttendanceFlag hrAttendanceFlagDeduction">
                              {isArabic ? "خصم" : "Deduction"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="employeePortalSection cardInner">
        <h3>{isArabic ? "طلباتي" : "My requests"}</h3>
        {requests.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد طلبات" : "No requests"}</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable compactTable">
              <thead>
                <tr>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>{requestTypeLabel(req.requestType, isArabic)}</td>
                    <td>
                      {req.requestType === "leave" &&
                      req.endDate &&
                      req.endDate !== req.workDate
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
                        {statusLabel(req.status, isArabic)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
