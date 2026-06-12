import { getBranchLabel } from "./branchLabel";
import type { Employee, PharmacySettings } from "../types";

export type BranchHrSummaryRow = {
  branchId: string;
  branchLabel: string;
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
};

export function buildBranchHrSummaryRows(params: {
  employees: Employee[];
  branches: PharmacySettings[];
  isArabic: boolean;
}): BranchHrSummaryRow[] {
  const branchIds =
    params.branches.length > 0
      ? params.branches.map((branch) => branch.id)
      : [...new Set(params.employees.map((employee) => employee.pharmacyId).filter(Boolean))];

  return branchIds
    .map((branchId) => {
      const branchEmployees = params.employees.filter(
        (employee) => employee.pharmacyId === branchId,
      );
      const activeEmployees = branchEmployees.filter((employee) => employee.isActive).length;
      return {
        branchId,
        branchLabel: getBranchLabel(branchId, params.branches, params.isArabic),
        totalEmployees: branchEmployees.length,
        activeEmployees,
        inactiveEmployees: branchEmployees.length - activeEmployees,
      };
    })
    .sort(
      (a, b) => b.totalEmployees - a.totalEmployees || a.branchLabel.localeCompare(b.branchLabel),
    );
}
