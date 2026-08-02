import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActivityLog,
  Employee,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacyRoleConfig,
  SystemUser,
} from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { STAFF_ACTIVITY_TYPES } from "../../../utils/roles";
import type { StaffSharedContext } from "./shared";

type StaffDataParams = Pick<
  StaffSharedContext,
  | "appUser"
  | "pharmacyId"
  | "loadOrgEmployeeScope"
  | "shouldLoadLoginCatalog"
  | "orgBranchIds"
  | "canViewLoginAccountsTab"
  | "setLoading"
  | "setLoadError"
>;

export function useStaffDataState({
  appUser,
  pharmacyId,
  loadOrgEmployeeScope,
  shouldLoadLoginCatalog,
  orgBranchIds,
  canViewLoginAccountsTab,
  setLoading,
  setLoadError,
}: StaffDataParams) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginCatalog, setLoginCatalog] = useState<PharmacyLoginAccount[]>([]);
  const [customRoles, setCustomRoles] = useState<PharmacyCustomRole[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<PharmacyRoleConfig[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
      const loadOrgScope = loadOrgEmployeeScope;
      const [empRows, logs, catalog, users, roleRows, configRows] = await Promise.all([
        loadOrgScope
          ? pharmacyService.getEmployeesForPharmacies(orgBranchIds)
          : pharmacyService.getEmployees(),
        pharmacyService.getActivityLogs(),
        shouldLoadLoginCatalog
          ? loadOrgScope
            ? pharmacyService.getPharmacyLoginAccountsForPharmacies(orgBranchIds)
            : pharmacyService.getPharmacyLoginAccounts(targetPharmacyId)
          : Promise.resolve([]),
        loadOrgScope
          ? pharmacyService.getSystemUsersForPharmacies(orgBranchIds)
          : pharmacyService.getSystemUsers(targetPharmacyId),
        loadOrgScope
          ? pharmacyService.getPharmacyCustomRolesForPharmacies(orgBranchIds, {
              includeInactive: canViewLoginAccountsTab,
            })
          : pharmacyService.getPharmacyCustomRoles(targetPharmacyId, {
              includeInactive: canViewLoginAccountsTab,
            }),
        loadOrgScope
          ? pharmacyService.getPharmacyRoleConfigsForPharmacies(orgBranchIds)
          : pharmacyService.getPharmacyRoleConfigs(targetPharmacyId),
      ]);
      setEmployees(empRows);
      setActivityLogs(logs);
      setLoginCatalog(catalog);
      setSystemUsers(users);
      setCustomRoles(roleRows);
      setRoleConfigs(configRows);
      pharmacyService.setPharmacyCustomRoles(roleRows.filter((role) => role.isActive !== false));
      pharmacyService.setPharmacyRoleConfigs(configRows);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "load_failed");
      setEmployees([]);
      setLoginCatalog([]);
      setSystemUsers([]);
      setCustomRoles([]);
      setRoleConfigs([]);
      pharmacyService.setPharmacyCustomRoles([]);
      pharmacyService.setPharmacyRoleConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [
    appUser,
    pharmacyId,
    loadOrgEmployeeScope,
    shouldLoadLoginCatalog,
    orgBranchIds,
    canViewLoginAccountsTab,
    setLoading,
    setLoadError,
  ]);

  const refreshLoginCatalog = useCallback(async () => {
    if (!shouldLoadLoginCatalog) return;
    const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
    const loadOrgScope = loadOrgEmployeeScope;
    try {
      const [catalog, users] = await Promise.all([
        loadOrgScope
          ? pharmacyService.getPharmacyLoginAccountsForPharmacies(orgBranchIds)
          : pharmacyService.getPharmacyLoginAccounts(targetPharmacyId),
        loadOrgScope
          ? pharmacyService.getSystemUsersForPharmacies(orgBranchIds)
          : pharmacyService.getSystemUsers(targetPharmacyId),
      ]);
      setLoginCatalog(catalog);
      setSystemUsers(users);
    } catch (err) {
      console.error(err);
    }
  }, [
    appUser?.pharmacyId,
    orgBranchIds,
    pharmacyId,
    shouldLoadLoginCatalog,
    loadOrgEmployeeScope,
  ]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!shouldLoadLoginCatalog) return;
    return pharmacyService.subscribePharmacyLoginCatalog(() => {
      void refreshLoginCatalog();
    });
  }, [refreshLoginCatalog, shouldLoadLoginCatalog]);

  const staffActivity = useMemo(
    () =>
      activityLogs.filter(
        (log) =>
          STAFF_ACTIVITY_TYPES.includes(log.type) ||
          log.referenceType === "employee" ||
          log.referenceType === "user",
      ),
    [activityLogs],
  );

  return {
    employees,
    loginCatalog,
    customRoles,
    roleConfigs,
    systemUsers,
    activityLogs,
    loadAll,
    refreshLoginCatalog,
    staffActivity,
  };
}
