import { Navigate, Route, Routes } from "react-router-dom";
import { isSubscriptionWriteBlocked } from "../utils/subscriptionAccess";
import { pageToPath } from "../routes/pageRoutes";
import type { AppPageRouterProps } from "./app-router/types";
import AppActivityLogsRoute from "./app-router/AppActivityLogsRoute";
import AppBranchesRoute from "./app-router/AppBranchesRoute";
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
  const routeProps = { ...props, subscriptionBlocksWrite };

  return (
    <Routes>
      <Route index element={<Navigate to={pageToPath("dashboard")} replace />} />
      <Route path="/dashboard" element={<AppDashboardRoute {...props} />} />
      <Route path="/inventory/movements" element={<AppInventoryRoute {...routeProps} />} />
      <Route path="/inventory" element={<AppInventoryRoute {...routeProps} />} />
      <Route path="/pos" element={<AppPosRoute {...routeProps} />} />
      <Route path="/invoices" element={<AppInvoicesRoute {...props} />} />
      <Route path="/returns" element={<AppReturnsRoute {...routeProps} />} />
      <Route path="/purchases" element={<AppPurchasesRoute {...props} />} />
      <Route path="/customers" element={<AppCustomersRoute {...props} />} />
      <Route path="/reports/investment" element={<AppReportsRoute {...props} />} />
      <Route path="/reports" element={<AppReportsRoute {...props} />} />
      <Route path="/activity-logs" element={<AppActivityLogsRoute {...props} />} />
      <Route path="/staff" element={<AppEmployeesRoute {...routeProps} />} />
      <Route path="/employee-portal" element={<AppEmployeePortalRoute {...props} />} />
      <Route path="/admin/tenants" element={<AppSuperAdminRoute {...props} />} />
      <Route path="/admin/sql" element={<AppSqlMigrationsRoute {...props} />} />
      <Route path="/branches" element={<AppBranchesRoute {...routeProps} />} />
      <Route path="/guide" element={<AppUserGuideRoute {...props} />} />
      <Route path="/settings" element={<AppSettingsRoute {...props} />} />
      <Route
        path="*"
        element={<Navigate to={pageToPath(props.displayPage)} replace />}
      />
    </Routes>
  );
}
