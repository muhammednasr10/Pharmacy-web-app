import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AttendanceRecord,
  EmployeeRequest,
  ShiftId,
  SystemUser,
} from "../../types";
import * as pharmacyService from "../../services/pharmacyService";
import { branchHasGeofence } from "../../services/secureAttendanceService";
import {
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
  resolveAllowedLateMinutes,
  resolveWorkSchedule,
} from "../../utils/workSchedule";
import { buildEmployeeMonthDays } from "../../utils/employeePortalCalendar";
import { currentMonthBounds, mapAttendanceActionError } from "./helpers";
import type {
  EmployeePortalPageProps,
  EmployeePortalPanel,
  EmployeeScheduleTab,
  LeaveFormState,
  PermissionFormState,
  StaffContext,
} from "./types";

export function useEmployeePortalState({
  isArabic,
  appUser,
  pharmacyId,
}: EmployeePortalPageProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<StaffContext | null>(null);
  const [branchGeofenceReady, setBranchGeofenceReady] = useState(false);
  const [branchLabel, setBranchLabel] = useState("");
  const [payrollConfig, setPayrollConfig] = useState<Awaited<
    ReturnType<typeof pharmacyService.loadPayrollSettings>
  > | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | undefined>();
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [activePanel, setActivePanel] = useState<EmployeePortalPanel>("profile");
  const [scheduleTab, setScheduleTab] = useState<EmployeeScheduleTab>("plan");

  const [leaveForm, setLeaveForm] = useState<LeaveFormState>({
    workDate: "",
    endDate: "",
    reason: "",
  });
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>({
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
    () => requests.filter((req) => req.status === "approved" && req.requestType === "permission"),
    [requests],
  );

  const monthPlanDays = useMemo(() => {
    if (!schedule || !payrollConfig) return [];
    return buildEmployeeMonthDays({
      monthStart: monthBounds.start,
      monthEnd: monthBounds.end,
      todayIso,
      schedule,
      workShifts: payrollConfig.workShifts,
      isArabic,
      monthRecords,
      requests,
    });
  }, [
    schedule,
    payrollConfig,
    monthBounds.start,
    monthBounds.end,
    todayIso,
    isArabic,
    monthRecords,
    requests,
  ]);

  const todayTiming = useMemo(() => {
    if (!schedule || !todayRecord || !staff) return null;
    const approvedEarlyLeave = isEarlyLeaveApproved(
      todayRecord.earlyLeaveOutcome,
      pharmacyService.hasApprovedPermissionForDate(
        approvedPermissions,
        staff.attendanceKey,
        staff.employeeId,
        todayIso,
      ),
    );
    return evaluateAttendanceTiming(
      todayIso,
      todayRecord.checkIn,
      todayRecord.checkOut,
      schedule,
      graceMinutes,
      { approvedEarlyLeave },
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
      { approvedEarlyLeave: false },
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
        catalogAccounts,
      );

      if (!employee || !employee.isActive) {
        setStaff(null);
        setPayrollConfig(config);
        return;
      }

      if (!appUser.employeeId || appUser.employeeId !== employee.id) {
        try {
          await pharmacyService.linkUserToEmployee(appUser.uid, employee.id);
        } catch {
          // Non-blocking: portal still works with resolved employee context.
        }
      }

      const linked = accountByEmployee.get(employee.id);
      const staffContext: StaffContext = {
        employeeId: employee.id,
        pharmacyId: employee.pharmacyId,
        name: employee.name,
        employeeCode: employee.employeeCode,
        photoBase64: employee.photoBase64,
        phone: employee.phone,
        jobTitle: employee.jobTitle,
        hireDate: employee.hireDate,
        notes: employee.notes,
        email: linked?.email || appUser.email,
        role: linked?.role || appUser.role || employee.jobTitle,
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

      const branchSettings = await pharmacyService.getPharmacySettings(staffContext.pharmacyId);
      setBranchGeofenceReady(branchHasGeofence(branchSettings));
      setBranchLabel(
        isArabic
          ? branchSettings?.name || branchSettings?.name_en || ""
          : branchSettings?.name_en || branchSettings?.name || "",
      );

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
  }, [appUser, pharmacyId, monthBounds.start, monthBounds.end, todayIso, isArabic]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCheckIn = useCallback(async () => {
    if (!staff || !schedule) return;
    setBusy("check-in");
    try {
      await pharmacyService.recordCheckIn(staff.attendanceKey, staff.name, todayIso, {
        expectedSchedule: schedule,
        shiftId: schedule.shiftId,
        graceMinutes,
        pharmacyId: staff.pharmacyId,
      });
      await loadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(mapAttendanceActionError(message, false, isArabic));
    } finally {
      setBusy("");
    }
  }, [staff, schedule, todayIso, graceMinutes, loadAll, isArabic]);

  const handleCheckOut = useCallback(async () => {
    if (!staff) return;
    setBusy("check-out");
    try {
      await pharmacyService.recordCheckOut(staff.attendanceKey, staff.name, todayIso, {
        pharmacyId: staff.pharmacyId,
      });
      await loadAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(mapAttendanceActionError(message, true, isArabic));
    } finally {
      setBusy("");
    }
  }, [staff, todayIso, loadAll, isArabic]);

  const submitLeaveRequest = useCallback(async () => {
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
      setActivePanel("profile");
      await loadAll();
      alert(isArabic ? "تم إرسال طلب الإجازة" : "Leave request submitted");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الإرسال" : "Submit failed");
    } finally {
      setBusy("");
    }
  }, [staff, leaveForm, isArabic, loadAll]);

  const submitPermissionRequest = useCallback(async () => {
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
      setActivePanel("profile");
      await loadAll();
      alert(isArabic ? "تم إرسال طلب الإذن" : "Permission request submitted");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الإرسال" : "Submit failed");
    } finally {
      setBusy("");
    }
  }, [staff, permissionForm, isArabic, loadAll]);

  return {
    isArabic,
    loading,
    busy,
    error,
    staff,
    branchGeofenceReady,
    branchLabel,
    payrollConfig,
    todayRecord,
    monthRecords,
    requests,
    activePanel,
    setActivePanel,
    scheduleTab,
    setScheduleTab,
    monthPlanDays,
    monthBounds,
    leaveForm,
    setLeaveForm,
    permissionForm,
    setPermissionForm,
    todayIso,
    schedule,
    graceMinutes,
    approvedPermissions,
    todayTiming,
    todayEarlyLeaveBadge,
    loadAll,
    handleCheckIn,
    handleCheckOut,
    submitLeaveRequest,
    submitPermissionRequest,
  };
}

export type EmployeePortalPageState = ReturnType<typeof useEmployeePortalState>;
