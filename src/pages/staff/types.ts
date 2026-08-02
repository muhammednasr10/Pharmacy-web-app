import type { AppUser, Page, PharmacySettings } from "../../types";
import type { HrTab } from "../hr/types";
import {
  DEFAULT_PHARMACY_SHIFTS,
  type ShiftId,
} from "../../utils/workSchedule";
import { defaultPagesForCustomRoleTemplate } from "../../utils/customRolePages";
import type { UserRole } from "../../types";

export type TabId = "employees" | "permissions" | "activity" | HrTab;

export type ActivityInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
};

export type EmployeesUsersPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  pharmacies: PharmacySettings[];
  tenantScopePharmacyId?: string | null;
  currency: string;
  currentUid?: string;
  onActivityLog: (data: ActivityInput) => Promise<void>;
  onOpenSubscriptionSettings?: () => void;
};

export const emptyEmployeeForm = {
  pharmacyId: "",
  employeeCode: "",
  photoBase64: "",
  name: "",
  phone: "",
  salary: 0,
  commissionRate: 0,
  requiredWorkHours: 8,
  assignedShiftId: "A" as ShiftId,
  useCustomWorkSchedule: false,
  workDayStart: DEFAULT_PHARMACY_SHIFTS[0].dayStart,
  workDayEnd: DEFAULT_PHARMACY_SHIFTS[0].dayEnd,
  workBreaks: [] as (typeof DEFAULT_PHARMACY_SHIFTS)[0]["breaks"],
  hireDate: "",
  notes: "",
  isActive: true,
};

export const emptyCustomRoleForm = () => ({
  nameAr: "",
  nameEn: "",
  baseRole: "cashier" as UserRole,
  allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
});

export const emptyCatalogForm = () => ({
  role: "cashier" as UserRole,
  email: "",
  password: "",
});
