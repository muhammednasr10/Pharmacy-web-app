import { Suspense } from "react";
import PageLoadingCard from "./PageLoadingCard";
import { isSubscriptionWriteBlocked } from "../utils/subscriptionAccess";
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
  const subscriptionBlocksWrite = isSubscriptionWriteBlocked(
    props.appUser,
    props.isSubscriptionExpired,
  );

  return (
    <Suspense fallback={<PageLoadingCard isArabic={props.isArabic} />}>
      <AppDashboardRoute {...props} />
      <AppInventoryRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppPurchasesRoute {...props} />
      <AppCostsRoute {...props} />
      <AppPosRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppInvoicesRoute {...props} />
      <AppReturnsRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppCustomersRoute {...props} />
      <AppActivityLogsRoute {...props} />
      <AppReportsRoute {...props} />
      <AppEmployeesRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppEmployeePortalRoute {...props} />
      <AppSuperAdminRoute {...props} />
      <AppSqlMigrationsRoute {...props} />
      <AppBranchesRoute {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />
      <AppUserGuideRoute {...props} />
      <AppSettingsRoute {...props} />
    </Suspense>
  );
}
