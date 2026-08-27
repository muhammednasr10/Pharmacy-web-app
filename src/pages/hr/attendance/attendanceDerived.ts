import type { AttendanceRecord, EmployeeRequest } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  isAttendanceWorkDay,
  listDaysInMonth,
} from "../../../utils/hrFormatters";
import {
  computeWorkHoursFromSchedule,
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveAllowedLateMinutes,
  resolveScheduleForShiftId,
  resolveWorkSchedule,
} from "../../../utils/workSchedule";
import type { HrStaffRow } from "../types";

export type AttendanceTableRow = {
  emp: HrStaffRow;
  workDate: string;
  record?: AttendanceRecord;
};

export type AttendanceHoursSummary = {
  regularMinutes: number;
  overtimeMinutes: number;
  lateCount: number;
  permissionCount: number;
  earlyLeaveDeductionCount: number;
};

export function filterAttendanceEmployees(params: {
  activeEmployees: HrStaffRow[];
  showOrgHr: boolean;
  attendanceBranchFilter: string;
  attendanceEmployeeFilter: string;
}): HrStaffRow[] {
  let rows = params.activeEmployees;
  if (params.showOrgHr && params.attendanceBranchFilter !== "all") {
    rows = rows.filter((emp) => emp.pharmacyId === params.attendanceBranchFilter);
  }
  if (!params.attendanceEmployeeFilter) return rows;
  return rows.filter((emp) => emp.attendanceKey === params.attendanceEmployeeFilter);
}

export function buildAttendanceTableRows(params: {
  monthStart: string;
  monthEnd: string;
  employees: HrStaffRow[];
  attendanceRecords: AttendanceRecord[];
}): AttendanceTableRow[] {
  const { monthStart, monthEnd, employees, attendanceRecords } = params;
  if (!monthStart || !monthEnd) return [];

  const days = listDaysInMonth(monthStart, monthEnd);
  const recordByKey = new Map(
    attendanceRecords.map((record) => [`${record.userId}:${record.workDate}`, record]),
  );
  const rows: AttendanceTableRow[] = [];

  for (const emp of employees) {
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
}

export function buildAttendanceHoursSummary(params: {
  attendanceTableRows: AttendanceTableRow[];
  attendanceRecords: AttendanceRecord[];
  filteredEmployees: HrStaffRow[];
  employeeRequests: EmployeeRequest[];
  workShifts: pharmacyService.PayrollSettingsValues["workShifts"];
  defaultShiftId: pharmacyService.PayrollSettingsValues["defaultShiftId"];
  standardWorkHours: number;
}): AttendanceHoursSummary {
  const {
    attendanceTableRows,
    attendanceRecords,
    filteredEmployees,
    employeeRequests,
    workShifts,
    defaultShiftId,
    standardWorkHours,
  } = params;

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

    const plannedSchedule = resolveWorkSchedule(emp, workShifts, defaultShiftId);
    const actualSchedule = resolveScheduleForShiftId(
      record.shiftId || plannedSchedule.shiftId,
      workShifts,
      defaultShiftId,
    );
    const graceMinutes = resolveAllowedLateMinutes(actualSchedule.shiftId, workShifts);
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

  for (const emp of filteredEmployees) {
    const empRecords = recordsByUser.get(emp.attendanceKey) || [];
    if (empRecords.length === 0) continue;

    const schedule = resolveWorkSchedule(emp, workShifts, defaultShiftId);
    const standardHoursPerDay =
      computeWorkHoursFromSchedule(schedule) || emp.requiredWorkHours || standardWorkHours || 8;
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
}

export function filterEmployeesBySearch(
  employees: HrStaffRow[],
  search: string,
  options?: {
    showOrgHr?: boolean;
    resolveBranchLabel?: (pharmacyId: string) => string;
  },
): HrStaffRow[] {
  const query = search.trim().toLowerCase();
  if (!query) return employees;

  return employees.filter((emp) => {
    const haystack = [
      emp.name,
      emp.employeeCode,
      emp.phone,
      emp.jobTitle,
      options?.showOrgHr && options.resolveBranchLabel
        ? options.resolveBranchLabel(emp.pharmacyId)
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
