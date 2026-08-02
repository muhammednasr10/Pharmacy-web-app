import { UserGuidePage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppUserGuideRouteProps = Pick<
  AppPageRouterProps,
  "displayPage" | "canOpenPage" | "isArabic"
>;

export default function AppUserGuideRoute({
  displayPage,
  canOpenPage,
  isArabic,
}: AppUserGuideRouteProps) {
  if (displayPage !== "userGuide" || !canOpenPage("userGuide")) return null;

  return <UserGuidePage isArabic={isArabic} />;
}
