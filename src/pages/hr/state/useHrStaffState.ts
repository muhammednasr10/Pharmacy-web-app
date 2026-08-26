import { useCallback, useMemo, useState } from "react";
import type { Employee, ShiftId, SystemUser } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import type { HrStaffRow } from "../types";

type StaffParams = {
  pharmacyId: string;
  showOrgHr: boolean;
  orgBranchIds: string[];
  payrollConfigRef: React.MutableRefObject<pharmacyService.PayrollSettingsValues>;
};

export function useHrStaffState({
  pharmacyId,
  showOrgHr,
  orgBranchIds,
  payrollConfigRef,
}: StaffParams) {
  const [staffRows, setStaffRows] = useState<HrStaffRow[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      const scopeIds =
        showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : [pharmacyId].filter(Boolean);
      const [employees, accounts] = await Promise.all([
        scopeIds.length > 1
          ? pharmacyService.getEmployeesForPharmacies(scopeIds)
          : pharmacyService.getEmployees(),
        scopeIds.length > 1
          ? pharmacyService.getSystemUsersForPharmacies(scopeIds)
          : pharmacyId
            ? pharmacyService.getSystemUsers(pharmacyId)
            : Promise.resolve([] as SystemUser[]),
      ]);
      const accountByEmployee = new Map<string, SystemUser>();
      accounts.forEach((acc) => {
        if (acc.employeeId) accountByEmployee.set(acc.employeeId, acc);
      });
      const rows: HrStaffRow[] = employees
        .filter((e: Employee) => e.isActive)
        .map((emp: Employee) => {
          const linked = accountByEmployee.get(emp.id);
          return {
            employeeId: emp.id,
            pharmacyId: emp.pharmacyId,
            employeeCode: emp.employeeCode,
            photoBase64: emp.photoBase64,
            name: emp.name,
            phone: emp.phone,
            jobTitle: emp.jobTitle,
            attendanceKey: linked?.uid || emp.id,
            salary: emp.salary,
            requiredWorkHours: emp.requiredWorkHours ?? 8,
            commissionRate: emp.commissionRate ?? 0,
            assignedShiftId:
              (emp.assignedShiftId as ShiftId) || payrollConfigRef.current!.defaultShiftId || "A",
            useCustomWorkSchedule: Boolean(emp.useCustomWorkSchedule),
            workDayStart: emp.workDayStart,
            workDayEnd: emp.workDayEnd,
            workBreaks: emp.workBreaks,
          };
        });
      setStaffRows(rows);
    } catch (err) {
      console.error(err);
      setStaffRows([]);
    }
  }, [pharmacyId, showOrgHr, orgBranchIds, payrollConfigRef]);

  const activeEmployees = useMemo(() => staffRows.filter((row) => row.name), [staffRows]);

  const staffByAttendanceKey = useMemo(() => {
    const map = new Map<string, HrStaffRow>();
    staffRows.forEach((row) => map.set(row.attendanceKey, row));
    return map;
  }, [staffRows]);

  const staffBranchByKey = useMemo(() => {
    const map = new Map<string, string>();
    staffRows.forEach((row) => {
      map.set(row.attendanceKey, row.pharmacyId);
      map.set(row.employeeId, row.pharmacyId);
    });
    return map;
  }, [staffRows]);

  return {
    staffRows,
    setStaffRows,
    loadStaff,
    activeEmployees,
    staffByAttendanceKey,
    staffBranchByKey,
  };
}
