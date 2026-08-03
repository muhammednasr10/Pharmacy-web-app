import type { AppUser, Employee, ShiftId } from "../../types";

export type EmployeePortalPanel = "profile" | "leave" | "permission";

export type EmployeePortalPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
};

export type StaffContext = {
  employeeId: string;
  pharmacyId: string;
  name: string;
  attendanceKey: string;
  assignedShiftId: ShiftId;
  useCustomWorkSchedule: boolean;
  workDayStart?: string;
  workDayEnd?: string;
  workBreaks?: Employee["workBreaks"];
  requiredWorkHours: number;
};

export type LeaveFormState = {
  workDate: string;
  endDate: string;
  reason: string;
};

export type PermissionFormState = {
  workDate: string;
  requestedTime: string;
  reason: string;
};
