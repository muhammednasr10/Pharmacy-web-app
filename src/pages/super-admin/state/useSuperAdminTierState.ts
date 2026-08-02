import { useEffect, useState } from "react";
import type { Page } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  computeTrialEndDate,
  isTrialSubscriptionStatus,
} from "../../../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
  subscriptionTiers,
  type SubscriptionTier,
} from "../../../config/subscriptionTiers";
import { sanitizeTierEnabledPagesSelection } from "../../../config/subscriptionTierPages";
import {
  sanitizeTierAllowedFeaturesSelection,
  type TierFeatureKey,
} from "../../../config/subscriptionTierFeatures";
import { groupPharmaciesByOrganization } from "../../../utils/branchLimits";
import { getOrganizationBranchUsage } from "../../../utils/branchLimits";
import { getOrganizationUserUsage, countOrganizationUsers } from "../../../utils/userLimits";
import { formatBranchLimitError } from "../../../utils/orgAdminErrors";
import { mergeTierEditAutoCopy, buildTierPackageCopy } from "../../../utils/tierPackageCopy";
import type { PharmacySettings } from "../../../types";
import type { SaasTab } from "../types";
import type { SuperAdminSharedContext } from "./shared";

type TierParams = Pick<
  SuperAdminSharedContext,
  | "isArabic"
  | "operatorUid"
  | "pharmacies"
  | "systemUsers"
  | "selected"
  | "selectedTierCap"
> & {
  activeTab: SaasTab;
  manageModalOpen: boolean;
  setActiveTab: (tab: SaasTab) => void;
  setManageModalOpen: (open: boolean) => void;
  onUpdateSubscriptionTier: (
    organizationId: string,
    tier: SubscriptionTier,
  ) => Promise<boolean>;
  onUpdateMaxBranches: (organizationId: string, maxBranches: number) => Promise<boolean>;
  onUpdateMaxUsers: (organizationId: string, maxUsers: number) => Promise<boolean>;
  onUpdateOrganizationFreeTrial: (
    organizationId: string,
    params: { enabled: boolean; endDate: string },
  ) => Promise<boolean>;
  onRefreshPharmacies: () => Promise<void>;
};

export function useSuperAdminTierState(params: TierParams) {
  const {
    isArabic,
    operatorUid,
    pharmacies,
    systemUsers,
    selected,
    selectedTierCap,
    activeTab,
    manageModalOpen,
    setActiveTab,
    setManageModalOpen,
    onUpdateSubscriptionTier,
    onUpdateMaxBranches,
    onUpdateMaxUsers,
    onUpdateOrganizationFreeTrial,
    onRefreshPharmacies,
  } = params;

  const [tierEditModalOpen, setTierEditModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<SubscriptionTier | null>(null);
  const [tierEditForm, setTierEditForm] = useState({
    labelAr: "",
    labelEn: "",
    maxBranches: "",
    maxUsers: "",
    summaryAr: "",
    summaryEn: "",
    featuresAr: "",
    featuresEn: "",
    packagePrice: "",
    enabledPages: [] as Page[],
    allowedFeatures: [] as TierFeatureKey[],
  });
  const [tierConfigVersion, setTierConfigVersion] = useState(0);
  const [savingTierConfig, setSavingTierConfig] = useState(false);
  const [maxBranchDrafts, setMaxBranchDrafts] = useState<Record<string, string>>({});
  const [maxUserDrafts, setMaxUserDrafts] = useState<Record<string, string>>({});
  const [maxBranchSavingId, setMaxBranchSavingId] = useState<string | null>(null);
  const [maxUserSavingId, setMaxUserSavingId] = useState<string | null>(null);
  const [tierSavingId, setTierSavingId] = useState<string | null>(null);
  const [freeTrialDraft, setFreeTrialDraft] = useState<{ enabled: boolean; endDate: string }>({
    enabled: false,
    endDate: computeTrialEndDate(),
  });
  const [freeTrialSavingId, setFreeTrialSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!manageModalOpen || !selected) return;
    const endDate =
      selected.subscriptionEndDate ||
      selected.subscriptionEndsAt ||
      computeTrialEndDate();
    setFreeTrialDraft({
      enabled: isTrialSubscriptionStatus(selected.subscriptionStatus),
      endDate,
    });
  }, [
    manageModalOpen,
    selected?.id,
    selected?.subscriptionStatus,
    selected?.subscriptionEndDate,
    selected?.subscriptionEndsAt,
  ]);

  useEffect(() => {
    if (activeTab !== "packages") return;
    void pharmacyService.loadSubscriptionTierConfigs().then(() => {
      setTierConfigVersion((value) => value + 1);
    });
  }, [activeTab]);

  function openTierEditModal(tierId: SubscriptionTier) {
    const tier = subscriptionTiers[tierId];
    setEditingTierId(tierId);
    setTierEditForm(
      mergeTierEditAutoCopy({
        labelAr: tier.labelAr,
        labelEn: tier.labelEn,
        maxBranches: String(tier.maxBranches),
        maxUsers: String(tier.maxUsers),
        summaryAr: tier.summaryAr,
        summaryEn: tier.summaryEn,
        featuresAr: tier.featuresAr.join("\n"),
        featuresEn: tier.featuresEn.join("\n"),
        packagePrice: String(tier.packagePrice || 0),
        enabledPages: [...tier.enabledPages],
        allowedFeatures: [...tier.allowedFeatures],
      }),
    );
    setTierEditModalOpen(true);
  }

  function closeTierEditModal() {
    if (savingTierConfig) return;
    setTierEditModalOpen(false);
    setEditingTierId(null);
  }

  async function submitTierEdit() {
    if (!editingTierId) return;
    const maxBranches = Math.floor(Number(tierEditForm.maxBranches));
    const maxUsers = Math.floor(Number(tierEditForm.maxUsers));
    if (!tierEditForm.labelAr.trim() || !tierEditForm.labelEn.trim()) {
      alert(isArabic ? "أدخل اسم الباقة بالعربية والإنجليزية" : "Enter package name in Arabic and English");
      return;
    }
    if (!Number.isFinite(maxBranches) || maxBranches < 1) {
      alert(isArabic ? "أدخل عدداً صحيحاً للمخازن المتاحة" : "Enter a valid warehouse limit");
      return;
    }
    if (!Number.isFinite(maxUsers) || maxUsers < 1) {
      alert(isArabic ? "أدخل حداً صحيحاً للمستخدمين" : "Enter a valid user limit");
      return;
    }

    const orgsOnTier = groupPharmaciesByOrganization(pharmacies).filter(
      (group) => parseSubscriptionTier(group.primary.subscriptionTier || group.primary.subscriptionPlan) === editingTierId,
    );
    for (const group of orgsOnTier) {
      const orgName = group.primary.name || group.primary.id;
      if (group.branches.length > maxBranches) {
        alert(
          isArabic
            ? `لا يمكن حفظ الباقة — «${orgName}» يستخدم ${group.branches.length} مخازن والحد الجديد ${maxBranches}`
            : `Cannot save package — "${orgName}" uses ${group.branches.length} warehouses but the new cap is ${maxBranches}`,
        );
        return;
      }
      const activeUsers = countOrganizationUsers(systemUsers, pharmacies, group.organizationId);
      if (activeUsers > maxUsers) {
        alert(
          isArabic
            ? `لا يمكن حفظ الباقة — «${orgName}» لديه ${activeUsers} مستخدمين نشطين والحد الجديد ${maxUsers}`
            : `Cannot save package — "${orgName}" has ${activeUsers} active users but the new cap is ${maxUsers}`,
        );
        return;
      }
    }

    const enabledPages = sanitizeTierEnabledPagesSelection(tierEditForm.enabledPages);
    const allowedFeatures = sanitizeTierAllowedFeaturesSelection(tierEditForm.allowedFeatures);
    if (!enabledPages.includes("dashboard")) {
      alert(isArabic ? "لوحة التحكم مطلوبة في كل باقة" : "Dashboard is required for every package");
      return;
    }
    const autoCopy = buildTierPackageCopy({ maxBranches, maxUsers, enabledPages });

    setSavingTierConfig(true);
    try {
      await pharmacyService.upsertSubscriptionTierConfig(
        editingTierId,
        {
          labelAr: tierEditForm.labelAr,
          labelEn: tierEditForm.labelEn,
          maxBranches,
          maxUsers,
          summaryAr: autoCopy.summaryAr,
          summaryEn: autoCopy.summaryEn,
          featuresAr: autoCopy.featuresAr,
          featuresEn: autoCopy.featuresEn,
          upgradeAmount: 0,
          packagePrice: Math.max(0, Number(tierEditForm.packagePrice) || 0),
          enabledPages,
          allowedFeatures,
        },
        operatorUid,
      );
      const syncResult = await pharmacyService.syncSubscriptionTierLimitsToOrganizations(editingTierId, {
        maxBranches,
        maxUsers,
      });
      await onRefreshPharmacies();
      setTierConfigVersion((value) => value + 1);
      closeTierEditModal();
      alert(
        syncResult.updatedOrganizations > 0
          ? isArabic
            ? `تم حفظ الباقة وتحديث حدود ${syncResult.updatedOrganizations} عميل على هذه الباقة`
            : `Package saved and limits updated for ${syncResult.updatedOrganizations} customer(s) on this tier`
          : isArabic
            ? "تم حفظ إعدادات الباقة بنجاح"
            : "Package settings saved successfully",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(
        formatBranchLimitError(message, isArabic) ||
          (message === "sql_migration_required"
            ? isArabic
              ? "شغّل migration subscription-tier-configs.sql في Supabase أولاً"
              : "Run subscription-tier-configs.sql migration in Supabase first"
            : message || (isArabic ? "تعذر حفظ الباقة" : "Could not save package")),
      );
    } finally {
      setSavingTierConfig(false);
    }
  }

  async function handleTierChange(pharmacy: PharmacySettings, nextTier: SubscriptionTier) {
    const currentTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    );
    if (nextTier === currentTier) return;

    const usage = getOrganizationBranchUsage(pharmacies, pharmacy);
    const userUsage = getOrganizationUserUsage(systemUsers, pharmacies, pharmacy);
    const tierMax = getSubscriptionTier(nextTier).maxBranches;
    const tierUserMax = getSubscriptionTier(nextTier).maxUsers;
    if (usage.used > tierMax) {
      alert(
        isArabic
          ? `لا يمكن خفض الباقة — الصيدلية تستخدم ${usage.used} مخازن والباقة الجديدة تسمح بـ ${tierMax} فقط`
          : `Cannot downgrade — pharmacy uses ${usage.used} warehouses but the new tier allows only ${tierMax}`,
      );
      return;
    }
    if (userUsage.used > tierUserMax) {
      alert(
        isArabic
          ? `لا يمكن خفض الباقة — الصيدلية تستخدم ${userUsage.used} مستخدمين والباقة الجديدة تسمح بـ ${tierUserMax} فقط`
          : `Cannot downgrade — pharmacy uses ${userUsage.used} users but the new tier allows only ${tierUserMax}`,
      );
      return;
    }

    setTierSavingId(usage.organizationId);
    try {
      await onUpdateSubscriptionTier(usage.organizationId, nextTier);
    } finally {
      setTierSavingId(null);
    }
  }

  function getMaxBranchDraft(organizationId: string, fallback: number) {
    return maxBranchDrafts[organizationId] ?? String(fallback);
  }

  function getMaxUserDraft(organizationId: string, fallback: number) {
    return maxUserDrafts[organizationId] ?? String(fallback);
  }

  async function saveFreeTrial(organizationId: string) {
    if (freeTrialDraft.enabled && !freeTrialDraft.endDate.trim()) {
      alert(isArabic ? "حدد تاريخ انتهاء النسخة المجانية" : "Set a free trial end date");
      return;
    }
    setFreeTrialSavingId(organizationId);
    try {
      await onUpdateOrganizationFreeTrial(organizationId, {
        enabled: freeTrialDraft.enabled,
        endDate: freeTrialDraft.endDate,
      });
    } finally {
      setFreeTrialSavingId(null);
    }
  }

  async function saveMaxUsers(organizationId: string, currentUsed: number) {
    const raw = getMaxUserDraft(organizationId, currentUsed);
    const next = Math.floor(Number(raw));
    if (!Number.isFinite(next) || next < 1) {
      alert(isArabic ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero");
      return;
    }
    if (next < currentUsed) {
      alert(
        isArabic
          ? `لا يمكن تقليل الحد عن المستخدمين الحاليين (${currentUsed})`
          : `Cannot set limit below current users (${currentUsed})`,
      );
      return;
    }
    setMaxUserSavingId(organizationId);
    try {
      const ok = await onUpdateMaxUsers(organizationId, next);
      if (ok) {
        setMaxUserDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[organizationId];
          return nextDrafts;
        });
      }
    } finally {
      setMaxUserSavingId(null);
    }
  }

  async function applyTierWarehouseLimit(organizationId: string, currentUsed: number) {
    const tierMax = selectedTierCap.maxBranches;
    if (currentUsed > tierMax) {
      alert(
        isArabic
          ? `لا يمكن تطبيق حد الباقة — الصيدلية تستخدم ${currentUsed} مخازن والباقة تسمح بـ ${tierMax}`
          : `Cannot apply package cap — pharmacy uses ${currentUsed} warehouses but the package allows ${tierMax}`,
      );
      return;
    }
    setMaxBranchDrafts((prev) => ({ ...prev, [organizationId]: String(tierMax) }));
    setMaxBranchSavingId(organizationId);
    try {
      const ok = await onUpdateMaxBranches(organizationId, tierMax);
      if (ok) {
        setMaxBranchDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[organizationId];
          return nextDrafts;
        });
      }
    } finally {
      setMaxBranchSavingId(null);
    }
  }

  function openPackagesTabFromManage() {
    setManageModalOpen(false);
    setActiveTab("packages");
  }

  async function saveMaxBranches(organizationId: string, currentUsed: number) {
    const raw = getMaxBranchDraft(organizationId, currentUsed);
    const next = Math.floor(Number(raw));
    if (!Number.isFinite(next) || next < 1) {
      alert(isArabic ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero");
      return;
    }
    if (next < currentUsed) {
      alert(
        isArabic
          ? `لا يمكن تقليل الحد عن المخازن الحالية (${currentUsed})`
          : `Cannot set limit below current warehouses (${currentUsed})`,
      );
      return;
    }
    setMaxBranchSavingId(organizationId);
    try {
      const ok = await onUpdateMaxBranches(organizationId, next);
      if (ok) {
        setMaxBranchDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[organizationId];
          return nextDrafts;
        });
      }
    } finally {
      setMaxBranchSavingId(null);
    }
  }

  return {
    tierEditModalOpen,
    editingTierId,
    tierEditForm,
    setTierEditForm,
    tierConfigVersion,
    savingTierConfig,
    freeTrialDraft,
    setFreeTrialDraft,
    freeTrialSavingId,
    maxBranchSavingId,
    maxUserSavingId,
    tierSavingId,
    maxBranchDrafts,
    setMaxBranchDrafts,
    maxUserDrafts,
    setMaxUserDrafts,
    openTierEditModal,
    closeTierEditModal,
    submitTierEdit,
    handleTierChange,
    getMaxBranchDraft,
    getMaxUserDraft,
    saveFreeTrial,
    saveMaxUsers,
    applyTierWarehouseLimit,
    saveMaxBranches,
    openPackagesTabFromManage,
  };
}
