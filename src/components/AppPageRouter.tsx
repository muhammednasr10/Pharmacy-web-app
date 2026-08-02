import { Suspense } from "react";
import PageLoadingCard from "./PageLoadingCard";
import { isSuperAdmin } from "../utils/roles";
import type { AppPageRouterProps } from "./app-router/types";
import AppActivityLogsRoute from "./app-router/AppActivityLogsRoute";
import AppBranchesRoute from "./app-router/AppBranchesRoute";
import AppCostsRoute from "./app-router/AppCostsRoute";
import AppCustomersRoute from "./app-router/AppCustomersRoute";
import AppDashboardRoute from "./app-router/AppDashboardRoute";
import AppEmployeePortalRoute from "./app-router/AppEmployeePortalRoute";
import AppEmployeesRoute from "./app-router/AppEmployeesRoute";
import AppInventoryRoute from "./app-router/AppInventoryRoute";
import AppInvoicesRoute from "./app-router/AppInvoicesRoute";
import AppPosRoute from "./app-router/AppPosRoute";
import AppPurchasesRoute from "./app-router/AppPurchasesRoute";
import AppReportsRoute from "./app-router/AppReportsRoute";
import AppReturnsRoute from "./app-router/AppReturnsRoute";
import AppSettingsRoute from "./app-router/AppSettingsRoute";
import AppSqlMigrationsRoute from "./app-router/AppSqlMigrationsRoute";
import AppSuperAdminRoute from "./app-router/AppSuperAdminRoute";
import AppUserGuideRoute from "./app-router/AppUserGuideRoute";

export type { AppPageRouterProps } from "./app-router/types";

export default function AppPageRouter(props: AppPageRouterProps) {
  const subscriptionBlocksWrite = props.isSubscriptionExpired && !isSuperAdmin(props.appUser);

  return (
    <Suspense fallback={<PageLoadingCard isArabic={props.isArabic} />}>
      <AppDashboardRoute {...props} />
      <AppInventoryRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppPurchasesRoute {...props} />
      <AppCostsRoute {...props} />
      <AppPosRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppInvoicesRoute {...props} />
      <AppReturnsRoute {...props} />
      <AppCustomersRoute {...props} />
      <AppActivityLogsRoute {...props} />
      <AppReportsRoute {...props} />
      <AppEmployeesRoute {...props} />
      <AppEmployeePortalRoute {...props} />
      <AppSuperAdminRoute {...props} />
      <AppSqlMigrationsRoute {...props} />
      <AppBranchesRoute {...props} />
      <AppUserGuideRoute {...props} />
      <AppSettingsRoute {...props} />
    </Suspense>
  );
}
