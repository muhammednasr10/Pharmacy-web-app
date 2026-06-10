import { getBranchLabel } from "./branchLabel";
import type { PharmacyLoginAccount, PharmacySettings } from "../types";

export type BranchLoginSummaryRow = {
  branchId: string;
  branchLabel: string;
  approvedAccounts: number;
  pendingAccounts: number;
  totalSlots: number;
};

export function buildBranchLoginSummaryRows(params: {
  accounts: PharmacyLoginAccount[];
  branches: PharmacySettings[];
  roleSlotCount: number;
  isArabic: boolean;
}): BranchLoginSummaryRow[] {
  const branchIds =
    params.branches.length > 0
      ? params.branches.map((branch) => branch.id)
      : [...new Set(params.accounts.map((account) => account.pharmacyId).filter(Boolean))];

  return branchIds
    .map((branchId) => {
      const branchAccounts = params.accounts.filter((account) => account.pharmacyId === branchId);
      const approvedAccounts = branchAccounts.filter((account) => account.status === "approved").length;
      const pendingAccounts = branchAccounts.filter(
        (account) =>
          account.status === "pending" || account.editPending || account.linkRequestPending
      ).length;

      return {
        branchId,
        branchLabel: getBranchLabel(branchId, params.branches, params.isArabic),
        approvedAccounts,
        pendingAccounts,
        totalSlots: params.roleSlotCount,
      };
    })
    .sort(
      (a, b) =>
        b.pendingAccounts - a.pendingAccounts ||
        b.approvedAccounts - a.approvedAccounts ||
        a.branchLabel.localeCompare(b.branchLabel)
    );
}
