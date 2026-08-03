import { useMemo, useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import type { BranchStockTransfer, PharmacySettings } from "../../types";
import { getBranchLabel } from "../../utils/branchLabel";
import {
  buildBranchTransferPrintParams,
  printBranchTransferPDF,
} from "../../utils/branchTransferPrint";
import { getOrganizationBranchUsage } from "../../utils/branchLimits";
import { canApproveBranchStockTransfer } from "../../utils/roles";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
  canTransferStockWithTier,
  getTierUpgradeNotice,
} from "../../utils/subscriptionFeatures";
import {
  emptyBranchForm,
  formatBranchTransferActionError,
  makeBranchId,
  parseBranchGeoField,
} from "./helpers";
import type { BranchFormState, BranchesPageProps, BranchTransferGroup } from "./types";

export function useBranchesPageState(props: BranchesPageProps) {
  const {
    isArabic,
    appUser,
    user,
    branches,
    setBranches,
    activeBranchId,
    pharmacySettings,
    appLogo,
    orgSubscriptionTier,
    branchTransfers,
    onRefreshBranchTransfers,
    onTransferComplete,
    onSwitchBranch,
    getPharmacyId,
    onActivityLog,
  } = props;

  const subscriptionBlocksWrite = props.subscriptionBlocksWrite ?? false;

  const [branchModal, setBranchModal] = useState<"add" | "edit" | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
  const [savingBranch, setSavingBranch] = useState(false);
  const [copyBranchSettingsEnabled, setCopyBranchSettingsEnabled] = useState(true);
  const [copySettingsFromBranchId, setCopySettingsFromBranchId] = useState("");
  const [showBranchTransferModal, setShowBranchTransferModal] = useState(false);

  const branchTransferGroups = useMemo((): BranchTransferGroup[] => {
    const grouped = new Map<string, BranchStockTransfer[]>();
    for (const row of branchTransfers) {
      const list = grouped.get(row.transferNumber) || [];
      list.push(row);
      grouped.set(row.transferNumber, list);
    }
    return Array.from(grouped.entries()).map(([transferNumber, items]) => ({
      transferNumber,
      items,
      fromPharmacyId: items[0]?.fromPharmacyId,
      toPharmacyId: items[0]?.toPharmacyId,
      createdAt: items[0]?.createdAt,
      status: items[0]?.status || "completed",
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }, [branchTransfers]);

  const pendingBranchTransferGroups = useMemo(() => {
    if (!canReviewBranchTransfersWithTier(appUser, orgSubscriptionTier, branches.length)) {
      return [];
    }
    return branchTransferGroups.filter(
      (group) =>
        group.status === "pending" &&
        group.toPharmacyId &&
        canApproveBranchStockTransfer(appUser, group.toPharmacyId),
    );
  }, [branchTransferGroups, appUser, orgSubscriptionTier, branches.length]);

  const completedBranchTransferGroups = useMemo(
    () => branchTransferGroups.filter((group) => group.status !== "pending"),
    [branchTransferGroups],
  );

  function branchLabel(pharmacyId: string) {
    return getBranchLabel(pharmacyId, branches, isArabic);
  }

  function openAddBranchModal() {
    if (!canManageOrgBranchesWithTier(appUser, orgSubscriptionTier)) {
      alert(
        getTierUpgradeNotice(
          appUser,
          orgSubscriptionTier,
          branches.length,
          "branchesPage",
          isArabic,
        ) ||
          (isArabic
            ? "باقتك الحالية لا تدعم إضافة فروع — رقِّ للاحترافي أو الفاخر"
            : "Your package does not support branches — upgrade to Professional or Premium"),
      );
      return;
    }
    const homePharmacy =
      branches.find((branch) => branch.id === appUser?.pharmacyId) || branches[0];
    if (homePharmacy) {
      const usage = getOrganizationBranchUsage(branches, homePharmacy);
      if (!usage.canAdd) {
        alert(
          isArabic
            ? `وصلت للحد الأقصى للفروع (${usage.used}/${usage.max}). تواصل مع الدعم لزيادة الحد.`
            : `Branch limit reached (${usage.used}/${usage.max}). Contact support to increase the limit.`,
        );
        return;
      }
    }
    setBranchForm({
      ...emptyBranchForm,
      currency: pharmacySettings?.currency || "ج.م",
    });
    setCopyBranchSettingsEnabled(branches.length > 0);
    setCopySettingsFromBranchId(homePharmacy?.id || branches[0]?.id || "");
    setBranchModal("add");
  }

  function openEditBranchModal(branch: PharmacySettings) {
    setBranchForm({
      id: branch.id,
      name: branch.name || "",
      name_en: branch.name_en || "",
      phone: branch.phone || "",
      address: branch.address || "",
      currency: branch.currency || "ج.م",
      isActive: branch.isActive !== false,
      latitude: branch.latitude != null ? String(branch.latitude) : "",
      longitude: branch.longitude != null ? String(branch.longitude) : "",
      geofenceRadiusM:
        branch.geofenceRadiusM != null ? String(branch.geofenceRadiusM) : "30",
    });
    setBranchModal("edit");
  }

  async function saveBranch() {
    if (!canManageOrgBranchesWithTier(appUser, orgSubscriptionTier)) {
      alert(
        isArabic
          ? "باقتك الحالية لا تدعم إدارة الفروع"
          : "Your current package does not include branch management",
      );
      return;
    }
    const name = branchForm.name.trim();
    if (!name) {
      alert(isArabic ? "من فضلك أدخل اسم الفرع" : "Please enter a branch name");
      return;
    }

    setSavingBranch(true);
    try {
      const latitude = parseBranchGeoField(branchForm.latitude);
      const longitude = parseBranchGeoField(branchForm.longitude);
      const geofenceRadiusM = parseBranchGeoField(branchForm.geofenceRadiusM) ?? 30;
      const geoPayload = {
        latitude,
        longitude,
        geofenceRadiusM,
      };

      if (branchModal === "add") {
        const id = makeBranchId(branchForm, branches);
        await pharmacyService.createPharmacyBranch({
          id,
          name,
          name_en: branchForm.name_en.trim(),
          phone: branchForm.phone.trim(),
          address: branchForm.address.trim(),
          currency: branchForm.currency || "ج.م",
          isActive: branchForm.isActive,
        });
        if (
          copyBranchSettingsEnabled &&
          copySettingsFromBranchId &&
          copySettingsFromBranchId !== id
        ) {
          await pharmacyService.copyPharmacySettingsFromBranch(copySettingsFromBranchId, id);
        }
        await pharmacyService.updatePharmacySettings(id, {
          currency: branchForm.currency || "ج.م",
          ...geoPayload,
        });
        const copiedFromLabel = branchLabel(copySettingsFromBranchId);
        await onActivityLog({
          type: "settings_update",
          title: isArabic ? "إضافة فرع" : "Branch Added",
          description:
            copyBranchSettingsEnabled && copySettingsFromBranchId
              ? isArabic
                ? `تم إضافة الفرع ${name} مع نسخ الإعدادات من ${copiedFromLabel}`
                : `Branch ${name} was added with settings copied from ${copiedFromLabel}`
              : isArabic
                ? `تم إضافة الفرع ${name}`
                : `Branch ${name} was added`,
          referenceType: "branch",
          referenceId: id,
        });
      } else {
        await pharmacyService.updatePharmacySettings(branchForm.id, {
          name,
          name_en: branchForm.name_en.trim(),
          phone: branchForm.phone.trim(),
          address: branchForm.address.trim(),
          currency: branchForm.currency || "ج.م",
          isActive: branchForm.isActive,
          ...geoPayload,
        });
        await onActivityLog({
          type: "settings_update",
          title: isArabic ? "تعديل فرع" : "Branch Updated",
          description: isArabic ? `تم تعديل الفرع ${name}` : `Branch ${name} was updated`,
          referenceType: "branch",
          referenceId: branchForm.id,
        });
      }
      setBranches(await pharmacyService.getPharmacies());
      setBranchModal(null);
      alert(isArabic ? "تم حفظ بيانات الفرع" : "Branch saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "branch_limit_reached"
          ? isArabic
            ? "وصلت للحد الأقصى للفروع المسموح بها في اشتراكك"
            : "You reached the allowed branch limit for your subscription"
          : message || (isArabic ? "تعذر حفظ الفرع" : "Could not save branch"),
      );
    } finally {
      setSavingBranch(false);
    }
  }

  async function removeBranch(id: string, name: string) {
    if (!canManageOrgBranchesWithTier(appUser, orgSubscriptionTier)) {
      alert(
        isArabic
          ? "باقتك الحالية لا تدعم إدارة الفروع"
          : "Your current package does not include branch management",
      );
      return;
    }
    if (id === "main") {
      alert(isArabic ? "لا يمكن حذف الفرع الرئيسي" : "The main branch cannot be deleted");
      return;
    }
    if (id === appUser?.pharmacyId) {
      alert(isArabic ? "لا يمكنك حذف الفرع التابع له حسابك" : "You cannot delete your own branch");
      return;
    }
    const confirmed = window.confirm(
      isArabic
        ? `حذف الفرع "${name}"؟ تأكد أن الفرع لا يحتوي على بيانات (أدوية/فواتير) أولاً.`
        : `Delete branch "${name}"? Make sure it has no data (medicines/invoices) first.`,
    );
    if (!confirmed) return;

    try {
      await pharmacyService.deletePharmacy(id);
      if (activeBranchId === id) {
        onSwitchBranch(appUser?.pharmacyId || "main");
      }
      await onActivityLog({
        type: "settings_update",
        title: isArabic ? "حذف فرع" : "Branch Deleted",
        description: isArabic ? `تم حذف الفرع ${name}` : `Branch ${name} was deleted`,
        referenceType: "branch",
        referenceId: id,
      });
      setBranches(await pharmacyService.getPharmacies());
    } catch {
      alert(
        isArabic
          ? "تعذر حذف الفرع. قد يكون مرتبطاً ببيانات (أدوية أو فواتير)."
          : "Could not delete branch. It may still contain data (medicines or invoices).",
      );
    }
  }

  function printBranchTransferRecords(records: BranchStockTransfer[]) {
    const params = buildBranchTransferPrintParams({
      records,
      branches,
      isArabic,
      pharmacySettings,
      logoBase64: appLogo,
    });
    if (!params) return;
    printBranchTransferPDF(params);
  }

  async function handleApproveBranchTransfer(transferNumber: string) {
    const confirmed = window.confirm(
      isArabic
        ? `اعتماد طلب النقل ${transferNumber} وتنفيذ حركة المخزون؟`
        : `Approve transfer ${transferNumber} and move stock?`,
    );
    if (!confirmed) return;
    try {
      const results = await pharmacyService.approveBranchStockTransferBatch({
        transferNumber,
        userId: user?.uid,
        userName: appUser?.name,
      });
      await onTransferComplete();
      alert(
        isArabic
          ? `تم اعتماد النقل (${results.length} صنف)`
          : `Transfer approved (${results.length} item(s))`,
      );
      if (window.confirm(isArabic ? "هل تريد طباعة سند النقل؟" : "Print the transfer document?")) {
        printBranchTransferRecords(results);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "approve_failed";
      alert(formatBranchTransferActionError(message, isArabic));
    }
  }

  async function handleRejectBranchTransfer(transferNumber: string) {
    const rejectionReason = window.prompt(
      isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):",
    );
    if (rejectionReason === null) return;
    try {
      await pharmacyService.rejectBranchStockTransferBatch({
        transferNumber,
        userId: user?.uid,
        userName: appUser?.name,
        rejectionReason,
      });
      await onRefreshBranchTransfers();
      alert(isArabic ? "تم رفض طلب النقل" : "Transfer request rejected");
    } catch (error) {
      const message = error instanceof Error ? error.message : "reject_failed";
      alert(formatBranchTransferActionError(message, isArabic));
    }
  }

  const effectiveBranchId = activeBranchId || appUser?.pharmacyId;
  const canTransfer =
    canTransferStockWithTier(appUser, orgSubscriptionTier, branches.length) &&
    !subscriptionBlocksWrite;
  const homePharmacy = branches.find((branch) => branch.id === appUser?.pharmacyId) || branches[0];
  const branchUsage = homePharmacy ? getOrganizationBranchUsage(branches, homePharmacy) : null;
  const canAddBranch =
    canManageOrgBranchesWithTier(appUser, orgSubscriptionTier) &&
    (branchUsage?.canAdd ?? true) &&
    !subscriptionBlocksWrite;

  return {
    ...props,
    branchModal,
    setBranchModal,
    branchForm,
    setBranchForm,
    savingBranch,
    copyBranchSettingsEnabled,
    setCopyBranchSettingsEnabled,
    copySettingsFromBranchId,
    setCopySettingsFromBranchId,
    showBranchTransferModal,
    setShowBranchTransferModal,
    pendingBranchTransferGroups,
    completedBranchTransferGroups,
    openAddBranchModal,
    openEditBranchModal,
    saveBranch,
    removeBranch,
    printBranchTransferRecords,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    effectiveBranchId,
    canTransfer,
    branchUsage,
    canAddBranch,
    getPharmacyId,
  };
}

export type BranchesPageState = ReturnType<typeof useBranchesPageState>;
