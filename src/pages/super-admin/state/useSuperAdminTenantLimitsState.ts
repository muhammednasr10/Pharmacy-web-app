import { useEffect, useState } from "react";
import {
  computeTrialEndDate,
  isTrialSubscriptionStatus,
} from "../../../config/subscription";
import type { PharmacySettings } from "../../../types";
import type { SaasTab } from "../types";

type Params = {
  isArabic: boolean;
  selected: PharmacySettings | null | undefined;
  manageModalOpen: boolean;
  setActiveTab: (tab: SaasTab) => void;
  setManageModalOpen: (open: boolean) => void;
  onUpdateMaxBranches: (organizationId: string, maxBranches: number) => Promise<boolean>;
  onUpdateMaxUsers: (organizationId: string, maxUsers: number) => Promise<boolean>;
  onUpdateOrganizationFreeTrial: (
    organizationId: string,
    params: { enabled: boolean; endDate: string },
  ) => Promise<boolean>;
};

export function useSuperAdminTenantLimitsState({
  isArabic,
  selected,
  manageModalOpen,
  setActiveTab,
  setManageModalOpen,
  onUpdateMaxBranches,
  onUpdateMaxUsers,
  onUpdateOrganizationFreeTrial,
}: Params) {
  const [maxBranchDrafts, setMaxBranchDrafts] = useState<Record<string, string>>({});
  const [maxUserDrafts, setMaxUserDrafts] = useState<Record<string, string>>({});
  const [maxBranchSavingId, setMaxBranchSavingId] = useState<string | null>(null);
  const [maxUserSavingId, setMaxUserSavingId] = useState<string | null>(null);
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

  function openPricingTabFromManage() {
    setManageModalOpen(false);
    setActiveTab("pricing");
  }

  return {
    freeTrialDraft,
    setFreeTrialDraft,
    freeTrialSavingId,
    maxBranchSavingId,
    maxUserSavingId,
    maxBranchDrafts,
    setMaxBranchDrafts,
    maxUserDrafts,
    setMaxUserDrafts,
    getMaxBranchDraft,
    getMaxUserDraft,
    saveFreeTrial,
    saveMaxUsers,
    saveMaxBranches,
    openPricingTabFromManage,
  };
}
