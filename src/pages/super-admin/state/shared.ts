import { useMemo } from "react";
import type { AppUser, PharmacySettings } from "../../../types";
import { parseSubscriptionTier, getSubscriptionTier, type SubscriptionTier } from "../../../config/subscriptionTiers";
import {
  getOrganizationBranchUsage,
  resolveOrganizationId,
} from "../../../utils/branchLimits";
import { getOrganizationUserUsage } from "../../../utils/userLimits";
import { getSubscriptionStatus } from "../../../utils/subscriptionStatus";
import type { SuperAdminPageProps } from "../types";

export type SuperAdminSharedContext = {
  isArabic: boolean;
  operatorUid?: string;
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  selectedPharmacyId: string;
  selected: PharmacySettings | undefined;
  selectedBranchUsage: ReturnType<typeof getOrganizationBranchUsage> | null;
  selectedUserUsage: ReturnType<typeof getOrganizationUserUsage> | null;
  selectedOrgBranches: PharmacySettings[];
  selectedOrgBranchIds: string[];
  selectedTier: SubscriptionTier;
  selectedTierCap: ReturnType<typeof getSubscriptionTier>;
  selectedTrialStatus: ReturnType<typeof getSubscriptionStatus> | null;
};

export function useSuperAdminSharedContext(props: SuperAdminPageProps): SuperAdminSharedContext {
  const { isArabic, operatorUid, pharmacies, systemUsers, selectedPharmacyId } = props;

  const selected = pharmacies.find((p) => p.id === selectedPharmacyId);
  const selectedBranchUsage = selected
    ? getOrganizationBranchUsage(pharmacies, selected)
    : null;
  const selectedUserUsage = selected
    ? getOrganizationUserUsage(systemUsers, pharmacies, selected)
    : null;
  const selectedOrgBranches = useMemo(() => {
    if (!selected) return [];
    const organizationId = resolveOrganizationId(selected);
    return pharmacies.filter((pharmacy) => resolveOrganizationId(pharmacy) === organizationId);
  }, [pharmacies, selected]);
  const selectedOrgBranchIds = useMemo(
    () => selectedOrgBranches.map((branch) => branch.id),
    [selectedOrgBranches],
  );
  const selectedTier = selected
    ? parseSubscriptionTier(selected.subscriptionTier || selected.subscriptionPlan)
    : "basic";
  const selectedTierCap = getSubscriptionTier(selectedTier);
  const selectedTrialStatus = selected ? getSubscriptionStatus(selected) : null;

  return {
    isArabic,
    operatorUid,
    pharmacies,
    systemUsers,
    selectedPharmacyId,
    selected,
    selectedBranchUsage,
    selectedUserUsage,
    selectedOrgBranches,
    selectedOrgBranchIds,
    selectedTier,
    selectedTierCap,
    selectedTrialStatus,
  };
}
