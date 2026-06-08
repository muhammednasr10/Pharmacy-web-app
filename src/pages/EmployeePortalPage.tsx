import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppUser, AttendanceRecord, Employee, EmployeeRequest, ShiftId, SystemUser } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import {
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
  formatScheduleWindow,
  getShiftDisplayName,
  resolveAllowedLateMinutes,
  resolveWorkSchedule,
} from "../utils/workSchedule";

type EmployeePortalPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
};

type StaffContext = {
  employeeId: string;
  name: string;
  attendanceKey: string;
  assignedShiftId: ShiftId;
  useCustomWorkSchedule: boolean;
  workDayStart?: string;
  workDayEnd?: string;
  workBreaks?: Employee["workBreaks"];
  requiredWorkHours: number;
};

function formatTime(iso: string | undefined, isArabic: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string, isArabic: boolean) {
  const map: Record<string, { ar: string; en: string }> = {
    present: { ar: "حاضر", en: "Present" },
    absent: { ar: "غائب", en: "Absent" },
    late: { ar: "حضور (تأخير)", en: "Present (late)" },
    leave: { ar: "إجازة", en: "Leave" },
    sick: { ar: "مرضي", en: "Sick leave" },
    pending: { ar: "قيد المراجعة", en: "Pending" },
    approved: { ar: "موافق عليه", en: "Approved" },
    rejected: { ar: "مرفوض", en: "Rejected" },
  };
  const item = map[status] || { ar: "لم يسجل", en: "Not recorded" };
  return isArabic ? item.ar : item.en;
}

function requestTypeLabel(type: string, isArabic: boolean) {
  if (type === "leave") return isArabic ? "إجازة" : "Leave";
  if (type === "permission") return isArabic ? "إذن انصراف" : "Early leave";
  return type;
}

function currentMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function EmployeePortalPage({
  isArabic,
  appUser,
  pharmacyId,
}: EmployeePortalPageProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [payrollConfig, setPayrollConfig] = useState<Awaited<
    ReturnType<typeof pharmacyService.loadPayrollSettings>
  > | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | undefined>();
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [activePanel, setActivePanel] = useState<"attendance" | "leave" | "permission">("attendance");

  const [leaveForm, setLeaveForm] = useState({ workDate: "", endDate: "", reason: "" });
  const [permissionForm, setPermissionForm] = useState({
    workDate: "",
    requestedTime: "",
    reason: "",
  });

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthBounds = useMemo(() => currentMonthBounds(), []);

  const schedule = useMemo(() => {
    if (!staff || !payrollConfig) return null;
    return resolveWorkSchedule(staff, payrollConfig.workShifts, payrollConfig.defaultShiftId);
  }, [staff, payrollConfig]);

  const graceMinutes = useMemo(() => {
    if (!schedule || !payrollConfig) return 15;
    return resolveAllowedLateMinutes(schedule.shiftId, payrollConfig.workShifts);
  }, [schedule, payrollConfig]);

  const approvedPermissions = useMemo(
    () =>
      requests.filter(
        (req) => req.status === "approved" && req.requestType === "permission"
      ),
    [requests]
  );

  const todayTiming = useMemo(() => {
    if (!schedule || !todayRecord || !staff) return null;
    const approvedEarlyLeave = isEarlyLeaveApproved(
      todayRecord.earlyLeaveOutcome,
      pharmacyService.hasApprovedPermissionForDate(
        approvedPermissions,
        staff.attendanceKey,
        staff.employeeId,
        todayIso
      )
    );
    return evaluateAttendanceTiming(
      todayIso,
      todayRecord.checkIn,
      todayRecord.checkOut,
      schedule,
      graceMinutes,
      { approvedEarlyLeave }
    );
  }, [schedule, todayRecord, approvedPermissions, staff, todayIso, graceMinutes]);

  const todayEarlyLeaveBadge = useMemo(() => {
    if (!todayRecord?.checkOut || !schedule) return null;
    const rawEarlyLeave = evaluateAttendanceTiming(
      todayIso,
      todayRecord.checkIn,
      todayRecord.checkOut,
      schedule,
      graceMinutes,
      { approvedEarlyLeave: false }
    ).isEarlyLeave;
    if (!rawEarlyLeave) return null;
    return resolveEarlyLeaveOutcome(todayRecord.earlyLeaveOutcome);
  }, [todayRecord, schedule, approvedPermissions, staff, todayIso, graceMinutes]);

  const loadAll = useCallback(async () => {
    if (!pharmacyId || !appUser) return;
    setLoading(true);
    setError("");
    try {
      const [employees, accounts, config, loginRequests, catalogAccounts] = await Promise.all([
        pharmacyService.getEmployees(),
        pharmacyService.getSystemUsers(pharmacyId),
        pharmacyService.loadPayrollSettings(pharmacyId),
        pharmacyService.getPharmacyLoginAccountRequests(pharmacyId),
        pharmacyService.getPharmacyLoginAccounts(pharmacyId),
      ]);

      const accountByEmployee = new Map<string, SystemUser>();
      accounts.forEach((acc) => {
        if (acc.employeeId) accountByEmployee.set(acc.employeeId, acc);
      });

      const employee = pharmacyService.resolveLinkedEmployeeFromData(
        appUser,
        employees,
        accounts,
        loginRequests,
        catalogAccounts
      );

      if (!employee || !employee.isActive) {
        setStaff(null);
        setPayrollConfig(config);
        return;
      }

      const linked = accountByEmployee.get(employee.id);
      const staffContext: StaffContext = {
        employeeId: employee.id,
        name: employee.name,
        attendanceKey: linked?.uid || employee.id,
        assignedShiftId: (employee.assignedShiftId as ShiftId) || config.defaultShiftId || "A",
        useCustomWorkSchedule: Boolean(employee.useCustomWorkSchedule),
        workDayStart: employee.workDayStart,
        workDayEnd: employee.workDayEnd,
        workBreaks: employee.workBreaks,
        requiredWorkHours: employee.requiredWorkHours ?? 8,
      };

      setStaff(staffContext);
      setPayrollConfig(config);

      const [attendance, myRequests] = await Promise.all([
        pharmacyService.getAttendanceRecords(monthBounds.start, monthBounds.end),
        pharmacyService.getEmployeeRequests({
          userId: staffContext.attendanceKey,
          employeeId: staffContext.employeeId,
        }),
      ]);

      const mine = attendance.filter((row) => row.userId === staffContext.attendanceKey);
      setMonthRecords(mine);
      setTodayRecord(mine.find((row) => row.workDate === todayIso));
      setRequests(myRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [appUser, pharmacyId, monthBounds.start, monthBounds.end, todayIso]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleCheckIn() {
    if (!staff || !schedule) return;
    setBusy("check-in");
    try {
      await pharmacyService.recordCheckIn(staff.attendanceKey, staff.name, todayIso, {
        expectedSchedule: schedule,
        shiftId: schedule.shiftId,
        graceMinutes,
      });
      await loadAll();
    } catch (err) {
      alert(
        err instanceof Error && err.message === "already_checked_in"
          ? isArabic
            ? "تم تسجيل الحضور مسبقاً"
            : "Already checked in"
          : isArabic
            ? "تعذر تسجيل الحضور"
            : "Could not check in"
      );
    } finally {
      setBusy("");
    }
  }

  async function handleCheckOut() {
    if (!staff) return;
    setBusy("check-out");
    try {
      await pharmacyService.recordCheckOut(staff.attendanceKey, staff.name, todayIso);
      await loadAll();
    } catch (err) {
      alert(
        err instanceof Error && err.message === "already_checked_out"
          ? isArabic
            ? "تم تسجيل الانصراف مسبقاً"
            : "Already checked out"
          : isArabic
            ? "تعذر تسجيل الانصراف"
            : "Could not check out"
      );
    } finally {
      setBusy("");
    }
  }

  async function submitLeaveRequest() {
    if (!staff) return;
    if (!leaveForm.workDate) {
      alert(isArabic ? "اختر تاريخ بداية الإجازة" : "Select leave start date");
      return;
    }
    const endDate = leaveForm.endDate || leaveForm.workDate;
    if (endDate < leaveForm.workDate) {
      alert(isArabic ? "تاريخ النهاية قبل البداية" : "End date is before start date");
      return;
    }
    setBusy("leave");
    try {
      await pharmacyService.createEmployeeRequest({
        employeeId: staff.employeeId,
        userId: staff.attendanceKey,
        employeeName: staff.name,
        requestType: "leave",
        workDate: leaveForm.workDate,
        endDate,
        reason: leaveForm.reason.trim(),
      });
      setLeaveForm({ workDate: "", endDate: "", reason: "" });
      setActivePanel("attendance");
      await loadAll();
      alert(isArabic ? "تم إرسال طلب الإجازة" : "Leave request submitted");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الإرسال" : "Submit failed");
    } finally {
      setBusy("");
    }
  }

  async function submitPermissionRequest() {
    if (!staff) return;
    if (!permissionForm.workDate || !permissionForm.requestedTime) {
      alert(isArabic ? "اختر التاريخ ووقت الانصراف" : "Select date and leave time");
      return;
    }
    setBusy("permission");
    try {
      await pharmacyService.createEmployeeRequest({
        employeeId: staff.employeeId,
        userId: staff.attendanceKey,
        employeeName: staff.name,
        requestType: "permission",
        workDate: permissionForm.workDate,
        requestedTime: permissionForm.requestedTime,
        reason: permissionForm.reason.trim(),
      });
      setPermissionForm({ workDate: "", requestedTime: "", reason: "" });
      setActivePanel("attendance");
      await loadAll();
      alert(isArabic ? "تم إرسال طلب الإذن" : "Permission request submitted");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الإرسال" : "Submit failed");
    } finally {
      setBusy("");
    }
  }

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

      {activePanel === "attendance" && (
        <>
          <div className="employeePortalToday cardInner">
            <div className="employeePortalTodayGrid">
              <div>
                <span className="employeePortalLabel">{isArabic ? "التاريخ" : "Date"}</span>
                <strong>{todayIso}</strong>
              </div>
              <div>
                <span className="employeePortalLabel">{isArabic ? "الحالة" : "Status"}</span>
                <strong>{todayRecord ? statusLabel(todayRecord.status, isArabic) : statusLabel("", isArabic)}</strong>
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
              <button
                type="button"
                className="completeBtn"
                disabled={!!busy || !!todayRecord?.checkIn}
                onClick={() => void handleCheckIn()}
              >
                {isArabic ? "تسجيل حضور" : "Check in"}
              </button>
              <button
                type="button"
                className="printBtn"
                disabled={!!busy || !todayRecord?.checkIn || !!todayRecord?.checkOut}
                onClick={() => void handleCheckOut()}
              >
                {isArabic ? "تسجيل انصراف" : "Check out"}
              </button>
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
                      <th>{isArabic ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRecords
                      .slice()
                      .sort((a, b) => b.workDate.localeCompare(a.workDate))
                      .map((record) => {
                        const rowSchedule = schedule!;
                        const approvedEarlyLeave = isEarlyLeaveApproved(
                          record.earlyLeaveOutcome,
                          pharmacyService.hasApprovedPermissionForDate(
                            approvedPermissions,
                            staff.attendanceKey,
                            staff.employeeId,
                            record.workDate
                          )
                        );
                        const timing = evaluateAttendanceTiming(
                          record.workDate,
                          record.checkIn,
                          record.checkOut,
                          rowSchedule,
                          graceMinutes,
                          { approvedEarlyLeave }
                        );
                        const rawEarlyLeave = evaluateAttendanceTiming(
                          record.workDate,
                          record.checkIn,
                          record.checkOut,
                          rowSchedule,
                          graceMinutes,
                          { approvedEarlyLeave: false }
                        ).isEarlyLeave;
                        const earlyLeaveBadge = rawEarlyLeave
                          ? resolveEarlyLeaveOutcome(record.earlyLeaveOutcome)
                          : null;
                        return (
                          <tr key={record.id || record.workDate}>
                            <td>{record.workDate}</td>
                            <td>{formatTime(record.checkIn, isArabic)}</td>
                            <td>{formatTime(record.checkOut, isArabic)}</td>
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
      )}

      {activePanel === "leave" && (
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
      )}

      {activePanel === "permission" && (
        <div className="employeePortalForm cardInner">
          <h3>{isArabic ? "طلب إذن انصراف" : "Early leave permission"}</h3>
          <label>
            {isArabic ? "التاريخ" : "Date"}
            <input
              type="date"
              className="tableInput"
              value={permissionForm.workDate}
              onChange={(e) =>
                setPermissionForm((prev) => ({ ...prev, workDate: e.target.value }))
              }
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
      )}
    </section>
  );
}
