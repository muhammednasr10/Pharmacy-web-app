import type {
  AppUser,
  AttendanceStatus,
  Employee,
  PharmacySettings,
  ShiftId,
} from "../../types";

export type HrTab = "attendance" | "payroll" | "requests";

export type HrStaffRow = {
  employeeId: string;
  pharmacyId: string;
  employeeCode?: string;
  photoBase64?: string;
  name: string;
  phone?: string;
  jobTitle?: string;
  attendanceKey: string;
  salary: number;
  requiredWorkHours: number;
  commissionRate: number;
  assignedShiftId: ShiftId;
  useCustomWorkSchedule: boolean;
  workDayStart?: string;
  workDayEnd?: string;
  workBreaks?: Employee["workBreaks"];
};

export type PayrollAdditionsDraft = {
  specialAllowances: number;
  bonuses: number;
  incentives: number;
  commission: number;
};

export type AttendanceLogDraft = {
  userId: string;
  userName: string;
  workDate: string;
  status: AttendanceStatus | "";
  checkInTime: string;
  checkOutTime: string;
  actualShiftId: ShiftId;
  recordId?: number;
};

export type HrPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  pharmacyName?: string;
  currency: string;
  hasRole: (roles: AppUser["role"][]) => boolean;
  embedded?: boolean;
  activeTab?: HrTab;
  showOrgHr?: boolean;
  orgBranchIds?: string[];
  orgBranches?: Pick<PharmacySettings, "id" | "name" | "name_en" | "organizationId">[];
  resolveBranchLabel?: (branchId: string) => string;
  hrManagePharmacyId?: string;
  orgHrReadOnly?: boolean;
};
