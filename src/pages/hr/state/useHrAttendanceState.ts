import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AttendanceRecord,
  AttendanceStatus,
  EarlyLeaveOutcome,
  EmployeeRequest,
  ShiftId,
} from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { useAttendanceRecordsQuery } from "../../../queries/useAttendanceRecordsQuery";
import { resolveStaffFromAttendanceCode } from "../../../utils/employeeAttendanceCode";
import { playBarcodeBeep } from "../../../utils/barcodeBeep";
import {
  currentMonthValue,
  isAttendanceWorkDay,
  isoToTimeInput,
  isShiftOnlyPresetRecord,
  listDaysInMonth,
  monthAnchorDate,
  monthBoundsFromDate,
  statusClearsTimes,
} from "../../../utils/hrFormatters";
import {
  computeWorkHoursFromSchedule,
  evaluateAttendanceTiming,
  isCheckInLate,
  isEarlyLeaveApproved,
  resolveAllowedLateMinutes,
  resolveScheduleForShiftId,
  resolveWorkSchedule,
} from "../../../utils/workSchedule";
import type { AttendanceLogDraft, HrStaffRow } from "../types";
import type { HrSharedContext } from "./shared";

type AttendanceParams = Pick<
  HrSharedContext,
  | "isArabic"
  | "pharmacyId"
  | "showOrgHr"
  | "orgBranchIds"
  | "canManage"
  | "canEditAttendanceLog"
  | "canManageHrFor"
  | "todayIso"
  | "payrollConfig"
  | "setLoading"
  | "setError"
  | "setBusyAction"
> & {
  staffRows: HrStaffRow[];
  activeEmployees: HrStaffRow[];
  employeeRequests: EmployeeRequest[];
};

export function useHrAttendanceState(params: AttendanceParams) {
  const {
    isArabic,
    pharmacyId,
    showOrgHr,
    orgBranchIds,
    canManage,
    canEditAttendanceLog,
    canManageHrFor,
    todayIso,
    payrollConfig,
    setLoading,
    setError,
    setBusyAction,
    staffRows,
    activeEmployees,
    employeeRequests,
  } = params;

  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthValue);
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState("");
  const [attendanceEmployeeSearch, setAttendanceEmployeeSearch] = useState("");
  const [attendanceBranchFilter, setAttendanceBranchFilter] = useState("all");
  const [attendanceLogEdit, setAttendanceLogEdit] = useState<AttendanceLogDraft | null>(null);
  const [attendanceScanMode, setAttendanceScanMode] = useState<"auto" | "in" | "out">("auto");
  const [attendanceScanFeedback, setAttendanceScanFeedback] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const {
    attendanceRecords,
    loadAttendance,
    invalidateAttendance,
    isAttendanceLoading,
    isAttendanceFetching,
    attendanceError,
  } = useAttendanceRecordsQuery({
    attendanceMonth,
    pharmacyId,
    showOrgHr,
    orgBranchIds,
  });

  useEffect(() => {
    // First unresolved fetch only — ignore background refetches to avoid UI flicker.
    setLoading(isAttendanceLoading);
  }, [isAttendanceLoading, setLoading]);

  useEffect(() => {
    if (!attendanceError) return;
    setError(attendanceError instanceof Error ? attendanceError.message : "load_failed");
    setLoading(false);
  }, [attendanceError, setError, setLoading]);

  async function handleCheckIn(userId: string, userName: string, workDate = todayIso) {
    setBusyAction(`in-${userId}`);
    try {
      const staff = staffRows.find((row) => row.attendanceKey === userId);
      const schedule = staff
        ? resolveWorkSchedule(staff, payrollConfig.workShifts, payrollConfig.defaultShiftId)
        : null;
      const graceMinutes = schedule
        ? resolveAllowedLateMinutes(schedule.shiftId, payrollConfig.workShifts)
        : undefined;
      await pharmacyService.recordCheckIn(userId, userName, workDate, {
        expectedSchedule: schedule ?? undefined,
        shiftId: schedule?.shiftId,
        graceMinutes,
      });
      await invalidateAttendance();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      alert(
        code === "already_checked_in"
          ? isArabic
            ? "تم تسجيل الحضور مسبقاً"
            : "Already checked in"
          : isArabic
            ? "تعذر تسجيل الحضور"
            : "Could not check in",
      );
    } finally {
      setBusyAction("");
    }
  }

  const attendanceScanScopeIds = useMemo(
    () => (showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : [pharmacyId].filter(Boolean)),
    [showOrgHr, orgBranchIds, pharmacyId],
  );

  const showAttendanceScanner = canEditAttendanceLog;

  async function handleAttendanceBarcodeScan(rawCode: string) {
    const staff = resolveStaffFromAttendanceCode(staffRows, rawCode, {
      pharmacyIds: attendanceScanScopeIds,
    });
    if (!staff) {
      throw new Error("employee_not_found");
    }
    if (!canManageHrFor(staff.pharmacyId)) {
      throw new Error("forbidden_branch");
    }

    const todayRecord = attendanceRecords.find(
      (row) => row.userId === staff.attendanceKey && row.workDate === todayIso,
    );

    let action: "check_in" | "check_out";
    if (attendanceScanMode === "in") {
      action = "check_in";
    } else if (attendanceScanMode === "out") {
      action = "check_out";
    } else if (!todayRecord?.checkIn) {
      action = "check_in";
    } else if (!todayRecord?.checkOut) {
      action = "check_out";
    } else {
      throw new Error("attendance_complete");
    }

    if (action === "check_in") {
      const schedule = resolveWorkSchedule(
        staff,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId,
      );
      const graceMinutes = resolveAllowedLateMinutes(schedule.shiftId, payrollConfig.workShifts);
      await pharmacyService.recordCheckIn(staff.attendanceKey, staff.name, todayIso, {
        expectedSchedule: schedule,
        shiftId: schedule.shiftId,
        graceMinutes,
      });
    } else {
      await pharmacyService.recordCheckOut(staff.attendanceKey, staff.name, todayIso);
    }

    await invalidateAttendance();
    playBarcodeBeep();

    const time = new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const message =
      action === "check_in"
        ? isArabic
          ? `تم تسجيل حضور ${staff.name} — ${time}`
          : `Checked in ${staff.name} — ${time}`
        : isArabic
          ? `تم تسجيل انصراف ${staff.name} — ${time}`
          : `Checked out ${staff.name} — ${time}`;

    setAttendanceScanFeedback({ text: message, ok: true });
    window.setTimeout(() => setAttendanceScanFeedback(null), 2800);
  }

  async function handleCheckOut(userId: string, userName: string, workDate = todayIso) {
    setBusyAction(`out-${userId}`);
    try {
      await pharmacyService.recordCheckOut(userId, userName, workDate);
      await invalidateAttendance();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      alert(
        code === "check_in_required"
          ? isArabic
            ? "سجّل الحضور أولاً"
            : "Check in first"
          : code === "already_checked_out"
            ? isArabic
              ? "تم تسجيل الانصراف مسبقاً"
              : "Already checked out"
            : isArabic
              ? "تعذر تسجيل الانصراف"
              : "Could not check out",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSetStatus(
    userId: string,
    userName: string,
    status: AttendanceStatus,
    workDate = todayIso,
  ) {
    setBusyAction(`status-${userId}`);
    try {
      await pharmacyService.setAttendanceStatus(userId, userName, workDate, status);
      await invalidateAttendance();
    } catch {
      alert(isArabic ? "تعذر تحديث الحالة" : "Could not update status");
    } finally {
      setBusyAction("");
    }
  }

  function beginAttendanceLogEdit(workDate: string, emp: HrStaffRow, record?: AttendanceRecord) {
    const plannedSchedule = resolveWorkSchedule(
      emp,
      payrollConfig.workShifts,
      payrollConfig.defaultShiftId,
    );
    setAttendanceLogEdit({
      userId: emp.attendanceKey,
      userName: emp.name,
      workDate,
      status: record?.status ?? "",
      checkInTime: isoToTimeInput(record?.checkIn),
      checkOutTime: isoToTimeInput(record?.checkOut),
      actualShiftId: record?.shiftId || plannedSchedule.shiftId,
      recordId: record?.id,
    });
  }

  async function updateActualShiftOnly(
    emp: HrStaffRow,
    workDate: string,
    record: AttendanceRecord | undefined,
    actualShiftId: ShiftId,
    plannedShiftId: ShiftId,
  ) {
    if (!record && actualShiftId === plannedShiftId) return;

    setBusyAction(`shift-${emp.attendanceKey}-${workDate}`);
    try {
      if (!record) {
        await pharmacyService.upsertAttendanceRecord({
          userId: emp.attendanceKey,
          userName: emp.name,
          workDate,
          shiftId: actualShiftId,
          status: "absent",
        });
      } else if (isShiftOnlyPresetRecord(record) && actualShiftId === plannedShiftId) {
        await pharmacyService.deleteAttendanceRecord(record.id);
      } else {
        await pharmacyService.upsertAttendanceRecord({
          id: record.id,
          userId: emp.attendanceKey,
          userName: emp.name,
          workDate,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          shiftId: actualShiftId,
        });
      }
      await invalidateAttendance();
    } catch {
      alert(isArabic ? "تعذر تحديث الشيفت الفعلي" : "Could not update actual shift");
    } finally {
      setBusyAction("");
    }
  }

  async function setEarlyLeaveOutcome(
    emp: HrStaffRow,
    workDate: string,
    record: AttendanceRecord,
    outcome: EarlyLeaveOutcome,
  ) {
    setBusyAction(`early-${emp.attendanceKey}-${workDate}`);
    try {
      await pharmacyService.upsertAttendanceRecord({
        id: record.id,
        userId: emp.attendanceKey,
        userName: emp.name,
        workDate,
        status: record.status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        shiftId: record.shiftId,
        earlyLeaveOutcome: outcome,
      });
      await invalidateAttendance();
    } catch {
      alert(isArabic ? "تعذر حفظ قرار الانصراف المبكر" : "Could not save early leave decision");
    } finally {
      setBusyAction("");
    }
  }

  async function saveAttendanceLogEdit() {
    if (!attendanceLogEdit) return;
    const {
      userId,
      userName,
      workDate,
      status,
      checkInTime,
      checkOutTime,
      actualShiftId,
      recordId,
    } = attendanceLogEdit;
    setBusyAction(`attendance-log-${userId}-${workDate}`);
    try {
      if (!status) {
        if (recordId) {
          await pharmacyService.deleteAttendanceRecord(recordId);
        }
      } else {
        const clearsTimes = statusClearsTimes(status);
        const checkIn = clearsTimes
          ? undefined
          : pharmacyService.buildAttendanceCheckInIso(workDate, checkInTime);
        const checkOut = clearsTimes
          ? undefined
          : pharmacyService.buildAttendanceCheckOutIso(workDate, checkInTime, checkOutTime);
        const actualSchedule = resolveScheduleForShiftId(
          actualShiftId,
          payrollConfig.workShifts,
          payrollConfig.defaultShiftId,
        );
        let finalStatus = status;
        if (checkIn && (status === "present" || status === "late")) {
          const graceMinutes = resolveAllowedLateMinutes(
            actualSchedule.shiftId,
            payrollConfig.workShifts,
          );
          finalStatus = isCheckInLate(checkIn, actualSchedule, graceMinutes) ? "late" : "present";
        }
        await pharmacyService.upsertAttendanceRecord({
          id: recordId,
          userId,
          userName,
          workDate,
          status: finalStatus,
          checkIn,
          checkOut,
          shiftId: actualSchedule.shiftId,
        });
      }
      await invalidateAttendance();
      setAttendanceLogEdit(null);
    } catch {
      alert(isArabic ? "تعذر حفظ سجل الحضور" : "Could not save attendance record");
    } finally {
      setBusyAction("");
    }
  }

  const attendanceMonthBounds = useMemo(
    () => monthBoundsFromDate(monthAnchorDate(attendanceMonth)),
    [attendanceMonth],
  );

  const filteredAttendanceEmployees = useMemo(() => {
    let rows = activeEmployees;
    if (showOrgHr && attendanceBranchFilter !== "all") {
      rows = rows.filter((emp) => emp.pharmacyId === attendanceBranchFilter);
    }
    if (!attendanceEmployeeFilter) return rows;
    return rows.filter((emp) => emp.attendanceKey === attendanceEmployeeFilter);
  }, [activeEmployees, attendanceEmployeeFilter, attendanceBranchFilter, showOrgHr]);

  const attendanceTableRows = useMemo(() => {
    const { start, end } = attendanceMonthBounds;
    if (!start || !end) return [];
    const days = listDaysInMonth(start, end);
    const recordByKey = new Map(
      attendanceRecords.map((record) => [`${record.userId}:${record.workDate}`, record]),
    );
    const rows: { emp: HrStaffRow; workDate: string; record?: AttendanceRecord }[] = [];
    for (const emp of filteredAttendanceEmployees) {
      for (const workDate of days) {
        rows.push({
          emp,
          workDate,
          record: recordByKey.get(`${emp.attendanceKey}:${workDate}`),
        });
      }
    }
    return rows.sort(
      (a, b) => a.workDate.localeCompare(b.workDate) || a.emp.name.localeCompare(b.emp.name),
    );
  }, [attendanceMonthBounds, attendanceRecords, filteredAttendanceEmployees]);

  const attendanceHoursSummary = useMemo(() => {
    const keys = new Set(
      attendanceTableRows.map(({ emp, workDate }) => `${emp.attendanceKey}:${workDate}`),
    );
    const filteredRecords = attendanceRecords.filter((r) => keys.has(`${r.userId}:${r.workDate}`));
    const recordsByUser = new Map<string, AttendanceRecord[]>();

    for (const record of filteredRecords) {
      const list = recordsByUser.get(record.userId) || [];
      list.push(record);
      recordsByUser.set(record.userId, list);
    }

    let regularMinutes = 0;
    let overtimeMinutes = 0;
    let lateCount = 0;
    let permissionCount = 0;
    let earlyLeaveDeductionCount = 0;

    for (const { emp, workDate, record } of attendanceTableRows) {
      if (!record || !isAttendanceWorkDay(record)) continue;

      const plannedSchedule = resolveWorkSchedule(
        emp,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId,
      );
      const actualSchedule = resolveScheduleForShiftId(
        record.shiftId || plannedSchedule.shiftId,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId,
      );
      const graceMinutes = resolveAllowedLateMinutes(
        actualSchedule.shiftId,
        payrollConfig.workShifts,
      );
      const hasApprovedPermission = pharmacyService.hasApprovedPermissionForDate(
        employeeRequests,
        emp.attendanceKey,
        emp.employeeId,
        workDate,
      );
      const approvedEarlyLeave = isEarlyLeaveApproved(
        record.earlyLeaveOutcome,
        hasApprovedPermission,
      );
      const rawEarlyLeave = evaluateAttendanceTiming(
        workDate,
        record.checkIn,
        record.checkOut,
        actualSchedule,
        graceMinutes,
        { approvedEarlyLeave: false },
      ).isEarlyLeave;
      const timing = evaluateAttendanceTiming(
        workDate,
        record.checkIn,
        record.checkOut,
        actualSchedule,
        graceMinutes,
        { approvedEarlyLeave },
      );
      if (timing.isLate) lateCount += 1;
      if (rawEarlyLeave) {
        if (record.earlyLeaveOutcome === "deduction") {
          earlyLeaveDeductionCount += 1;
        } else {
          permissionCount += 1;
        }
      }
    }

    for (const emp of filteredAttendanceEmployees) {
      const empRecords = recordsByUser.get(emp.attendanceKey) || [];
      if (empRecords.length === 0) continue;

      const schedule = resolveWorkSchedule(
        emp,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId,
      );
      const standardHoursPerDay =
        computeWorkHoursFromSchedule(schedule) ||
        emp.requiredWorkHours ||
        payrollConfig.standardWorkHours ||
        8;

      const split = pharmacyService.splitRegularAndOvertimeMinutes(empRecords, standardHoursPerDay);
      regularMinutes += split.regularMinutes;
      overtimeMinutes += split.overtimeMinutes;
    }

    return {
      regularMinutes,
      overtimeMinutes,
      lateCount,
      permissionCount,
      earlyLeaveDeductionCount,
    };
  }, [
    attendanceTableRows,
    attendanceRecords,
    filteredAttendanceEmployees,
    payrollConfig.workShifts,
    payrollConfig.defaultShiftId,
    payrollConfig.standardWorkHours,
    employeeRequests,
  ]);

  const showEmployeeColumn = !attendanceEmployeeFilter;
  const showBranchColumn = showOrgHr && showEmployeeColumn;
  const showAttendanceActions = canManage || canEditAttendanceLog;

  const attendanceTableColSpan =
    7 + (showEmployeeColumn ? 1 : 0) + (showBranchColumn ? 1 : 0) + (showAttendanceActions ? 1 : 0);

  return {
    attendanceMonth,
    setAttendanceMonth,
    attendanceEmployeeFilter,
    setAttendanceEmployeeFilter,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    attendanceBranchFilter,
    setAttendanceBranchFilter,
    attendanceRecords,
    attendanceLogEdit,
    setAttendanceLogEdit,
    attendanceScanMode,
    setAttendanceScanMode,
    attendanceScanFeedback,
    setAttendanceScanFeedback,
    loadAttendance,
    handleCheckIn,
    handleCheckOut,
    handleSetStatus,
    handleAttendanceBarcodeScan,
    beginAttendanceLogEdit,
    updateActualShiftOnly,
    setEarlyLeaveOutcome,
    saveAttendanceLogEdit,
    filteredAttendanceEmployees,
    attendanceTableRows,
    attendanceHoursSummary,
    showEmployeeColumn,
    showBranchColumn,
    showAttendanceActions,
    attendanceTableColSpan,
    showAttendanceScanner,
    isAttendanceLoading,
    isAttendanceFetching,
  };
}
