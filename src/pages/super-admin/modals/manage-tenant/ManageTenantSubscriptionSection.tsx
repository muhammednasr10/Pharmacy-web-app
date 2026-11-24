import { useMemo } from "react";
import SubscriptionPagesAccessList from "../../../../components/settings/subscription/SubscriptionPagesAccessList";
import { computeTrialEndDate } from "../../../../config/subscription";
import { resolveBranchDisplay } from "../../../../utils/branchLabel";
import { formatDateInput } from "../../../../utils/date";
import {
  buildSubscriptionPageAccessRows,
  resolvePharmacyAddonFlags,
} from "../../../../utils/subscriptionLimitChange";
import { formatUsageLabel, usagePercent } from "../../helpers";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";

type Props = Pick<
  SuperAdminPageState,
  | "isArabic"
  | "selected"
  | "selectedTier"
  | "selectedBranchUsage"
  | "selectedUserUsage"
  | "selectedOrgBranches"
  | "freeTrialDraft"
  | "setFreeTrialDraft"
  | "freeTrialSavingId"
  | "setMaxBranchDrafts"
  | "setMaxUserDrafts"
  | "maxBranchSavingId"
  | "maxUserSavingId"
  | "getMaxBranchDraft"
  | "getMaxUserDraft"
  | "saveMaxBranches"
  | "saveMaxUsers"
  | "saveFreeTrial"
  | "openPricingTabFromManage"
>;

export default function ManageTenantSubscriptionSection({ state }: { state: Props }) {
  const {
    isArabic,
    selected,
    selectedTier,
    selectedBranchUsage,
    selectedUserUsage,
    selectedOrgBranches,
    freeTrialDraft,
    setFreeTrialDraft,
    freeTrialSavingId,
    setMaxBranchDrafts,
    setMaxUserDrafts,
    maxBranchSavingId,
    maxUserSavingId,
    getMaxBranchDraft,
    getMaxUserDraft,
    saveMaxBranches,
    saveMaxUsers,
    saveFreeTrial,
    openPricingTabFromManage,
  } = state;

  const pageAccessRows = useMemo(() => {
    if (!selected) return [];
    const addons = resolvePharmacyAddonFlags(selected, selectedTier);
    return buildSubscriptionPageAccessRows({
      isArabic,
      tier: selectedTier,
      staffAddon: addons.staffAddon,
      customersAddon: addons.customersAddon,
      investmentAddon: addons.investmentAddon,
    });
  }, [
    isArabic,
    selected,
    selectedTier,
    selected?.staffAddon,
    selected?.customersAddon,
    selected?.investmentAddon,
  ]);

  if (!selectedBranchUsage || !selectedUserUsage || !selected) return null;

  return (
    <section className="saasManageLimitsCard">
      <div className="saasManageLimitsHead">
        <div>
          <h3>{isArabic ? "حدود الاشتراك" : "Subscription limits"}</h3>
          <p className="saasManageLimitsHint">
            {isArabic
              ? "الحدود دي بتيجي من حاسبة التسعير عند التسجيل، وتقدر تعدّلها يدويًا للصيدلية دي. سعر التجديد يتحسب من الحاسبة (شهري أو سنوي بخصم 20%)."
              : "These caps come from the pricing calculator at signup and can be overridden per pharmacy. Renewal pricing uses the calculator (monthly or yearly with 20% off)."}
          </p>
          <button
            type="button"
            className="saasManagePackagesLink"
            onClick={openPricingTabFromManage}
          >
            {isArabic
              ? "تعديل أسعار الحاسبة ← تبويب التسعير"
              : "Edit calculator prices → Pricing tab"}
          </button>
        </div>
      </div>

      <div className="saasManageLimitsTiles">
        <div className="saasManageLimitTile">
          <div className="saasManageLimitTileTop">
            <span className="saasManageLimitTileLabel">
              {isArabic ? "حد الفروع" : "Branch limit"}
            </span>
            <span className="saasManageUsageChip">
              {formatUsageLabel(
                selectedBranchUsage.used,
                selectedBranchUsage.max,
                "فرع",
                "branches",
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
              aria-label={isArabic ? "الحد الأقصى للفروع" : "Max branches"}
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

      <SubscriptionPagesAccessList
        isArabic={isArabic}
        rows={pageAccessRows}
        title={isArabic ? "الصفحات المشترك فيها (من التسجيل)" : "Subscribed pages (from registration)"}
      />

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
            {isArabic ? "الفروع الحالية" : "Current branches"}
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
