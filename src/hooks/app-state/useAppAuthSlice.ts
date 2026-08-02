import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import { ACTIVE_PAGE_STORAGE_KEY } from "../../utils/sessionNavigation";
import { getAllowedPages } from "../../utils/roles";
import {
  canSwitchBranchesWithTier,
  resolveOrganizationTier,
} from "../../utils/subscriptionFeatures";
import { isAllBranchesMode } from "../../constants/branches";
import type { Page, PharmacySettings } from "../../types";
import { useAppAuth } from "../useAppAuth";
import type { AppSharedStateReturn } from "./shared";

type UseAppAuthSliceInput = Pick<AppSharedStateReturn, "isArabic" | "activePage" | "setActivePage">;

export function useAppAuthSlice({ isArabic, activePage, setActivePage }: UseAppAuthSliceInput) {
  const [branches, setBranches] = useState<PharmacySettings[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const { user, appUser, userLoading, loginScreenStatus, loginFormProps, handleLogout } =
    useAppAuth({ isArabic, activeBranchId, setActiveBranchId });

  const getPharmacyId = useCallback(() => {
    if (activeBranchId && !isAllBranchesMode(activeBranchId)) {
      return activeBranchId;
    }
    return appUser?.pharmacyId || "default-pharmacy";
  }, [activeBranchId, appUser?.pharmacyId]);

  const orgSubscriptionTier = useMemo(
    () => resolveOrganizationTier(branches, appUser?.pharmacyId),
    [branches, appUser?.pharmacyId],
  );

  useEffect(() => {
    if (!appUser) {
      pharmacyService.setPharmacyCustomRoles([]);
      return;
    }
    void pharmacyService.loadPharmacyRoleAccessIntoScope(appUser, branches).catch((error) => {
      console.error("[RoleAccess] load failed", error);
    });
  }, [appUser?.uid, appUser?.pharmacyId, branches]);

  useEffect(() => {
    if (!appUser) return;
    const savedPage = sessionStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) as Page | null;
    if (!savedPage) return;
    const page = savedPage === "hr" ? "users" : savedPage;
    if (getAllowedPages(appUser).includes(page)) {
      setActivePage(page);
    }
  }, [appUser?.uid, setActivePage]);

  useEffect(() => {
    if (!appUser) return;
    sessionStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
  }, [activePage, appUser]);

  useEffect(() => {
    if (!appUser || branches.length === 0) return;
    const canSwitch = canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length);
    if (!canSwitch) {
      if (
        isAllBranchesMode(activeBranchId) ||
        (activeBranchId && activeBranchId !== appUser.pharmacyId)
      ) {
        setActiveBranchId(appUser.pharmacyId);
      }
      return;
    }
    const validIds = new Set(branches.map((branch) => branch.id));
    if (isAllBranchesMode(activeBranchId)) {
      if (branches.length <= 1) {
        setActiveBranchId(appUser.pharmacyId);
      }
      return;
    }
    if (activeBranchId && !validIds.has(activeBranchId)) {
      setActiveBranchId(appUser.pharmacyId);
    }
  }, [branches, appUser, activeBranchId, orgSubscriptionTier]);

  return {
    user,
    appUser,
    userLoading,
    loginScreenStatus,
    loginFormProps,
    handleLogout,
    branches,
    setBranches,
    activeBranchId,
    setActiveBranchId,
    getPharmacyId,
  };
}

export type AppAuthSliceReturn = ReturnType<typeof useAppAuthSlice>;
