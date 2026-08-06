import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AttendanceRecord } from "../types";
import { monthAnchorDate, monthBoundsFromDate } from "../utils/hrFormatters";
import { pharmacyQueryKeys } from "./queryKeys";

type UseAttendanceRecordsQueryOptions = {
  attendanceMonth: string;
  pharmacyId: string;
  showOrgHr: boolean;
  orgBranchIds: string[];
  enabled?: boolean;
  onBeforeFetch?: () => Promise<void>;
};

export function useAttendanceRecordsQuery({
  attendanceMonth,
  pharmacyId,
  showOrgHr,
  orgBranchIds,
  enabled = true,
  onBeforeFetch,
}: UseAttendanceRecordsQueryOptions) {
  const queryClient = useQueryClient();

  const scopeKey = useMemo(() => {
    if (showOrgHr && orgBranchIds.length > 0) return orgBranchIds.join(",");
    return pharmacyId;
  }, [showOrgHr, orgBranchIds, pharmacyId]);

  const queryKey = pharmacyQueryKeys.attendance(attendanceMonth, scopeKey);

  const query = useQuery({
    queryKey,
    enabled: enabled && Boolean(scopeKey),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      if (onBeforeFetch) await onBeforeFetch();
      const { start, end } = monthBoundsFromDate(monthAnchorDate(attendanceMonth));
      const scopeIds = showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : undefined;
      return pharmacyService.getAttendanceRecords(start, end, scopeIds);
    },
    placeholderData: [] as AttendanceRecord[],
  });

  const loadAttendance = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const invalidateAttendance = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    attendanceRecords: query.data ?? [],
    loadAttendance,
    invalidateAttendance,
    isAttendanceLoading: query.isLoading,
    isAttendanceFetching: query.isFetching,
    attendanceError: query.error,
  };
}
