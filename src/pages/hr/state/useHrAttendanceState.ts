import { useEffect, useMemo, useState } from "react";
import type { EmployeeRequest } from "../../../types";
import { useAttendanceRecordsQuery } from "../../../queries/useAttendanceRecordsQuery";
import {
  currentMonthValue,
  monthAnchorDate,
  monthBoundsFromDate,
} from "../../../utils/hrFormatters";
import type { AttendanceLogDraft, HrStaffRow } from "../types";
import type { HrSharedContext } from "./shared";
import { useHrAttendanceActions } from "./useHrAttendanceActions";
import {
  buildAttendanceHoursSummary,
  buildAttendanceTableRows,
  filterAttendanceEmployees,
} from "../attendance/attendanceDerived";

type AttendanceParams = Pick<
  HrSharedContext,
  | "isArabic"
  | "pharmacyId"
  | "showOrgHr"
  | "orgBranchIds"
  | "canManage"
  | "canEditAttendanceLog"
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
    setLoading(isAttendanceLoading);
  }, [isAttendanceLoading, setLoading]);

  useEffect(() => {
    if (!attendanceError) return;
    setError(attendanceError instanceof Error ? attendanceError.message : "load_failed");
    setLoading(false);
  }, [attendanceError, setError, setLoading]);

  const actions = useHrAttendanceActions({
    isArabic,
    todayIso,
    payrollConfig,
    staffRows,
    attendanceLogEdit,
    setAttendanceLogEdit,
    setBusyAction,
    invalidateAttendance,
  });

  const attendanceMonthBounds = useMemo(
    () => monthBoundsFromDate(monthAnchorDate(attendanceMonth)),
    [attendanceMonth],
  );

  const filteredAttendanceEmployees = useMemo(
    () =>
      filterAttendanceEmployees({
        activeEmployees,
        showOrgHr,
        attendanceBranchFilter,
        attendanceEmployeeFilter,
      }),
    [activeEmployees, attendanceEmployeeFilter, attendanceBranchFilter, showOrgHr],
  );

  const attendanceTableRows = useMemo(
    () =>
      buildAttendanceTableRows({
        monthStart: attendanceMonthBounds.start,
        monthEnd: attendanceMonthBounds.end,
        employees: filteredAttendanceEmployees,
        attendanceRecords,
      }),
    [attendanceMonthBounds, attendanceRecords, filteredAttendanceEmployees],
  );

  const attendanceHoursSummary = useMemo(
    () =>
      buildAttendanceHoursSummary({
        attendanceTableRows,
        attendanceRecords,
        filteredEmployees: filteredAttendanceEmployees,
        employeeRequests,
        workShifts: payrollConfig.workShifts,
        defaultShiftId: payrollConfig.defaultShiftId,
        standardWorkHours: payrollConfig.standardWorkHours,
      }),
    [
      attendanceTableRows,
      attendanceRecords,
      filteredAttendanceEmployees,
      payrollConfig.workShifts,
      payrollConfig.defaultShiftId,
      payrollConfig.standardWorkHours,
      employeeRequests,
    ],
  );

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
    loadAttendance,
    ...actions,
    filteredAttendanceEmployees,
    attendanceTableRows,
    attendanceHoursSummary,
    showEmployeeColumn,
    showBranchColumn,
    showAttendanceActions,
    attendanceTableColSpan,
    isAttendanceLoading,
    isAttendanceFetching,
  };
}
