import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, PharmacyLoginAccount } from "../types";
import { isSuperAdmin } from "../utils/roles";

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type UsePharmacyLoginAccountsOptions = {
  isArabic: boolean;
  appUser: AppUser | null;
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  setPendingPharmacyLoginAccounts: Dispatch<SetStateAction<PharmacyLoginAccount[]>>;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
};

export function usePharmacyLoginAccounts({
  isArabic,
  appUser,
  pendingPharmacyLoginAccounts,
  setPendingPharmacyLoginAccounts,
  addActivityLog,
}: UsePharmacyLoginAccountsOptions) {
  const handleApprovePharmacyLoginAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;

      const account = await pharmacyService.getPharmacyLoginAccountById(accountId);
      const requestKind = account?.linkRequestPending
        ? "link"
        : account?.editPending
          ? "edit"
          : account?.status === "pending"
            ? "new"
            : null;
      if (!account || !requestKind) {
        alert(
          isArabic ? "الحساب غير موجود أو تمت معالجته" : "Account not found or already processed",
        );
        return false;
      }

      const confirmed = window.confirm(
        requestKind === "link"
          ? isArabic
            ? `ربط حساب ${account.email} بالنظام؟\n\nتأكد من وجود الحساب في Supabase Auth بنفس الإيميل.`
            : `Link account ${account.email} to the system?\n\nEnsure the Auth user exists with the same email.`
          : requestKind === "edit"
            ? isArabic
              ? `اعتماد تعديل حساب ${account.email}؟\n\nالإيميل الجديد: ${account.pendingEmail || account.email}\n\nتأكد من تحديث الحساب في Supabase إن تغيّر الإيميل.`
              : `Approve changes to ${account.email}?\n\nNew email: ${account.pendingEmail || account.email}\n\nUpdate Supabase Auth if the email changed.`
            : isArabic
              ? `اعتماد حساب ${account.email}؟\n\nتأكد من إنشاء الحساب في Supabase إن لزم.`
              : `Approve account ${account.email}?\n\nEnsure the account exists in Supabase if needed.`,
      );
      if (!confirmed) return false;

      try {
        if (requestKind === "link") {
          await pharmacyService.approvePharmacyLoginAccountLink(
            accountId,
            appUser?.uid,
            appUser?.name,
          );
        } else if (requestKind === "edit") {
          await pharmacyService.approvePharmacyLoginAccountEdit(
            accountId,
            appUser?.uid,
            appUser?.name,
          );
        } else {
          await pharmacyService.approvePharmacyLoginAccount(accountId, appUser?.uid, appUser?.name);
        }

        await addActivityLog({
          type: "login_account_request_approved",
          title:
            requestKind === "link"
              ? isArabic
                ? "اعتماد ربط حساب دخول"
                : "Login account link approved"
              : requestKind === "edit"
                ? isArabic
                  ? "اعتماد تعديل حساب دخول"
                  : "Login account edit approved"
                : isArabic
                  ? "اعتماد حساب دخول"
                  : "Login account approved",
          description:
            requestKind === "link"
              ? isArabic
                ? `تم ربط ${account.email}`
                : `Linked ${account.email}`
              : requestKind === "edit"
                ? isArabic
                  ? `تم اعتماد تعديل ${account.email}`
                  : `Approved edit for ${account.email}`
                : isArabic
                  ? `تم اعتماد ${account.email}`
                  : `Approved ${account.email}`,
          referenceType: "pharmacy_login_account",
          referenceId: accountId,
          pharmacyId: account.pharmacyId,
        });

        setPendingPharmacyLoginAccounts(
          await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true }),
        );
        alert(
          requestKind === "link"
            ? isArabic
              ? "تم ربط الحساب"
              : "Account linked"
            : requestKind === "edit"
              ? isArabic
                ? "تم اعتماد التعديل"
                : "Changes approved"
              : isArabic
                ? "تم اعتماد الحساب"
                : "Account approved",
        );
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          isArabic
            ? `تعذر الاعتماد${message ? `: ${message}` : ""}`
            : `Could not approve${message ? `: ${message}` : ""}`,
        );
        return false;
      }
    },
    [addActivityLog, appUser, isArabic, setPendingPharmacyLoginAccounts],
  );

  const handleRejectPharmacyLoginAccount = useCallback(
    async (accountId: string, note?: string): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;

      const account =
        pendingPharmacyLoginAccounts.find((item) => item.id === accountId) ||
        (await pharmacyService.getPharmacyLoginAccountById(accountId));
      const requestKind = account?.linkRequestPending
        ? "link"
        : account?.editPending
          ? "edit"
          : account?.status === "pending"
            ? "new"
            : null;
      if (!account || !requestKind) return false;

      try {
        if (requestKind === "link") {
          await pharmacyService.rejectPharmacyLoginAccountLink(
            accountId,
            appUser?.uid,
            appUser?.name,
            note,
          );
        } else if (requestKind === "edit") {
          await pharmacyService.rejectPharmacyLoginAccountEdit(
            accountId,
            appUser?.uid,
            appUser?.name,
            note,
          );
        } else {
          await pharmacyService.rejectPharmacyLoginAccount(
            accountId,
            appUser?.uid,
            appUser?.name,
            note,
          );
        }

        await addActivityLog({
          type: "login_account_request_rejected",
          title:
            requestKind === "link"
              ? isArabic
                ? "رفض طلب ربط حساب"
                : "Login link request rejected"
              : requestKind === "edit"
                ? isArabic
                  ? "رفض تعديل حساب دخول"
                  : "Login account edit rejected"
                : isArabic
                  ? "رفض حساب دخول"
                  : "Login account rejected",
          description:
            requestKind === "link"
              ? isArabic
                ? `تم رفض ربط ${account.email} — الحساب يبقى غير مربوط`
                : `Rejected link for ${account.email} — account stays unlinked`
              : requestKind === "edit"
                ? isArabic
                  ? `تم رفض تعديل ${account.email} — الحساب يبقى معتمداً`
                  : `Rejected edit for ${account.email} — account stays approved`
                : isArabic
                  ? `تم رفض ${account.email}`
                  : `Rejected ${account.email}`,
          referenceType: "pharmacy_login_account",
          referenceId: accountId,
          pharmacyId: account.pharmacyId,
        });

        setPendingPharmacyLoginAccounts(
          await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true }),
        );
        alert(
          requestKind === "link"
            ? isArabic
              ? "تم رفض طلب الربط"
              : "Link request rejected"
            : requestKind === "edit"
              ? isArabic
                ? "تم رفض التعديل — الحساب ما زال معتمداً"
                : "Edit rejected — account remains approved"
              : isArabic
                ? "تم رفض الحساب"
                : "Account rejected",
        );
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          isArabic
            ? `تعذر الرفض${message ? `: ${message}` : ""}`
            : `Could not reject${message ? `: ${message}` : ""}`,
        );
        return false;
      }
    },
    [
      addActivityLog,
      appUser,
      isArabic,
      pendingPharmacyLoginAccounts,
      setPendingPharmacyLoginAccounts,
    ],
  );

  return {
    handleApprovePharmacyLoginAccount,
    handleRejectPharmacyLoginAccount,
  };
}
