import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import type { HrPageProps, HrTab } from "../types";

export type HrSharedContext = {
  isArabic: boolean;
  appUser: HrPageProps["appUser"];
  pharmacyId: string;
  pharmacyName?: string;
  currency: string;
  hasRole: HrPageProps["hasRole"];
  embedded: boolean;
  showOrgHr: boolean;
  orgBranchIds: string[];
  orgBranches: HrPageProps["orgBranches"];
  resolveBranchLabel?: HrPageProps["resolveBranchLabel"];
  hrManagePharmacyId?: string;
  orgHrReadOnly: boolean;
  internalTab: HrTab;
  setInternalTab: (tab: HrTab) => void;
  activeTab: HrTab;
  canManage: boolean;
  canEditAttendanceLog: boolean;
  canManageHrFor: (branchId?: string) => boolean;
  todayIso: string;
  payrollConfig: pharmacyService.PayrollSettingsValues;
  setPayrollConfig: React.Dispatch<React.SetStateAction<pharmacyService.PayrollSettingsValues>>;
  payrollConfigRef: React.MutableRefObject<pharmacyService.PayrollSettingsValues>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  busyAction: string;
  setBusyAction: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
};

export function useHrSharedContext({
  isArabic,
  appUser,
  pharmacyId,
  pharmacyName,
  currency,
  hasRole,
  embedded = false,
  activeTab: controlledTab,
  showOrgHr = false,
  orgBranchIds = [],
  orgBranches = [],
  resolveBranchLabel,
  hrManagePharmacyId,
  orgHrReadOnly = false,
}: HrPageProps): HrSharedContext {
  const [internalTab, setInternalTab] = useState<HrTab>("attendance");
  const activeTab = embedded && controlledTab ? controlledTab : internalTab;

  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const [payrollConfig, setPayrollConfig] = useState<pharmacyService.PayrollSettingsValues>(() => ({
    ...pharmacyService.PAYROLL_DEFAULTS,
    workShifts: pharmacyService.PAYROLL_DEFAULTS.workShifts.map((item) => ({
      ...item,
      breaks: item.breaks.map((br) => ({ ...br })),
    })),
    workBreaks: [],
  }));
  const payrollConfigRef = useRef(payrollConfig);
  payrollConfigRef.current = payrollConfig;

  const canManage = hasRole(["pharmacy_admin", "branch_manager", "super_admin", "accountant"]);
  const canEditAttendanceLog = hasRole(["pharmacy_admin", "branch_manager", "super_admin"]);
  const hrWriteScopeId = hrManagePharmacyId?.trim() || "";

  const canManageHrFor = useCallback(
    (branchId?: string) => {
      if (!canManage) return false;
      if (!hrWriteScopeId) return true;
      return Boolean(branchId && branchId === hrWriteScopeId);
    },
    [canManage, hrWriteScopeId],
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!pharmacyId) return;
    void pharmacyService.loadPayrollSettings(pharmacyId).then(setPayrollConfig);
  }, [pharmacyId, activeTab]);

  return {
    isArabic,
    appUser,
    pharmacyId,
    pharmacyName,
    currency,
    hasRole,
    embedded,
    showOrgHr,
    orgBranchIds,
    orgBranches,
    resolveBranchLabel,
    hrManagePharmacyId,
    orgHrReadOnly,
    internalTab,
    setInternalTab,
    activeTab,
    canManage,
    canEditAttendanceLog,
    canManageHrFor,
    todayIso,
    payrollConfig,
    setPayrollConfig,
    payrollConfigRef,
    loading,
    setLoading,
    busyAction,
    setBusyAction,
    error,
    setError,
  };
}
