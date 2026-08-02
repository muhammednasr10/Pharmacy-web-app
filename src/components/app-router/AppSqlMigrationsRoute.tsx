import { SqlMigrationsPage } from "../../pages/lazyPages";
import { canAccessSqlMigrationsPage } from "../../utils/roles";
import type { AppPageRouterProps } from "./types";

export type AppSqlMigrationsRouteProps = Pick<
  AppPageRouterProps,
  "displayPage" | "canOpenPage" | "isArabic" | "appUser"
>;

export default function AppSqlMigrationsRoute({
  displayPage,
  canOpenPage,
  isArabic,
  appUser,
}: AppSqlMigrationsRouteProps) {
  if (
    displayPage !== "sqlMigrations" ||
    !canOpenPage("sqlMigrations") ||
    !canAccessSqlMigrationsPage(appUser)
  ) {
    return null;
  }

  return <SqlMigrationsPage isArabic={isArabic} />;
}
