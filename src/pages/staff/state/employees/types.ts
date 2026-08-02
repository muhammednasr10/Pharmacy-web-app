import type { PharmacyLoginAccount, SystemUser } from "../../../../types";
import type { StaffSharedContext, StaffSharedDerived } from "../shared";

export type StaffEmployeesParams = Pick<
  StaffSharedContext,
  | "isArabic"
  | "appUser"
  | "pharmacyId"
  | "pharmacies"
  | "onActivityLog"
  | "showOrgHrManage"
  | "canManage"
  | "canViewLoginAccountsTab"
  | "busy"
  | "setBusy"
  | "branchLabel"
> &
  Pick<
    StaffSharedDerived,
    | "employeeById"
    | "catalogByEmployeeId"
    | "generalManagerScope"
    | "loginCatalogByPharmacy"
  > & {
    loginCatalog: PharmacyLoginAccount[];
    customRoles: import("../../../../types").PharmacyCustomRole[];
    systemUsers: SystemUser[];
    loadAll: () => Promise<void>;
    syncSavedCatalogAccount: (
      targetPharmacyId: string,
      role: import("../../../../types").UserRole,
      accountId?: string | null,
    ) => Promise<void>;
    branchCustomRoles: import("../../../../types").PharmacyCustomRole[];
  };
