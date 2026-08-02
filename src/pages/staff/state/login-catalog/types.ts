import type { PharmacyLoginAccount, SystemUser } from "../../../../types";
import type { StaffSharedContext, StaffSharedDerived } from "../shared";

export type StaffLoginCatalogParams = Pick<
  StaffSharedContext,
  | "isArabic"
  | "appUser"
  | "pharmacyId"
  | "tenantScopePharmacyId"
  | "currentUid"
  | "onActivityLog"
  | "canViewLoginAccountsTab"
  | "canManageLoginAccountsCatalog"
  | "branchDirectory"
  | "orgBranchIds"
  | "catalogBranchFilter"
  | "setCatalogBranchFilter"
  | "employeeBranchFilter"
  | "loginAccountsPanelBranchFilter"
  | "setLoginAccountsPanelBranchFilter"
  | "setEmployeesAccessPanel"
  | "busy"
  | "setBusy"
> &
  Pick<
    StaffSharedDerived,
    "employeeById" | "generalManagerScope" | "employeesPanelPharmacyId"
  > & {
    loginCatalog: PharmacyLoginAccount[];
    customRoles: import("../../../../types").PharmacyCustomRole[];
    systemUsers: SystemUser[];
    orgUserUsage: ReturnType<
      typeof import("../../../../utils/userLimits").getOrganizationUserUsage
    > | null;
    loadAll: () => Promise<void>;
    refreshLoginCatalog: () => Promise<void>;
  };
