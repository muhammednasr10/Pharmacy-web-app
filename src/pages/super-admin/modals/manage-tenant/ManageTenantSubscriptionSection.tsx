import { computeTrialEndDate } from "../../../../config/subscription";
import {
  getSubscriptionTierLabel,
  subscriptionTierOrder,
  subscriptionTiers,
  type SubscriptionTier,
} from "../../../../config/subscriptionTiers";
import { resolveBranchDisplay } from "../../../../utils/branchLabel";
import { formatDateInput } from "../../../../utils/date";
import { formatWarehouseQuota } from "../../../../utils/tierPackageCopy";
import {
  formatUsageLabel,
  getTierBadgeClass,
  usagePercent,
} from "../../helpers";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";

type Props = Pick<
  SuperAdminPageState,
  | "isArabic"
  | "selected"
  | "selectedBranchUsage"
  | "selectedUserUsage"
  | "selectedOrgBranches"
  | "selectedTier"
  | "selectedTierCap"
  | "freeTrialDraft"
  | "setFreeTrialDraft"
  | "freeTrialSavingId"
  | "tierSavingId"
  | "setMaxBranchDrafts"
  | "setMaxUserDrafts"
  | "maxBranchSavingId"
  | "maxUserSavingId"
  | "getMaxBranchDraft"
  | "getMaxUserDraft"
  | "handleTierChange"
  | "saveMaxBranches"
  | "saveMaxUsers"
  | "applyTierWarehouseLimit"
  | "saveFreeTrial"
  | "openPackagesTabFromManage"
>;

export default function ManageTenantSubscriptionSection({ state }: { state: Props }) {
  const {
    isArabic,
    selected,
    selectedBranchUsage,
    selectedUserUsage,
    selectedOrgBranches,
    selectedTier,
    selectedTierCap,
    freeTrialDraft,
    setFreeTrialDraft,
    freeTrialSavingId,
    tierSavingId,
    setMaxBranchDrafts,
    setMaxUserDrafts,
    maxBranchSavingId,
    maxUserSavingId,
    getMaxBranchDraft,
    getMaxUserDraft,
    handleTierChange,
    saveMaxBranches,
    saveMaxUsers,
    applyTierWarehouseLimit,
    saveFreeTrial,
    openPackagesTabFromManage,
  } = state;

  if (!selectedBranchUsage || !selectedUserUsage || !selected) return null;

  return (
    <section className="saasManageLimitsCard">
      <div className="saasManageLimitsHead">
        <div>
          <h3>{isArabic ? "الباقة والحدود" : "Package & limits"}</h3>
          <p className="saasManageLimitsHint">
            {isArabic
              ? "حد المخازن يتحكم في عدد المخازن داخل «إدارة المخزن». تغيير الباقة يضبط الحد الافتراضي — أو عدّله يدوياً لهذه الصيدلية."
              : "Warehouse cap controls stores in Inventory Management. Changing the package sets the default — or override it for this pharmacy."}
          </p>
          <button
            type="button"
            className="saasManagePackagesLink"
            onClick={openPackagesTabFromManage}
          >
            {isArabic
              ? "تعديل حدود الباقات الافتراضية ← تبويب الباقات"
              : "Edit default package limits → Packages tab"}
          </button>
        </div>
        <span className={getTierBadgeClass(selectedTier)}>
          {getSubscriptionTierLabel(selectedTier, isArabic)}
        </span>
      </div>

      <div className="saasManageLimitsTiles">
        <div className="saasManageLimitTile">
          <span className="saasManageLimitTileLabel">{isArabic ? "الباقة" : "Package"}</span>
          <select
            className="saasTierSelect saasManageLimitControl"
            value={selectedTier}
            disabled={tierSavingId === selectedBranchUsage.organizationId}
            onChange={(e) => void handleTierChange(selected, e.target.value as SubscriptionTier)}
          >
            {subscriptionTierOrder.map((tierId) => {
              const tier = subscriptionTiers[tierId];
              return (
                <option key={tierId} value={tierId}>
                  {isArabic
                    ? `${tier.labelAr} — ${formatWarehouseQuota(tier.maxBranches, true)}`
                    : `${tier.labelEn} — ${formatWarehouseQuota(tier.maxBranches, false)}`}
                </option>
              );
            })}
          </select>
          <small className="saasTierQuotaHint">
            {isArabic
              ? `حد الباقة الافتراضي: ${formatWarehouseQuota(selectedTierCap.maxBranches, true)}`
              : `Package default: ${formatWarehouseQuota(selectedTierCap.maxBranches, false)}`}
          </small>
        </div>

        <div className="saasManageLimitTile">
          <div className="saasManageLimitTileTop">
            <span className="saasManageLimitTileLabel">
              {isArabic ? "حد المخازن (لهذه الصيدلية)" : "Warehouse limit (this pharmacy)"}
            </span>
            <span className="saasManageUsageChip">
              {formatUsageLabel(
                selectedBranchUsage.used,
                selectedBranchUsage.max,
                "مخزن",
                "warehouses",
                isArabic,
              )}
            </span>
          </div>
          <div className="saasManageUsageBar" aria-hidden>
            <div
              className="saasManageUsageBarFill branches"
              style={{
                width: `${usagePercent(selectedBranchUsage.used, selectedBranchUsage.max)}%`,
              }}
            />
          </div>
          {selectedBranchUsage.max !== selectedTierCap.maxBranches ? (
            <p className="saasManageLimitOverrideNote">
              {isArabic
                ? `الحد الحالي (${selectedBranchUsage.max}) يختلف عن حد الباقة (${selectedTierCap.maxBranches})`
                : `Current cap (${selectedBranchUsage.max}) differs from package default (${selectedTierCap.maxBranches})`}
            </p>
          ) : null}
          <div className="saasBranchLimitEditor">
            <input
              type="number"
              min={selectedBranchUsage.used}
              className="saasBranchLimitInput saasManageLimitControl"
              value={getMaxBranchDraft(
                selectedBranchUsage.organizationId,
                selectedBranchUsage.max,
              )}
              disabled={maxBranchSavingId === selectedBranchUsage.organizationId}
              onChange={(e) =>
                setMaxBranchDrafts((prev) => ({
                  ...prev,
                  [selectedBranchUsage.organizationId]: e.target.value,
                }))
              }
              aria-label={isArabic ? "الحد الأقصى للمخازن" : "Max warehouses"}
            />
            <button
              type="button"
              className="smallBtn"
              disabled={maxBranchSavingId === selectedBranchUsage.organizationId}
              onClick={() =>
                void saveMaxBranches(
                  selectedBranchUsage.organizationId,
                  selectedBranchUsage.used,
                )
              }
            >
              {maxBranchSavingId === selectedBranchUsage.organizationId
                ? "…"
                : isArabic
                  ? "حفظ"
                  : "Save"}
            </button>
            {selectedBranchUsage.max !== selectedTierCap.maxBranches ? (
              <button
                type="button"
                className="smallBtn secondary"
                disabled={maxBranchSavingId === selectedBranchUsage.organizationId}
                onClick={() =>
                  void applyTierWarehouseLimit(
                    selectedBranchUsage.organizationId,
                    selectedBranchUsage.used,
                  )
                }
              >
                {isArabic ? "تطبيق حد الباقة" : "Apply package cap"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="saasManageLimitTile">
          <div className="saasManageLimitTileTop">
            <span className="saasManageLimitTileLabel">
              {isArabic ? "حد المستخدمين" : "User limit"}
            </span>
            <span className="saasManageUsageChip">
              {formatUsageLabel(
                selectedUserUsage.used,
                selectedUserUsage.max,
                "مستخدم",
                "users",
                isArabic,
              )}
            </span>
          </div>
          <div className="saasManageUsageBar" aria-hidden>
            <div
              className="saasManageUsageBarFill users"
              style={{
                width: `${usagePercent(selectedUserUsage.used, selectedUserUsage.max)}%`,
              }}
            />
          </div>
          <div className="saasBranchLimitEditor">
            <input
              type="number"
              min={selectedUserUsage.used}
              className="saasBranchLimitInput saasManageLimitControl"
              value={getMaxUserDraft(selectedUserUsage.organizationId, selectedUserUsage.max)}
              disabled={maxUserSavingId === selectedUserUsage.organizationId}
              onChange={(e) =>
                setMaxUserDrafts((prev) => ({
                  ...prev,
                  [selectedUserUsage.organizationId]: e.target.value,
                }))
              }
              aria-label={isArabic ? "الحد الأقصى للمستخدمين" : "Max users"}
            />
            <button
              type="button"
              className="smallBtn"
              disabled={maxUserSavingId === selectedUserUsage.organizationId}
              onClick={() =>
                void saveMaxUsers(selectedUserUsage.organizationId, selectedUserUsage.used)
              }
            >
              {maxUserSavingId === selectedUserUsage.organizationId
                ? "…"
                : isArabic
                  ? "حفظ"
                  : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="saasManageFreeTrialSection">
        <div className="saasManageFreeTrialHead">
          <div>
            <h4>{isArabic ? "النسخة المجانية" : "Free trial"}</h4>
            <p className="saasManageLimitsHint">
              {isArabic
                ? "فعّل نسخة مجانية للعميل وحدد تاريخ انتهائها — بعد التاريخ لن يتمكن من استخدام النظام حتى الاشتراك"
                : "Enable a free trial and set its end date — after that date the client cannot use the system until they subscribe"}
            </p>
          </div>
          <label className="saasFreeTrialToggle">
            <input
              type="checkbox"
              checked={freeTrialDraft.enabled}
              disabled={freeTrialSavingId === selectedBranchUsage.organizationId}
              onChange={(e) =>
                setFreeTrialDraft((prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                  endDate:
                    prev.endDate ||
                    selected.subscriptionEndDate ||
                    selected.subscriptionEndsAt ||
                    computeTrialEndDate(),
                }))
              }
            />
            <span>{isArabic ? "تفعيل النسخة المجانية" : "Enable free trial"}</span>
          </label>
        </div>
        <div className="saasManageFreeTrialControls">
          <div className="saasManageFreeTrialField">
            <span className="saasManageLimitTileLabel">
              {isArabic ? "تاريخ انتهاء النسخة المجانية" : "Free trial end date"}
            </span>
            <input
              type="date"
              className="saasManageLimitControl"
              dir="ltr"
              min={formatDateInput(new Date())}
              value={freeTrialDraft.endDate}
              disabled={
                !freeTrialDraft.enabled ||
                freeTrialSavingId === selectedBranchUsage.organizationId
              }
              onChange={(e) => setFreeTrialDraft((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="smallBtn"
            disabled={freeTrialSavingId === selectedBranchUsage.organizationId}
            onClick={() => void saveFreeTrial(selectedBranchUsage.organizationId)}
          >
            {freeTrialSavingId === selectedBranchUsage.organizationId
              ? "…"
              : isArabic
                ? "حفظ النسخة المجانية"
                : "Save free trial"}
          </button>
        </div>
      </div>

      {selectedOrgBranches.length > 0 && (
        <div className="saasManageBranchesList">
          <span className="saasManageBranchesListLabel">
            {isArabic ? "المخازن الحالية" : "Current warehouses"}
          </span>
          <div className="saasManageBranchChips">
            {selectedOrgBranches.map((branch) => {
              const display = resolveBranchDisplay(branch.id, selectedOrgBranches, isArabic);
              return (
                <span
                  key={branch.id}
                  className={`saasManageBranchChip${branch.id === selected.id ? " current" : ""}`}
                  title={branch.id}
                >
                  {display.branchName}
                  <code dir="ltr">{branch.id}</code>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
