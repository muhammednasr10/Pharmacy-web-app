import { useCallback } from "react";
import type { EmployeeRequest } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { monthAnchorDate, monthBoundsFromDate } from "../../../utils/hrFormatters";
import type { HrSharedContext } from "./shared";

type RequestsParams = Pick<
  HrSharedContext,
  "isArabic" | "appUser" | "canManageHrFor" | "activeTab" | "setBusyAction"
> & {
  attendanceMonth: string;
  showOrgHr: boolean;
  orgBranchIds: string[];
  loadAttendanceRef: React.RefObject<(() => Promise<void>) | null>;
  employeeRequests: EmployeeRequest[];
  setEmployeeRequests: React.Dispatch<React.SetStateAction<EmployeeRequest[]>>;
};

export function useHrRequestsState({
  isArabic,
  appUser,
  canManageHrFor,
  activeTab,
  setBusyAction,
  attendanceMonth,
  showOrgHr,
  orgBranchIds,
  loadAttendanceRef,
  employeeRequests,
  setEmployeeRequests,
}: RequestsParams) {
  const loadEmployeeRequests = useCallback(async () => {
    try {
      const scopeIds = showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : undefined;
      const pending = await pharmacyService.getEmployeeRequests({
        status: "pending",
        pharmacyIds: scopeIds,
      });
      const { start, end } = monthBoundsFromDate(monthAnchorDate(attendanceMonth));
      const monthRows = await pharmacyService.getEmployeeRequests({
        fromDate: start,
        toDate: end,
        pharmacyIds: scopeIds,
      });
      const byId = new Map<number, EmployeeRequest>();
      for (const row of [...pending, ...monthRows]) {
        byId.set(row.id, row);
      }
      setEmployeeRequests(
        [...byId.values()].sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        ),
      );
    } catch {
      setEmployeeRequests([]);
    }
  }, [attendanceMonth, showOrgHr, orgBranchIds, setEmployeeRequests]);

  async function reviewRequest(
    request: EmployeeRequest,
    status: "approved" | "rejected",
    reviewNote = "",
  ) {
    if (!appUser || !canManageHrFor(request.pharmacyId)) return;
    setBusyAction(`request-${request.id}`);
    try {
      await pharmacyService.reviewEmployeeRequest(
        request.id,
        status,
        { uid: appUser.uid, name: appUser.name || appUser.email || appUser.uid },
        reviewNote,
      );
      await loadEmployeeRequests();
      if (activeTab === "attendance") {
        await loadAttendanceRef.current?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const friendly: Record<string, [string, string]> = {
        request_not_found: ["الطلب غير موجود أو لا تملك صلاحية عليه", "Request not found or not accessible"],
        request_already_reviewed: ["تمت مراجعة هذا الطلب مسبقاً", "This request was already reviewed"],
      };
      const pair = friendly[msg];
      alert(pair ? (isArabic ? pair[0] : pair[1]) : msg || (isArabic ? "تعذر مراجعة الطلب" : "Review failed"));
    } finally {
      setBusyAction("");
    }
  }

  return {
    employeeRequests,
    setEmployeeRequests,
    loadEmployeeRequests,
    reviewRequest,
  };
}
