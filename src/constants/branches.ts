/** Active branch scope: specific pharmacy id, or aggregate all org branches. */
export const ALL_BRANCHES_ID = "__all__";

export function isAllBranchesMode(branchId: string | null | undefined): boolean {
  return branchId === ALL_BRANCHES_ID;
}

export function branchPreferenceStorageKey(uid: string): string {
  return `pharmacy_active_branch:${uid}`;
}
