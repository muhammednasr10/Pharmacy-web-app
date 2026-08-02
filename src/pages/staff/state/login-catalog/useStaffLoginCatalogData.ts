import { useEffect, useMemo } from "react";
import { buildPharmacyRoleSelectOptions } from "../../../../utils/pharmacyGeneralManager";
import { getRoleLabel } from "../../../../utils/roles";
import type { StaffLoginCatalogParams } from "./types";

export type StaffLoginCatalogDataParams = StaffLoginCatalogParams & {
  editCatalogId: string | null;
};

export function useStaffLoginCatalogData(params: StaffLoginCatalogDataParams) {
  const {
    isArabic,
    appUser,
    pharmacyId,
    tenantScopePharmacyId,
    canViewLoginAccountsTab,
    branchDirectory,
    orgBranchIds,
    catalogBranchFilter,
    setCatalogBranchFilter,
    loginAccountsPanelBranchFilter,
    generalManagerScope,
    loginCatalog,
    customRoles,
    systemUsers,
    editCatalogId,
  } = params;

  const catalogTargetPharmacyId = useMemo(() => {
    const fallback =
      pharmacyId ||
      tenantScopePharmacyId ||
      appUser?.pharmacyId ||
      branchDirectory[0]?.id ||
      "main";
    if (!canViewLoginAccountsTab) return fallback;
    return catalogBranchFilter || fallback;
  }, [
    canViewLoginAccountsTab,
    catalogBranchFilter,
    pharmacyId,
    tenantScopePharmacyId,
    appUser?.pharmacyId,
    branchDirectory,
  ]);

  const branchLoginCatalog = useMemo(() => {
    if (!canViewLoginAccountsTab) return loginCatalog;
    return loginCatalog.filter((item) => item.pharmacyId === catalogTargetPharmacyId);
  }, [loginCatalog, canViewLoginAccountsTab, catalogTargetPharmacyId]);

  const branchCustomRoles = useMemo(
    () =>
      customRoles.filter(
        (role) => role.pharmacyId === catalogTargetPharmacyId && role.isActive !== false,
      ),
    [customRoles, catalogTargetPharmacyId],
  );

  const employeesPanelLoginAccounts = useMemo(() => {
    const scoped =
      loginAccountsPanelBranchFilter === "all"
        ? loginCatalog.filter((item) => orgBranchIds.includes(item.pharmacyId))
        : loginCatalog.filter((item) => item.pharmacyId === loginAccountsPanelBranchFilter);
    return [...scoped].sort((a, b) => {
      const byRole = getRoleLabel(a.role, isArabic).localeCompare(
        getRoleLabel(b.role, isArabic),
        isArabic ? "ar" : "en",
      );
      if (byRole !== 0) return byRole;
      return a.email.localeCompare(b.email);
    });
  }, [loginCatalog, loginAccountsPanelBranchFilter, orgBranchIds, isArabic]);

  const employeesPanelAccessUsers = useMemo(() => {
    const scoped =
      loginAccountsPanelBranchFilter === "all"
        ? systemUsers.filter((user) => orgBranchIds.includes(user.pharmacyId))
        : systemUsers.filter((user) => user.pharmacyId === loginAccountsPanelBranchFilter);
    return [...scoped].sort((a, b) => {
      const byRole = getRoleLabel(a.role, isArabic).localeCompare(
        getRoleLabel(b.role, isArabic),
        isArabic ? "ar" : "en",
      );
      if (byRole !== 0) return byRole;
      return a.email.localeCompare(b.email);
    });
  }, [systemUsers, loginAccountsPanelBranchFilter, orgBranchIds, isArabic]);

  const loginAccountRoleSelectOptions = useMemo(() => {
    const editingAccount = editCatalogId
      ? branchLoginCatalog.find((item) => item.id === editCatalogId)
      : undefined;
    return buildPharmacyRoleSelectOptions({
      pharmacyId: catalogTargetPharmacyId,
      customRoles,
      appUser,
      generalManagerScope,
      accountId: editCatalogId || undefined,
      currentRole: editingAccount?.role,
    });
  }, [
    customRoles,
    catalogTargetPharmacyId,
    appUser,
    generalManagerScope,
    editCatalogId,
    branchLoginCatalog,
  ]);

  useEffect(() => {
    if (!canViewLoginAccountsTab) return;
    const fallback =
      tenantScopePharmacyId || pharmacyId || appUser?.pharmacyId || branchDirectory[0]?.id || "";
    if (!fallback) return;
    setCatalogBranchFilter((current) => current || fallback);
  }, [
    canViewLoginAccountsTab,
    tenantScopePharmacyId,
    pharmacyId,
    appUser?.pharmacyId,
    branchDirectory,
    setCatalogBranchFilter,
  ]);

  return {
    catalogTargetPharmacyId,
    branchLoginCatalog,
    branchCustomRoles,
    employeesPanelLoginAccounts,
    employeesPanelAccessUsers,
    loginAccountRoleSelectOptions,
  };
}
