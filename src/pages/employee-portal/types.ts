import type { AppUser, Employee, ShiftId } from "../../types";

export type EmployeePortalPanel = "profile" | "leave" | "permission";

export type EmployeeScheduleTab = "plan" | "log";

export type EmployeePortalPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
};

export type StaffContext = {
  employeeId: string;
  pharmacyId: string;
  name: string;
  employeeCode?: string;
  photoBase64?: string;
  phone?: string;
  jobTitle?: string;
  hireDate?: string;
  notes?: string;
  email?: string;
  role?: string;
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
