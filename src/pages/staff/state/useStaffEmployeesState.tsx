import { staffActionErrorMessage } from "../helpers";
import { useStaffEmployeeAssignment } from "./employees/useStaffEmployeeAssignment";
import { useStaffEmployeeCrudState } from "./employees/useStaffEmployeeCrudState";
import { useStaffEmployeeSalaryState } from "./employees/useStaffEmployeeSalaryState";
import type { StaffEmployeesParams } from "./employees/types";

export type { StaffEmployeesParams } from "./employees/types";

export function useStaffEmployeesState(params: StaffEmployeesParams) {
  const salary = useStaffEmployeeSalaryState({
    isArabic: params.isArabic,
    appUser: params.appUser,
    pharmacyId: params.pharmacyId,
    currency: params.currency,
    canManage: params.canManage,
    systemUsers: params.systemUsers,
  });

  const crud = useStaffEmployeeCrudState({
    ...params,
    onEmployeeDeleted: (employeeId) => {
      if (salary.salaryModalEmployee?.id === employeeId) {
        salary.closeEmployeeSalaryModal();
      }
    },
  });
  const assignment = useStaffEmployeeAssignment(params);

  return {
    ...crud,
    ...salary,
    ...assignment,
    staffActionErrorMessage: (err: unknown, fallback: string) =>
      staffActionErrorMessage(err, params.isArabic, fallback),
  };
}
