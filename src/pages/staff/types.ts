import type { AppUser, PharmacySettings } from "../../types";
import type { HrTab } from "../hr/types";
import {
  DEFAULT_PHARMACY_SHIFTS,
  type ShiftId,
} from "../../utils/workSchedule";
import type { UserRole } from "../../types";

/**
 * `permissions` / `payroll` kept for deep-link / stale state redirect only.
 * Role toggles live in Settings; salary opens from the employees table.
 */
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
  subscriptionBlocksWrite?: boolean;
};

export const EMPLOYEE_MILITARY_STATUS_OPTIONS = [
  { value: "", ar: "—", en: "—" },
  { value: "completed", ar: "أدى الخدمة", en: "Completed service" },
  { value: "postponed", ar: "مؤجل", en: "Postponed" },
  { value: "exempt", ar: "أعفى", en: "Exempt" },
  { value: "not_served", ar: "لم يؤدِّ الخدمة", en: "Not served" },
  { value: "not_applicable", ar: "لا ينطبق", en: "Not applicable" },
] as const;

export const emptyEmployeeForm = {
  pharmacyId: "",
  employeeCode: "",
  photoBase64: "",
  name: "",
  phone: "",
  address: "",
  militaryStatus: "" as string,
  birthDate: "",
  birthPlace: "",
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

export const emptyCatalogForm = () => ({
  role: "cashier" as UserRole,
  email: "",
  password: "",
});
