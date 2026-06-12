import { lazy } from "react";

export const LazyAppPageRouter = lazy(() => import("./AppPageRouter"));
export const LazyAppModals = lazy(() => import("./AppModals"));

export type { AppPageRouterProps } from "./AppPageRouter";
export type { AppModalsProps } from "./AppModals";
