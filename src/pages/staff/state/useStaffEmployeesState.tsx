import { staffActionErrorMessage } from "../helpers";
import { useStaffEmployeeAssignment } from "./employees/useStaffEmployeeAssignment";
import { useStaffEmployeeCrudState } from "./employees/useStaffEmployeeCrudState";
import type { StaffEmployeesParams } from "./employees/types";

export type { StaffEmployeesParams } from "./employees/types";

export function useStaffEmployeesState(params: StaffEmployeesParams) {
  const crud = useStaffEmployeeCrudState(params);
  const assignment = useStaffEmployeeAssignment(params);

  return {
    ...crud,
    ...assignment,
    staffActionErrorMessage: (err: unknown, fallback: string) =>
      staffActionErrorMessage(err, params.isArabic, fallback),
  };
}
