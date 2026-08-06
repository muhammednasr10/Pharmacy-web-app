import { SqlMigrationsPage } from "../../pages/lazyPages";
import { canAccessSqlMigrationsPage } from "../../utils/roles";
import type { AppPageRouterProps } from "./types";

export type AppSqlMigrationsRouteProps = Pick<
  AppPageRouterProps,
  "canOpenPage" | "isArabic" | "appUser"
>;

export default function AppSqlMigrationsRoute({
  canOpenPage,
  isArabic,
  appUser,
}: AppSqlMigrationsRouteProps) {
  if (
    !canOpenPage("sqlMigrations") ||
    !canAccessSqlMigrationsPage(appUser)
  ) {
    return null;
  }

  return <SqlMigrationsPage isArabic={isArabic} />;
}
