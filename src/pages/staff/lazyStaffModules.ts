import { lazy } from "react";

export const LazyHrPage = lazy(() => import("../HrPage"));
export const LazyWorkScheduleEditor = lazy(() => import("../../components/WorkScheduleEditor"));
export const LazyEmployeeAttendanceBadgeModal = lazy(
  () => import("../../components/EmployeeAttendanceBadgeModal"),
);
