import { useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import BranchTransferModal from "../components/BranchTransferModal";
import type { AppUser, BranchStockTransfer, PharmacySettings } from "../types";
import { describeCopyableBranchSettings } from "../utils/copyBranchSettings";
import {
  buildBranchTransferPrintParams,
  printBranchTransferPDF,
} from "../utils/branchTransferPrint";
import { getOrganizationBranchUsage } from "../utils/branchLimits";
import { canApproveBranchStockTransfer } from "../utils/roles";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
  canTransferStockWithTier,
  getTierUpgradeNotice,
} from "../utils/subscriptionFeatures";
import type { SubscriptionTier } from "../config/subscriptionTiers";

type BranchesPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  branches: PharmacySettings[];
  setBranches: (rows: PharmacySettings[]) => void;
  activeBranchId: string | null;
  pharmacySettings: PharmacySettings | null;
  appLogo: string;
  orgSubscriptionTier: SubscriptionTier;
  branchTransfers: BranchStockTransfer[];
  onRefreshBranchTransfers: () => Promise<void>;
  onTransferComplete: () => Promise<void>;
  onSwitchBranch: (branchId: string) => void;
  getPharmacyId: () => string;
  resolveBranchLabel: (branchId: string | undefined) => string;
  onActivityLog: (entry: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
};

type BranchFormState = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  isActive: boolean;
};

const emptyBranchForm: BranchFormState = {
  id: "",
  name: "",
  name_en: "",
  phone: "",
  address: "",
  currency: "ج.م",
  isActive: true,
};

function formatBranchTransferActionError(message: string, isArabic: boolean) {
  const map: Record<string, [string, string]> = {
    transfer_not_found: ["طلب النقل غير موجود", "Transfer request not found"],
    not_pending: ["هذا الطلب ليس بانتظار الاعتماد", "This request is not pending approval"],
    medicine_not_found: ["الدواء غير موجود في الفرع المصدر", "Medicine not found in source branch"],
    insufficient_stock: [
      "الكمية غير متوفرة في الفرع المصدر",
      "Insufficient stock in source branch",
    ],
    target_medicine_missing: [
      "تعذر إنشاء الدواء في الفرع الهدف",
      "Could not create medicine in target branch",
    ],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  return message;
}

export default function BranchesPage({
  isArabic,
  t,
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
  resolveBranchLabel,
  onActivityLog,
}: BranchesPageProps) {
  const [branchModal, setBranchModal] = useState<"add" | "edit" | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
  const [savingBranch, setSavingBranch] = useState(false);
  const [copyBranchSettingsEnabled, setCopyBranchSettingsEnabled] = useState(true);
  const [copySettingsFromBranchId, setCopySettingsFromBranchId] = useState("");
  const [showBranchTransferModal, setShowBranchTransferModal] = useState(false);

  const branchTransferGroups = useMemo(() => {
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
    const branch = branches.find((item) => item.id === pharmacyId);
    if (!branch) return pharmacyId;
    return (isArabic ? branch.name : branch.name_en) || branch.name || pharmacyId;
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
    });
    setBranchModal("edit");
  }

  function makeBranchId() {
    const base =
      (branchForm.name_en || branchForm.name || "branch")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "branch";
    const existing = new Set(branches.map((branch) => branch.id));
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
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
      if (branchModal === "add") {
        const id = makeBranchId();
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
  const canTransfer = canTransferStockWithTier(appUser, orgSubscriptionTier, branches.length);
  const homePharmacy = branches.find((branch) => branch.id === appUser?.pharmacyId) || branches[0];
  const branchUsage = homePharmacy ? getOrganizationBranchUsage(branches, homePharmacy) : null;
  const canAddBranch =
    canManageOrgBranchesWithTier(appUser, orgSubscriptionTier) && (branchUsage?.canAdd ?? true);

  return (
    <section className="card branchesPage">
      {branchModal && (
        <div className="modalOverlay" onClick={() => setBranchModal(null)}>
          <div className="userFormPanel" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <h2>
                {branchModal === "add"
                  ? isArabic
                    ? "إضافة فرع"
                    : "Add Branch"
                  : isArabic
                    ? "تعديل فرع"
                    : "Edit Branch"}
              </h2>
              <button type="button" className="closeBtn" onClick={() => setBranchModal(null)}>
                ×
              </button>
            </div>
            <div className="userFormGrid">
              <label>
                <span>{isArabic ? "اسم الفرع" : "Branch name"}</span>
                <input
                  value={branchForm.name}
                  onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })}
                />
              </label>
              <label>
                <span>{isArabic ? "الاسم بالإنجليزية" : "Name (English)"}</span>
                <input
                  value={branchForm.name_en}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, name_en: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{isArabic ? "الهاتف" : "Phone"}</span>
                <input
                  value={branchForm.phone}
                  onChange={(event) => setBranchForm({ ...branchForm, phone: event.target.value })}
                />
              </label>
              <label>
                <span>{isArabic ? "العملة" : "Currency"}</span>
                <input
                  value={branchForm.currency}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, currency: event.target.value })
                  }
                />
              </label>
              <label className="userFormFullWidth">
                <span>{isArabic ? "العنوان" : "Address"}</span>
                <input
                  value={branchForm.address}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, address: event.target.value })
                  }
                />
              </label>
              <label className="userFormFullWidth branchActiveToggle">
                <input
                  type="checkbox"
                  checked={branchForm.isActive}
                  onChange={(event) =>
                    setBranchForm({ ...branchForm, isActive: event.target.checked })
                  }
                />
                <span>{isArabic ? "فرع مفعّل" : "Active branch"}</span>
              </label>
              {branchModal === "add" && branches.length > 0 && (
                <>
                  <label className="userFormFullWidth branchActiveToggle">
                    <input
                      type="checkbox"
                      checked={copyBranchSettingsEnabled}
                      onChange={(event) => setCopyBranchSettingsEnabled(event.target.checked)}
                    />
                    <span>
                      {isArabic
                        ? "نسخ إعدادات من فرع موجود"
                        : "Copy settings from an existing branch"}
                    </span>
                  </label>
                  {copyBranchSettingsEnabled && (
                    <label className="userFormFullWidth">
                      <span>{isArabic ? "نسخ الإعدادات من" : "Copy settings from"}</span>
                      <select
                        value={copySettingsFromBranchId}
                        onChange={(event) => setCopySettingsFromBranchId(event.target.value)}
                      >
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {(isArabic ? branch.name : branch.name_en) || branch.name || branch.id}
                          </option>
                        ))}
                      </select>
                      <p className="mutedText branchCopyHint">
                        {describeCopyableBranchSettings(isArabic)}
                      </p>
                    </label>
                  )}
                </>
              )}
            </div>
            <div className="modalActions">
              <button type="button" className="ghostBtn" onClick={() => setBranchModal(null)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="printBtn"
                disabled={savingBranch}
                onClick={() => void saveBranch()}
              >
                {savingBranch
                  ? isArabic
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "حفظ"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBranchTransferModal && (
        <BranchTransferModal
          branches={branches}
          defaultFromBranchId={getPharmacyId()}
          isArabic={isArabic}
          userId={user?.uid}
          userName={appUser?.name}
          onClose={() => setShowBranchTransferModal(false)}
          onComplete={async () => {
            await onTransferComplete();
            setShowBranchTransferModal(false);
          }}
          onPrintTransfer={printBranchTransferRecords}
        />
      )}

      <div className="cardHeader">
        <h2>{isArabic ? "الفروع" : "Branches"}</h2>
        <div className="actionButtons">
          {canTransfer && (
            <button
              type="button"
              className="editBtn"
              onClick={() => setShowBranchTransferModal(true)}
            >
              {isArabic ? "⇄ نقل مخزون" : "⇄ Transfer stock"}
            </button>
          )}
          {canManageOrgBranchesWithTier(appUser, orgSubscriptionTier) && (
            <button
              type="button"
              className="printBtn"
              disabled={!canAddBranch}
              onClick={openAddBranchModal}
            >
              {isArabic ? "+ إضافة فرع" : "+ Add Branch"}
            </button>
          )}
        </div>
      </div>

      <p className="hintText">
        {branchUsage
          ? isArabic
            ? `الفروع المستخدمة: ${branchUsage.used} من ${branchUsage.max}. كل فرع له مخزونه وفواتيره وبياناته المنفصلة.`
            : `Branches in use: ${branchUsage.used} of ${branchUsage.max}. Each branch has its own inventory, invoices, and data.`
          : isArabic
            ? "كل فرع له مخزونه وفواتيره وبياناته المنفصلة. اختر الفرع النشط لعرض وإدارة بياناته."
            : "Each branch has its own separate inventory, invoices, and data. Pick the active branch to view and manage its data."}
      </p>

      {branches.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد فروع — اضغط إضافة فرع" : "No branches — click Add Branch"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "الفرع" : "Branch"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "العنوان" : "Address"}</th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => {
                const isCurrent = branch.id === effectiveBranchId;
                return (
                  <tr key={branch.id} className={isCurrent ? "branchActiveRow" : ""}>
                    <td>
                      <strong>{(isArabic ? branch.name : branch.name_en) || branch.name}</strong>
                      {isCurrent && (
                        <span className="badge ok branchCurrentTag">
                          {isArabic ? "نشط الآن" : "Active"}
                        </span>
                      )}
                    </td>
                    <td>{branch.phone || "-"}</td>
                    <td>{branch.address || "-"}</td>
                    <td>
                      <span className={branch.isActive !== false ? "badge ok" : "badge danger"}>
                        {branch.isActive !== false
                          ? isArabic
                            ? "مفعل"
                            : "Active"
                          : isArabic
                            ? "موقوف"
                            : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="smallBtn"
                          disabled={isCurrent}
                          onClick={() => onSwitchBranch(branch.id)}
                        >
                          {isArabic ? "تبديل" : "Switch"}
                        </button>
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => openEditBranchModal(branch)}
                        >
                          {isArabic ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={branch.id === "main" || branch.id === appUser?.pharmacyId}
                          onClick={() =>
                            void removeBranch(
                              branch.id,
                              (isArabic ? branch.name : branch.name_en) || branch.name,
                            )
                          }
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canTransfer && pendingBranchTransferGroups.length > 0 && (
        <>
          <h3 className="branchTransfersTitle branchPendingTransfersTitle">
            {isArabic ? "طلبات نقل بانتظار الاعتماد" : "Pending transfer approvals"}
          </h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الرقم" : "No."}</th>
                  <th>{isArabic ? "من" : "From"}</th>
                  <th>{isArabic ? "إلى" : "To"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "إجمالي الكمية" : "Total qty"}</th>
                  <th>{t.date}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {pendingBranchTransferGroups.map((group) => (
                  <tr key={group.transferNumber} className="branchPendingTransferRow">
                    <td>
                      {group.transferNumber}
                      <span className="badge warn branchTransferStatusBadge">
                        {isArabic ? "بانتظار الاعتماد" : "Pending"}
                      </span>
                    </td>
                    <td>{resolveBranchLabel(group.fromPharmacyId)}</td>
                    <td>{resolveBranchLabel(group.toPharmacyId)}</td>
                    <td>
                      <div className="branchTransferItemsCell">
                        <span className="badge ok">
                          {isArabic ? `${group.items.length} صنف` : `${group.items.length} items`}
                        </span>
                        <ul className="branchTransferItemsList">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              {(isArabic ? item.medicineName_ar : item.medicineName_en) ||
                                item.medicineName_ar ||
                                "—"}{" "}
                              × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td>{group.totalQty}</td>
                    <td>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => void handleApproveBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "اعتماد" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          onClick={() => void handleRejectBranchTransfer(group.transferNumber)}
                        >
                          {isArabic ? "رفض" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canTransfer && completedBranchTransferGroups.length > 0 && (
        <>
          <h3 className="branchTransfersTitle">
            {isArabic ? "سجل نقل المخزون" : "Stock transfer history"}
          </h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الرقم" : "No."}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{isArabic ? "من" : "From"}</th>
                  <th>{isArabic ? "إلى" : "To"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "إجمالي الكمية" : "Total qty"}</th>
                  <th>{t.date}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {completedBranchTransferGroups.map((group) => (
                  <tr key={group.transferNumber}>
                    <td>{group.transferNumber}</td>
                    <td>
                      {group.status === "rejected" ? (
                        <span className="badge danger branchTransferStatusBadge">
                          {isArabic ? "مرفوض" : "Rejected"}
                        </span>
                      ) : (
                        <span className="badge ok branchTransferStatusBadge">
                          {isArabic ? "مكتمل" : "Completed"}
                        </span>
                      )}
                    </td>
                    <td>{resolveBranchLabel(group.fromPharmacyId)}</td>
                    <td>{resolveBranchLabel(group.toPharmacyId)}</td>
                    <td>
                      <div className="branchTransferItemsCell">
                        <span className="badge ok">
                          {isArabic ? `${group.items.length} صنف` : `${group.items.length} items`}
                        </span>
                        <ul className="branchTransferItemsList">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              {(isArabic ? item.medicineName_ar : item.medicineName_en) ||
                                item.medicineName_ar ||
                                "—"}{" "}
                              × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td>{group.totalQty}</td>
                    <td>{group.createdAt ? new Date(group.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      {group.status === "completed" && (
                        <button
                          type="button"
                          className="printBtn branchTransferPrintBtn"
                          onClick={() => printBranchTransferRecords(group.items)}
                        >
                          <span aria-hidden="true">🖨️</span>
                          <span>{t.print}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
