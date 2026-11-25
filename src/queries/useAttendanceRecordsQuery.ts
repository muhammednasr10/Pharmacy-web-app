import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AttendanceRecord } from "../types";
import {
  monthAnchorDate,
  monthBoundsFromDate,
  yearBounds,
} from "../utils/hrFormatters";
import { pharmacyQueryKeys } from "./queryKeys";
import type { AttendancePeriodView } from "../pages/hr/types";

type UseAttendanceRecordsQueryOptions = {
  attendancePeriodView: AttendancePeriodView;
  attendanceMonth: string;
  attendanceYear: string;
  pharmacyId: string;
  showOrgHr: boolean;
  orgBranchIds: string[];
  enabled?: boolean;
};

export function useAttendanceRecordsQuery({
  attendancePeriodView,
  attendanceMonth,
  attendanceYear,
  pharmacyId,
  showOrgHr,
  orgBranchIds,
  enabled = true,
}: UseAttendanceRecordsQueryOptions) {
  const queryClient = useQueryClient();

  const scopeKey = useMemo(() => {
    if (showOrgHr && orgBranchIds.length > 0) return orgBranchIds.join(",");
    return pharmacyId;
  }, [showOrgHr, orgBranchIds, pharmacyId]);

  const periodKey = useMemo(() => {
    if (attendancePeriodView === "yearly") return `year:${attendanceYear}`;
    return `month:${attendanceMonth}`;
  }, [attendancePeriodView, attendanceMonth, attendanceYear]);

  const queryKey = pharmacyQueryKeys.attendance(periodKey, scopeKey);

  const query = useQuery({
    queryKey,
    enabled: enabled && Boolean(scopeKey),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const range =
        attendancePeriodView === "yearly"
          ? yearBounds(attendanceYear)
          : monthBoundsFromDate(monthAnchorDate(attendanceMonth));
      const scopeIds = showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : undefined;
      return pharmacyService.getAttendanceRecords(range.start, range.end, scopeIds);
    },
  });

  const loadAttendance = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey });
  }, [queryClient, queryKey]);

  const invalidateAttendance = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...pharmacyQueryKeys.all, "attendance"],
    });
  }, [queryClient]);

  return {
    attendanceRecords: query.data ?? [],
    loadAttendance,
    invalidateAttendance,
    isAttendanceLoading: query.isLoading,
    isAttendanceFetching: query.isFetching,
    attendanceError: query.error,
  };
}
