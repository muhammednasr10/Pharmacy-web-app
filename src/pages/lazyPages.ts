import { lazy } from "react";

export const DashboardPage = lazy(() => import("./DashboardPage"));
export const InventoryPage = lazy(() => import("./InventoryManagementPage"));
export const PosPage = lazy(() => import("./PosPage"));
export const InvoicesPage = lazy(() => import("./InvoicesPage"));
export const ReturnsPage = lazy(() => import("./ReturnsPage"));
export const ReportsPage = lazy(() => import("./ReportsPage"));
export const SettingsPage = lazy(() => import("./SettingsPage"));
export const EmployeesUsersPage = lazy(() => import("./EmployeesUsersPage"));
export const SuperAdminPage = lazy(() => import("./SuperAdminPage"));
export const PurchasesPage = lazy(() => import("./PurchasesPage"));
export const ActivityLogsPage = lazy(() => import("./ActivityLogsPage"));
export const BranchesPage = lazy(() => import("./BranchesPage"));
export const CustomersPage = lazy(() => import("./CustomersPage"));
export const EmployeePortalPage = lazy(() => import("./EmployeePortalPage"));
export const SqlMigrationsPage = lazy(() => import("./SqlMigrationsPage"));
export const UserGuidePage = lazy(() => import("./UserGuidePage"));

export type { SettingsTab } from "./SettingsPage";
