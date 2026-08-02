import * as pharmacyService from "../../../../services/pharmacyService";
import { formatLoginAccountSyncError } from "../../../../utils/staffLoginAccountErrors";
import { pickCatalogAccountForRole } from "../../../../utils/staffCatalog";
import type { PharmacyLoginAccount, SystemUser, UserRole } from "../../../../types";
import type { StaffLoginCatalogParams } from "./types";

export function useStaffLoginCatalogApproval(params: StaffLoginCatalogParams) {
  const {
    isArabic,
    appUser,
    currentUid,
    onActivityLog,
    setBusy,
    employeeById,
    loadAll,
  } = params;

  async function syncSavedCatalogAccount(
    targetPharmacyId: string,
    role: UserRole,
    accountId?: string | null,
  ) {
    const refreshed = await pharmacyService.getPharmacyLoginAccounts(targetPharmacyId);
    const saved =
      (accountId ? refreshed.find((item) => item.id === accountId) : undefined) ||
      pickCatalogAccountForRole(refreshed, role);
    if (!saved || saved.status !== "approved") return;

    const employee = saved.employeeId ? employeeById.get(saved.employeeId) : undefined;
    await pharmacyService.syncPharmacyLoginAccountToUser(saved, { name: employee?.name });
  }

  async function approveCatalogAccount(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic
        ? `اعتماد حساب ${account.email}؟\n\nتأكد من إنشاء الحساب في Supabase Auth بنفس الإيميل.`
        : `Approve account ${account.email}?\n\nEnsure the Auth user exists with the same email.`,
    );
    if (!confirmed) return;

    setBusy(`approve-account-${account.id}`);
    try {
      await pharmacyService.superAdminApprovePharmacyLoginAccountCatalog(
        account.id,
        appUser?.uid,
        appUser?.name,
      );
      await loadAll();
      alert(isArabic ? "تم اعتماد الحساب" : "Account approved");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر اعتماد الحساب"
            : "Could not approve account",
      );
    } finally {
      setBusy("");
    }
  }

  async function approveCatalogEdit(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic ? `اعتماد تعديل حساب ${account.email}؟` : `Approve changes to ${account.email}?`,
    );
    if (!confirmed) return;

    setBusy(`approve-edit-${account.id}`);
    try {
      await pharmacyService.approvePharmacyLoginAccountEdit(
        account.id,
        appUser?.uid,
        appUser?.name,
      );
      await loadAll();
      alert(isArabic ? "تم اعتماد التعديل" : "Changes approved");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر اعتماد التعديل"
            : "Could not approve changes",
      );
    } finally {
      setBusy("");
    }
  }

  async function approveCatalogLink(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic
        ? `ربط حساب ${account.email} بالنظام؟\n\nتأكد من وجود الحساب في Supabase Auth.`
        : `Link account ${account.email} to the system?\n\nEnsure the Auth user exists in Supabase.`,
    );
    if (!confirmed) return;

    setBusy(`link-approve-${account.id}`);
    try {
      if (account.linkRequestPending) {
        await pharmacyService.approvePharmacyLoginAccountLink(
          account.id,
          appUser?.uid,
          appUser?.name,
        );
      } else {
        const employee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
        await pharmacyService.syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      }
      await loadAll();
      alert(isArabic ? "تم ربط الحساب" : "Account linked");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر ربط الحساب"
            : "Could not link account",
      );
    } finally {
      setBusy("");
    }
  }

  async function unlinkCatalogAccount(account: PharmacyLoginAccount, linkedUser: SystemUser) {
    if (linkedUser.uid === currentUid || linkedUser.uid === appUser?.uid) {
      alert(isArabic ? "لا يمكنك فصل حسابك الحالي" : "You cannot unlink your own account");
      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? `فصل ربط ${account.email}؟\n\nسيتم طرد المستخدم فوراً إن كان متصلاً بالتطبيق.`
        : `Unlink ${account.email}?\n\nThe user will be signed out immediately if online.`,
    );
    if (!confirmed) return;

    setBusy(`unlink-${account.id}`);
    try {
      await pharmacyService.unlinkLoginAccountFromSystem(linkedUser.uid, account.id, appUser?.uid);
      await onActivityLog({
        type: "user_update",
        title: isArabic ? "فصل ربط حساب" : "Account unlinked",
        description: isArabic ? `تم فصل ${account.email}` : `Unlinked ${account.email}`,
        referenceType: "user",
        referenceId: linkedUser.uid,
      });
      await loadAll();
      alert(isArabic ? "تم فصل الربط" : "Account unlinked");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر فصل الربط"
            : "Could not unlink account",
      );
    } finally {
      setBusy("");
    }
  }

  return {
    syncSavedCatalogAccount,
    approveCatalogAccount,
    approveCatalogEdit,
    approveCatalogLink,
    unlinkCatalogAccount,
  };
}
