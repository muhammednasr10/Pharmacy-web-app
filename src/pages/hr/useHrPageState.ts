import { useEffect, useRef, useState } from "react";
import type { EmployeeRequest } from "../../types";
import { HR_TABS } from "./helpers";
import type { HrPageProps } from "./types";
import { useHrSharedContext } from "./state/shared";
import { useHrStaffState } from "./state/useHrStaffState";
import { useHrAttendanceState } from "./state/useHrAttendanceState";
import { useHrPayrollState } from "./state/useHrPayrollState";
import { useHrRequestsState } from "./state/useHrRequestsState";

export function useHrPageState(props: HrPageProps) {
  const shared = useHrSharedContext(props);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const loadAttendanceRef = useRef<(() => Promise<void>) | null>(null);

  const staff = useHrStaffState({
    pharmacyId: shared.pharmacyId,
    showOrgHr: shared.showOrgHr,
    orgBranchIds: shared.orgBranchIds,
    payrollConfigRef: shared.payrollConfigRef,
  });

  const attendance = useHrAttendanceState({
    isArabic: shared.isArabic,
    pharmacyId: shared.pharmacyId,
    showOrgHr: shared.showOrgHr,
    orgBranchIds: shared.orgBranchIds,
    canManage: shared.canManage,
    canEditAttendanceLog: shared.canEditAttendanceLog,
    canManageHrFor: shared.canManageHrFor,
    todayIso: shared.todayIso,
    payrollConfig: shared.payrollConfig,
    setLoading: shared.setLoading,
    setError: shared.setError,
    setBusyAction: shared.setBusyAction,
    staffRows: staff.staffRows,
    loadStaff: staff.loadStaff,
    activeEmployees: staff.activeEmployees,
    employeeRequests,
  });

  loadAttendanceRef.current = attendance.loadAttendance;

  const requests = useHrRequestsState({
    isArabic: shared.isArabic,
    appUser: shared.appUser,
    canManageHrFor: shared.canManageHrFor,
    activeTab: shared.activeTab,
    setBusyAction: shared.setBusyAction,
    attendanceMonth: attendance.attendanceMonth,
    showOrgHr: shared.showOrgHr,
    orgBranchIds: shared.orgBranchIds,
    loadAttendanceRef,
    employeeRequests,
    setEmployeeRequests,
  });

  const payroll = useHrPayrollState({
    isArabic: shared.isArabic,
    pharmacyId: shared.pharmacyId,
    pharmacyName: shared.pharmacyName,
    currency: shared.currency,
    showOrgHr: shared.showOrgHr,
    orgBranchIds: shared.orgBranchIds,
    resolveBranchLabel: shared.resolveBranchLabel,
    canManageHrFor: shared.canManageHrFor,
    payrollConfig: shared.payrollConfig,
    payrollConfigRef: shared.payrollConfigRef,
    setLoading: shared.setLoading,
    setError: shared.setError,
    setBusyAction: shared.setBusyAction,
    staffRows: staff.staffRows,
    loadStaff: staff.loadStaff,
    activeEmployees: staff.activeEmployees,
    staffByAttendanceKey: staff.staffByAttendanceKey,
    staffBranchByKey: staff.staffBranchByKey,
  });

  useEffect(() => {
    if (shared.activeTab === "attendance") {
      void staff.loadStaff();
      void attendance.loadAttendance();
      void requests.loadEmployeeRequests();
    } else if (shared.activeTab === "requests") {
      void requests.loadEmployeeRequests();
    } else {
      void payroll.loadPayroll();
    }
  }, [
    shared.activeTab,
    staff.loadStaff,
    attendance.loadAttendance,
    payroll.loadPayroll,
    requests.loadEmployeeRequests,
  ]);

  const employeeRequestColSpan =
    5 + (attendance.showBranchColumn ? 1 : 0) + (shared.canManage ? 1 : 0);

  return {
    isArabic: shared.isArabic,
    appUser: shared.appUser,
    pharmacyId: shared.pharmacyId,
    pharmacyName: shared.pharmacyName,
    currency: shared.currency,
    hasRole: shared.hasRole,
    embedded: shared.embedded,
    showOrgHr: shared.showOrgHr,
    orgBranchIds: shared.orgBranchIds,
    orgBranches: shared.orgBranches,
    resolveBranchLabel: shared.resolveBranchLabel,
    hrManagePharmacyId: shared.hrManagePharmacyId,
    orgHrReadOnly: shared.orgHrReadOnly,
    internalTab: shared.internalTab,
    setInternalTab: shared.setInternalTab,
    activeTab: shared.activeTab,
    attendanceMonth: attendance.attendanceMonth,
    setAttendanceMonth: attendance.setAttendanceMonth,
    attendanceEmployeeFilter: attendance.attendanceEmployeeFilter,
    setAttendanceEmployeeFilter: attendance.setAttendanceEmployeeFilter,
    attendanceBranchFilter: attendance.attendanceBranchFilter,
    setAttendanceBranchFilter: attendance.setAttendanceBranchFilter,
    attendanceRecords: attendance.attendanceRecords,
    employeeRequests,
    payrollRecords: payroll.payrollRecords,
    staffRows: staff.staffRows,
    loading: shared.loading,
    busyAction: shared.busyAction,
    error: shared.error,
    attendanceLogEdit: attendance.attendanceLogEdit,
    setAttendanceLogEdit: attendance.setAttendanceLogEdit,
    additionsModal: payroll.additionsModal,
    setAdditionsModal: payroll.setAdditionsModal,
    deductionsModal: payroll.deductionsModal,
    setDeductionsModal: payroll.setDeductionsModal,
    attendanceScanMode: attendance.attendanceScanMode,
    setAttendanceScanMode: attendance.setAttendanceScanMode,
    attendanceScanFeedback: attendance.attendanceScanFeedback,
    setAttendanceScanFeedback: attendance.setAttendanceScanFeedback,
    periodStart: payroll.periodStart,
    setPeriodStart: payroll.setPeriodStart,
    periodEnd: payroll.periodEnd,
    setPeriodEnd: payroll.setPeriodEnd,
    payrollConfig: shared.payrollConfig,
    canManage: shared.canManage,
    canEditAttendanceLog: shared.canEditAttendanceLog,
    canManageHrFor: shared.canManageHrFor,
    activeEmployees: staff.activeEmployees,
    loadPayroll: payroll.loadPayroll,
    handleCheckIn: attendance.handleCheckIn,
    handleCheckOut: attendance.handleCheckOut,
    handleSetStatus: attendance.handleSetStatus,
    handleAttendanceBarcodeScan: attendance.handleAttendanceBarcodeScan,
    editBaseSalary: payroll.editBaseSalary,
    openAdditionsModal: payroll.openAdditionsModal,
    savePayrollAdditions: payroll.savePayrollAdditions,
    openDeductionsModal: payroll.openDeductionsModal,
    beginAttendanceLogEdit: attendance.beginAttendanceLogEdit,
    updateActualShiftOnly: attendance.updateActualShiftOnly,
    setEarlyLeaveOutcome: attendance.setEarlyLeaveOutcome,
    saveAttendanceLogEdit: attendance.saveAttendanceLogEdit,
    attendanceHoursSummary: attendance.attendanceHoursSummary,
    showEmployeeColumn: attendance.showEmployeeColumn,
    showBranchColumn: attendance.showBranchColumn,
    showAttendanceActions: attendance.showAttendanceActions,
    employeeRequestColSpan,
    attendanceTableColSpan: attendance.attendanceTableColSpan,
    tabs: HR_TABS,
    payrollRows: payroll.payrollRows,
    totalNetPay: payroll.totalNetPay,
    handleExportPayrollPdf: payroll.handleExportPayrollPdf,
    reviewRequest: requests.reviewRequest,
    todayIso: shared.todayIso,
    filteredAttendanceEmployees: attendance.filteredAttendanceEmployees,
    attendanceEmployeeSearch: attendance.attendanceEmployeeSearch,
    setAttendanceEmployeeSearch: attendance.setAttendanceEmployeeSearch,
    attendanceTableRows: attendance.attendanceTableRows,
    showAttendanceScanner: attendance.showAttendanceScanner,
    isAttendanceLoading: attendance.isAttendanceLoading,
    isAttendanceFetching: attendance.isAttendanceFetching,
    payrollBranchId: payroll.payrollBranchId,
  };
}

export type HrPageState = ReturnType<typeof useHrPageState>;
