import { useEffect, useMemo, useState } from "react";
import type { AppUser, PharmacySettings } from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";
import BranchScopeSelect from "../BranchScopeSelect";
import { resolveBranchDisplay } from "../../utils/branchDisplay";
import {
  getOrganizationBranchUsage,
  resolveOrganizationId,
  resolveOrganizationPrimaryPharmacy,
} from "../../utils/branchLimits";
import {
  canManageOrgBranchesWithTier,
  canSwitchBranchesWithTier,
} from "../../utils/subscriptionFeatures";
import { useSubscriptionOptional } from "../../contexts/SubscriptionContext";
import InventoryAddWarehouseModal from "./InventoryAddWarehouseModal";

type InventoryWarehouseBarProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  branches: PharmacySettings[];
  activeBranchId: string | null;
  pharmacyId: string;
  orgSubscriptionTier: SubscriptionTier;
  onSwitchBranch: (branchId: string) => void;
  onBranchesUpdated?: () => void | Promise<void>;
  onOpenBranchData?: () => void;
};

export default function InventoryWarehouseBar({
  isArabic,
  appUser,
  branches,
  activeBranchId,
  pharmacyId,
  orgSubscriptionTier,
  onSwitchBranch,
  onBranchesUpdated,
  onOpenBranchData,
}: InventoryWarehouseBarProps) {
  const subscription = useSubscriptionOptional();
  const [showAddModal, setShowAddModal] = useState(false);

  const anchorPharmacy = useMemo(() => {
    return (
      branches.find((branch) => branch.id === pharmacyId) ||
      branches.find((branch) => branch.id === activeBranchId) ||
      branches[0] ||
      null
    );
  }, [branches, pharmacyId, activeBranchId]);

  const organizationId = anchorPharmacy ? resolveOrganizationId(anchorPharmacy) : "";
  const orgBranches = useMemo(
    () => branches.filter((branch) => resolveOrganizationId(branch) === organizationId),
    [branches, organizationId],
  );

  const usage = useMemo(() => {
    if (!anchorPharmacy) {
      return { used: orgBranches.length, max: 1, canAdd: false };
    }
    return getOrganizationBranchUsage(branches, anchorPharmacy);
  }, [anchorPharmacy, branches, orgBranches.length]);

  const primaryBranch = useMemo(() => {
    if (!organizationId) return orgBranches[0] || null;
    return resolveOrganizationPrimaryPharmacy(orgBranches, organizationId);
  }, [organizationId, orgBranches]);

  const canSwitch = canSwitchBranchesWithTier(appUser, orgSubscriptionTier, orgBranches.length);
  const canManageBranches = canManageOrgBranchesWithTier(appUser, orgSubscriptionTier);
  const showBranchSwitcher = usage.max > 1 && orgBranches.length > 1 && canSwitch;
  const pinnedSingleStore = usage.max <= 1 || orgBranches.length <= 1;

  const activeScopeId =
    activeBranchId && orgBranches.some((branch) => branch.id === activeBranchId)
      ? activeBranchId
      : primaryBranch?.id || pharmacyId;

  const activeDisplay = resolveBranchDisplay(activeScopeId, orgBranches, isArabic);

  useEffect(() => {
    if (!pinnedSingleStore || !primaryBranch?.id) return;
    if (activeScopeId !== primaryBranch.id) {
      onSwitchBranch(primaryBranch.id);
    }
  }, [pinnedSingleStore, primaryBranch?.id, activeScopeId, onSwitchBranch]);

  const handleAddClick = () => {
    if (!canManageBranches) {
      subscription?.openUpgradeModal({ type: "feature", key: "branchesPage" });
      return;
    }
    if (!usage.canAdd) {
      subscription?.openUpgradeModal({ type: "branch_limit" });
      return;
    }
    setShowAddModal(true);
  };

  return (
    <>
      <div className="invMgmtWarehouseBar">
        <div className="invMgmtWarehouseMeta">
          <span className="invMgmtWarehouseEyebrow">
            {isArabic ? "المخزن النشط" : "Active warehouse"}
          </span>
          {pinnedSingleStore ? (
            <div className="invMgmtWarehousePinned">
              <span className="invMgmtWarehousePinnedIcon" aria-hidden="true">
                🏬
              </span>
              <div>
                <span className="mutedText">
                  {isArabic ? "مخزن الفرع الحالي" : "Current branch warehouse"}
                </span>
                <strong>{activeDisplay.combinedLabel}</strong>
                {usage.max <= 1 ? (
                  <p className="mutedText">
                    {isArabic
                      ? "باقتك تسمح بفرع واحد — حد الفروع من صفحة الفروع"
                      : "Your plan allows one branch — branch limits are on the Branches page"}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="invMgmtWarehouseSwitch">
              <label className="invMgmtWarehouseLabel" htmlFor="inv-warehouse-select">
                {isArabic ? "مخزن الفرع الحالي" : "Current branch warehouse"}
              </label>
              <BranchScopeSelect
                id="inv-warehouse-select"
                pharmacies={orgBranches}
                value={activeScopeId}
                isArabic={isArabic}
                className="invMgmtWarehouseSelect"
                aria-label={isArabic ? "التبديل بين مخازن الفروع" : "Switch branch warehouse"}
                onChange={(branchId) => onSwitchBranch(branchId)}
              />
              <p className="mutedText invMgmtWarehouseUsage">
                {isArabic
                  ? `الفروع المستخدمة: ${usage.used} من ${usage.max}`
                  : `Branches in use: ${usage.used} of ${usage.max}`}
              </p>
            </div>
          )}
        </div>

        <div className="invMgmtWarehouseActions">
          {canManageBranches ? (
            <button type="button" className="editBtn" onClick={onOpenBranchData}>
              {isArabic ? "بيانات الفروع" : "Branch data"}
            </button>
          ) : usage.max > 1 ? (
            <button
              type="button"
              className="invMgmtWarehouseLockedBtn"
              onClick={() =>
                subscription?.openUpgradeModal({ type: "feature", key: "branchesPage" })
              }
            >
              <span aria-hidden="true">🔒</span>
              {isArabic ? "بيانات الفروع (ترقية)" : "Branch data (upgrade)"}
            </button>
          ) : null}

          {showBranchSwitcher && canManageBranches && usage.canAdd ? (
            <button type="button" className="addMedicineBtn" onClick={handleAddClick}>
              {isArabic ? "+ إضافة مخزن جديد" : "+ Add warehouse"}
            </button>
          ) : canManageBranches && !usage.canAdd ? (
            <button
              type="button"
              className="invMgmtWarehouseLockedBtn"
              onClick={handleAddClick}
              title={
                isArabic
                  ? "وصلت لحد المخازن — ترقية الباقة"
                  : "Warehouse limit reached — upgrade plan"
              }
            >
              <span aria-hidden="true">🔒</span>
              {isArabic ? "إضافة مخزن (ترقية)" : "Add warehouse (upgrade)"}
            </button>
          ) : null}
        </div>
      </div>

      {showAddModal && anchorPharmacy ? (
        <InventoryAddWarehouseModal
          isArabic={isArabic}
          anchorPharmacyId={anchorPharmacy.id}
          copyFromBranchId={primaryBranch?.id || anchorPharmacy.id}
          orgBranches={orgBranches}
          onClose={() => setShowAddModal(false)}
          onCreated={async (branchId) => {
            setShowAddModal(false);
            await onBranchesUpdated?.();
            onSwitchBranch(branchId);
          }}
        />
      ) : null}
    </>
  );
}
