import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../../../../services/pharmacyService";
import { formatLoginAccountSyncError } from "../../../../utils/staffLoginAccountErrors";
import { suggestLoginAccountDraft } from "../../../../utils/staffCatalog";
import {
  formatPharmacyGeneralManagerTakenError,
  isPharmacyGeneralManagerRole,
  isPharmacyGeneralManagerSlotTaken,
} from "../../../../utils/pharmacyGeneralManager";
import {
  getDefaultLoginAccountDraft,
  isSuperAdmin,
  parseLoginAccountRole,
} from "../../../../utils/roles";
import type { PharmacyLoginAccount, UserRole } from "../../../../types";
import { emptyCatalogForm } from "../../types";
import { staffActionErrorMessage } from "../../helpers";
import type { StaffLoginCatalogParams } from "./types";
import type { useStaffLoginCatalogData } from "./useStaffLoginCatalogData";

export type StaffLoginCatalogModalState = {
  accountModal: "add" | "edit" | "password-request" | null;
  setAccountModal: Dispatch<SetStateAction<"add" | "edit" | "password-request" | null>>;
  editCatalogId: string | null;
  setEditCatalogId: Dispatch<SetStateAction<string | null>>;
  catalogForm: ReturnType<typeof emptyCatalogForm>;
  setCatalogForm: Dispatch<SetStateAction<ReturnType<typeof emptyCatalogForm>>>;
};

export function useStaffLoginCatalogModalState(): StaffLoginCatalogModalState {
  const [accountModal, setAccountModal] = useState<"add" | "edit" | "password-request" | null>(
    null,
  );
  const [editCatalogId, setEditCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm);

  return {
    accountModal,
    setAccountModal,
    editCatalogId,
    setEditCatalogId,
    catalogForm,
    setCatalogForm,
  };
}

type StaffLoginCatalogData = ReturnType<typeof useStaffLoginCatalogData>;

export type StaffLoginCatalogCrudParams = StaffLoginCatalogParams &
  StaffLoginCatalogData &
  StaffLoginCatalogModalState & {
    syncSavedCatalogAccount: (
      targetPharmacyId: string,
      role: UserRole,
      accountId?: string | null,
    ) => Promise<void>;
  };

export function useStaffLoginCatalogCrud(params: StaffLoginCatalogCrudParams) {
  const {
    isArabic,
    appUser,
    setCatalogBranchFilter,
    employeeBranchFilter,
    setLoginAccountsPanelBranchFilter,
    setEmployeesAccessPanel,
    setBusy,
    employeesPanelPharmacyId,
    generalManagerScope,
    orgUserUsage,
    loadAll,
    refreshLoginCatalog,
    employeeById,
    catalogTargetPharmacyId,
    branchLoginCatalog,
    loginAccountRoleSelectOptions,
    syncSavedCatalogAccount,
    accountModal,
    setAccountModal,
    editCatalogId,
    setEditCatalogId,
    catalogForm,
    setCatalogForm,
  } = params;

  function openLoginAccountsPanel() {
    setLoginAccountsPanelBranchFilter(
      employeeBranchFilter !== "all" ? employeeBranchFilter : "all",
    );
    setEmployeesAccessPanel("login");
    void refreshLoginCatalog();
  }

  function openLoginAccountRequestFromEmployeesPanel() {
    setCatalogBranchFilter(employeesPanelPharmacyId);
    openCatalogAccountAdd();
  }

  function openCatalogAccountAdd(preferredRole?: string) {
    const role = preferredRole ?? loginAccountRoleSelectOptions[0] ?? "cashier";
    const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
    setEditCatalogId(null);
    setCatalogForm({
      role,
      email: defaults.email,
      password: defaults.password,
    });
    setAccountModal("add");
  }

  function openCatalogAccountEdit(account: PharmacyLoginAccount) {
    const defaults = getDefaultLoginAccountDraft(account.role);
    setEditCatalogId(account.id);
    setCatalogForm({
      role: parseLoginAccountRole(account.role),
      email: account.email,
      password: account.password || defaults.password,
    });
    setAccountModal("edit");
  }

  function openCatalogAccountDuplicate(account: PharmacyLoginAccount) {
    const role = parseLoginAccountRole(account.role);
    const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
    setEditCatalogId(null);
    setCatalogForm({
      role,
      email: defaults.email,
      password: defaults.password,
    });
    setAccountModal("add");
  }

  function onCatalogFormRoleChange(nextRole: UserRole) {
    const role = parseLoginAccountRole(nextRole);
    if (accountModal === "add") {
      const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
      setCatalogForm({
        role,
        email: defaults.email,
        password: defaults.password,
      });
      return;
    }
    setCatalogForm((prev) => ({ ...prev, role }));
  }

  function openPasswordChangeRequest(account: PharmacyLoginAccount) {
    if (account.editPending) {
      alert(
        isArabic
          ? "يوجد طلب تعديل قيد الاعتماد على هذا الحساب."
          : "A change request is already pending for this account.",
      );
      return;
    }
    if (account.status !== "approved") {
      alert(
        isArabic
          ? "لا يمكن طلب تغيير الباسورد إلا للحسابات المعتمدة."
          : "Password changes can only be requested for approved accounts.",
      );
      return;
    }
    setEditCatalogId(account.id);
    setCatalogForm({
      role: parseLoginAccountRole(account.role),
      email: account.email,
      password: "",
    });
    setAccountModal("password-request");
  }

  async function savePasswordChangeRequest() {
    const password = catalogForm.password;
    if (!editCatalogId || !password) {
      alert(isArabic ? "أدخل كلمة المرور الجديدة" : "Enter the new password");
      return;
    }
    if (password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    const account = branchLoginCatalog.find((item) => item.id === editCatalogId);
    if (!account) {
      alert(isArabic ? "الحساب غير موجود" : "Account not found");
      return;
    }

    setBusy("save-catalog");
    try {
      await pharmacyService.submitPharmacyLoginAccountEditRequest(
        editCatalogId,
        {
          email: account.email.trim().toLowerCase(),
          password,
          role: parseLoginAccountRole(account.role),
        },
        appUser?.uid,
        appUser?.name,
      );
      setAccountModal(null);
      await loadAll();
      alert(
        isArabic
          ? "تم إرسال طلب تغيير كلمة المرور لمالك النظام"
          : "Password change request sent to the system owner",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر إرسال الطلب" : "Request failed");
    } finally {
      setBusy("");
    }
  }

  async function saveCatalogAccount() {
    const email = catalogForm.email.trim().toLowerCase();
    const password = catalogForm.password;
    const role = parseLoginAccountRole(catalogForm.role);
    if (!email || !password) {
      alert(isArabic ? "أكمل الإيميل وكلمة المرور" : "Fill email and password");
      return;
    }
    if (password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    const targetPharmacyId = catalogTargetPharmacyId;
    if (
      isPharmacyGeneralManagerRole(role) &&
      isPharmacyGeneralManagerSlotTaken(targetPharmacyId, generalManagerScope, {
        accountId: editCatalogId || undefined,
      })
    ) {
      alert(formatPharmacyGeneralManagerTakenError(isArabic));
      return;
    }

    setBusy("save-catalog");
    try {
      const autoApprove = isSuperAdmin(appUser);
      let savedAccountId = editCatalogId || null;

      if (accountModal === "edit" && editCatalogId) {
        const editing = branchLoginCatalog.find((item) => item.id === editCatalogId);
        if (!autoApprove && editing?.status === "approved") {
          await pharmacyService.submitPharmacyLoginAccountEditRequest(
            editCatalogId,
            { email, password, role },
            appUser?.uid,
            appUser?.name,
          );
        } else {
          await pharmacyService.updatePharmacyLoginAccount(editCatalogId, {
            email,
            password,
            role,
            ...(autoApprove || editing?.status === "approved" ? {} : { status: "pending" }),
          });
        }
        savedAccountId = editCatalogId;
      } else if (accountModal === "add") {
        if (orgUserUsage && !orgUserUsage.canAdd) {
          alert(
            isArabic
              ? `تم الوصول للحد الأقصى للمستخدمين (${orgUserUsage.used}/${orgUserUsage.max}). تواصل مع الدعم لزيادة الباقة.`
              : `User limit reached (${orgUserUsage.used}/${orgUserUsage.max}). Contact support to upgrade.`,
          );
          return;
        }
        const duplicateEmail = branchLoginCatalog.some(
          (item) => item.email.trim().toLowerCase() === email,
        );
        if (duplicateEmail) {
          alert(
            isArabic
              ? "هذا الإيميل مستخدم بالفعل في هذا الفرع."
              : "This email is already used for this branch.",
          );
          return;
        }
        const created = await pharmacyService.createPharmacyLoginAccount({
          pharmacyId: targetPharmacyId,
          email,
          password,
          role,
          ...(autoApprove ? { status: "approved" } : { status: "pending" }),
          requestedBy: appUser?.uid,
          requestedByName: appUser?.name,
        });
        savedAccountId = created.id;
      }

      if (autoApprove) {
        try {
          await syncSavedCatalogAccount(targetPharmacyId, role, savedAccountId);
        } catch (syncErr) {
          const syncMessage =
            syncErr instanceof Error
              ? formatLoginAccountSyncError(syncErr.message, isArabic)
              : isArabic
                ? "تعذر ربط المستخدم"
                : "Could not link user";
          alert(
            isArabic
              ? `تم حفظ الحساب لكن الربط فشل:\n${syncMessage}`
              : `Account saved but linking failed:\n${syncMessage}`,
          );
        }
      }

      setAccountModal(null);
      await loadAll();
      alert(
        autoApprove
          ? isArabic
            ? "تم الحفظ"
            : "Saved"
          : accountModal === "edit"
            ? isArabic
              ? "تم إرسال التعديل — سيظهر لمالك النظام في «طلبات العملاء»"
              : "Changes submitted — they will appear under Customer requests"
            : isArabic
              ? "تم إرسال الطلب — سيظهر لمالك النظام في «طلبات العملاء»"
              : "Request submitted — it will appear for the system owner under Customer requests",
      );
    } catch (err) {
      alert(staffActionErrorMessage(err, isArabic, isArabic ? "تعذر الحفظ" : "Save failed"));
    } finally {
      setBusy("");
    }
  }

  async function deleteCatalogAccount(account: PharmacyLoginAccount) {
    const linkedEmployee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
    const confirmMessage = linkedEmployee
      ? isArabic
        ? `حذف حساب ${account.email}؟ سيتم فك ربطه بالموظف ${linkedEmployee.name}.`
        : `Delete account ${account.email}? It will be unlinked from ${linkedEmployee.name}.`
      : isArabic
        ? `حذف حساب ${account.email}؟`
        : `Delete account ${account.email}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setBusy(`del-${account.id}`);
    try {
      await pharmacyService.deletePharmacyLoginAccount(account.id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحذف" : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  return {
    accountModal,
    setAccountModal,
    editCatalogId,
    setEditCatalogId,
    catalogForm,
    setCatalogForm,
    openLoginAccountsPanel,
    openLoginAccountRequestFromEmployeesPanel,
    openCatalogAccountAdd,
    openCatalogAccountEdit,
    openCatalogAccountDuplicate,
    onCatalogFormRoleChange,
    openPasswordChangeRequest,
    savePasswordChangeRequest,
    saveCatalogAccount,
    deleteCatalogAccount,
  };
}
