import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import { useSuperAdminTenants } from "../useSuperAdminTenants";
import { useSubscriptionRequests } from "../useSubscriptionRequests";
import { usePharmacyLoginAccounts } from "../usePharmacyLoginAccounts";
import { isSuperAdmin } from "../../utils/roles";
import type { Page, UserRole } from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";
import type { AppDataSliceReturn } from "./useAppDataSlice";
import type { AppSharedStateReturn } from "./shared";

type UseAppTenantSliceInput = Pick<
  AppSharedStateReturn,
  "isArabic" | "activePage" | "setActivePage" | "setIsMenuOpen"
> &
  Pick<
    AppAuthSliceReturn,
    "appUser" | "branches" | "setBranches" | "activeBranchId" | "setActiveBranchId" | "getPharmacyId"
  > &
  Pick<
    AppDataSliceReturn,
    | "settingsForm"
    | "setSettingsForm"
    | "pharmacySettings"
    | "addActivityLog"
    | "subscriptionRequests"
    | "setSubscriptionRequests"
    | "pendingPharmacyLoginAccounts"
    | "setPendingPharmacyLoginAccounts"
    | "pendingCustomRoles"
    | "setPendingCustomRoles"
    | "systemUsers"
    | "setSystemUsers"
  >;

export function useAppTenantSlice({
  isArabic,
  activePage,
  setActivePage,
  setIsMenuOpen,
  appUser,
  branches,
  setBranches,
  activeBranchId,
  setActiveBranchId,
  getPharmacyId,
  settingsForm,
  setSettingsForm,
  pharmacySettings,
  addActivityLog,
  subscriptionRequests,
  setSubscriptionRequests,
  pendingPharmacyLoginAccounts,
  setPendingPharmacyLoginAccounts,
  pendingCustomRoles,
  setPendingCustomRoles,
  systemUsers,
  setSystemUsers,
}: UseAppTenantSliceInput) {
  const [selectedTenantId, setSelectedTenantId] = useState("main");
  const [employeesPageTenantScope, setEmployeesPageTenantScope] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    packageChoice: "basic" as SubscriptionTier | "custom",
    subscriptionTier: "basic" as SubscriptionTier,
    maxBranches: 1,
    maxUsers: 5,
  });
  const [tenantUserForm, setTenantUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "pharmacy_admin" as UserRole,
    uid: "",
    pharmacyId: "",
  });
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [creatingTenantUser, setCreatingTenantUser] = useState(false);

  const {
    handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest,
    handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest,
  } = useSubscriptionRequests({
    isArabic,
    appUser,
    subscriptionRequests,
    setSubscriptionRequests,
    branches,
    setBranches,
    settingsForm,
    setSettingsForm,
    pharmacySettings,
    getPharmacyId,
    addActivityLog,
  });

  const { handleApprovePharmacyLoginAccount, handleRejectPharmacyLoginAccount } =
    usePharmacyLoginAccounts({
      isArabic,
      appUser,
      pendingPharmacyLoginAccounts,
      setPendingPharmacyLoginAccounts,
      addActivityLog,
    });

  const {
    resetTenantForm,
    resetTenantUserForm,
    handleCreateTenant,
    handleCreateTenantUser,
    handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch,
    handleDeleteOrganization,
    handleDeleteOrganizationBranch,
    handleDeleteTenantStaff,
    handleUpdateSubscriptionTier,
    handleUpdateOrganizationFreeTrial,
    handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers,
    handleUpdateTenantStatus,
    handleSwitchTenantView,
    handleOpenTenantUsers,
    refreshPharmacies,
  } = useSuperAdminTenants({
    isArabic,
    appUser,
    branches,
    setBranches,
    setSystemUsers,
    selectedTenantId,
    setSelectedTenantId,
    tenantForm,
    setTenantForm,
    tenantUserForm,
    setTenantUserForm,
    setCreatingTenant,
    setCreatingTenantUser,
    activeBranchId,
    setActiveBranchId,
    setActivePage,
  });

  const openTenantEmployeesPage = useCallback(
    (pharmacyId: string) => {
      setEmployeesPageTenantScope(pharmacyId);
      handleOpenTenantUsers(pharmacyId);
    },
    [handleOpenTenantUsers],
  );

  useEffect(() => {
    if (activePage !== "users") {
      setEmployeesPageTenantScope(null);
    }
  }, [activePage]);

  const refreshAdminRequestsStable = useCallback(async () => {
    if (!isSuperAdmin(appUser)) return;
    setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
    setPendingPharmacyLoginAccounts(
      await pharmacyService.getAllPharmacyLoginAccounts({
        pendingApproval: true,
      }),
    );
    setPendingCustomRoles(await pharmacyService.getAllPendingPharmacyCustomRoles());
  }, [appUser, setPendingCustomRoles, setPendingPharmacyLoginAccounts, setSubscriptionRequests]);

  const refreshSystemUsersStable = useCallback(async () => {
    if (!isSuperAdmin(appUser)) return;
    setSystemUsers(await pharmacyService.getAllSystemUsers());
  }, [appUser, setSystemUsers]);

  useEffect(() => {
    if (!appUser || !isSuperAdmin(appUser)) return;
    if (activePage !== "tenants") return;
    void refreshAdminRequestsStable();
    void refreshSystemUsersStable();
  }, [activePage, appUser?.uid, refreshAdminRequestsStable, refreshSystemUsersStable]);

  const onOpenTenants = useCallback(() => {
    setActivePage("tenants");
    setIsMenuOpen(false);
  }, [setActivePage, setIsMenuOpen]);

  const adminNavBadges = useMemo((): Partial<Record<Page, number>> | undefined => {
    if (!isSuperAdmin(appUser)) return undefined;
    const pendingSubscriptions = subscriptionRequests.filter(
      (request) => request.status === "pending",
    ).length;
    const pendingTotal =
      pendingSubscriptions + pendingPharmacyLoginAccounts.length + pendingCustomRoles.length;
    if (pendingTotal <= 0) return undefined;
    return { tenants: pendingTotal };
  }, [appUser, subscriptionRequests, pendingPharmacyLoginAccounts.length, pendingCustomRoles.length]);

  return {
    selectedTenantId,
    setSelectedTenantId,
    employeesPageTenantScope,
    tenantForm,
    setTenantForm,
    tenantUserForm,
    setTenantUserForm,
    creatingTenant,
    creatingTenantUser,
    resetTenantForm,
    resetTenantUserForm,
    handleCreateTenant,
    handleCreateTenantUser,
    handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch,
    handleDeleteOrganization,
    handleDeleteOrganizationBranch,
    handleDeleteTenantStaff,
    handleUpdateSubscriptionTier,
    handleUpdateOrganizationFreeTrial,
    handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers,
    handleUpdateTenantStatus,
    handleSwitchTenantView,
    handleOpenTenantUsers,
    openTenantEmployeesPage,
    refreshPharmacies,
    handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest,
    handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest,
    handleApprovePharmacyLoginAccount,
    handleRejectPharmacyLoginAccount,
    refreshAdminRequestsStable,
    refreshSystemUsersStable,
    onOpenTenants,
    adminNavBadges,
  };
}

export type AppTenantSliceReturn = ReturnType<typeof useAppTenantSlice>;
