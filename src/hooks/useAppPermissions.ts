import { useCallback } from "react";
import type { AppUser, Page, UserRole } from "../types";
import {
  canDeleteMedicines,
  canDeletePurchases,
  canDeleteReturns,
  canViewOrgActivityLogs,
  getAllowedPages,
  hasRole as checkUserRole,
} from "../utils/roles";

export function useAppPermissions(appUser: AppUser | null, isSubscriptionExpired: boolean) {
  const hasRole = useCallback((roles: UserRole[]) => checkUserRole(appUser, roles), [appUser]);

  const canUseSystemActions = useCallback(() => !isSubscriptionExpired, [isSubscriptionExpired]);

  const canManageInventory = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory"]),
    [hasRole],
  );

  const canUsePurchases = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory"]),
    [hasRole],
  );

  const canManageCosts = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "accountant"]),
    [hasRole],
  );

  const canViewReports = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "accountant"]),
    [hasRole],
  );

  const canViewStockMovements = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory", "accountant"]),
    [hasRole],
  );

  const canViewActivityLogs = useCallback(() => canViewOrgActivityLogs(appUser), [appUser]);

  const canManageUsers = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin"]),
    [hasRole],
  );

  const canDeleteMedicine = useCallback(() => canDeleteMedicines(appUser), [appUser]);

  const canViewInvoices = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier", "accountant"]),
    [hasRole],
  );

  const canViewCustomers = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier", "accountant"]),
    [hasRole],
  );

  const canUsePOS = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier"]),
    [hasRole],
  );

  const canUseReturns = useCallback(
    () => hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier"]),
    [hasRole],
  );

  const canDeleteReturn = useCallback(() => canDeleteReturns(appUser), [appUser]);

  const canDeletePurchase = useCallback(() => canDeletePurchases(appUser), [appUser]);

  const canOpenPage = useCallback(
    (page: Page) => {
      if (!appUser) return false;
      return getAllowedPages(appUser).includes(page);
    },
    [appUser],
  );

  return {
    hasRole,
    canUseSystemActions,
    canManageInventory,
    canUsePurchases,
    canManageCosts,
    canViewReports,
    canViewStockMovements,
    canViewActivityLogs,
    canManageUsers,
    canDeleteMedicine,
    canViewInvoices,
    canViewCustomers,
    canUsePOS,
    canUseReturns,
    canDeleteReturn,
    canDeletePurchase,
    canOpenPage,
  };
}
