import { useEffect, useState } from "react";
import type { PharmacySignupRequest, SubscriptionRequest } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  computeSubscriptionEndDate,
} from "../../../config/subscription";
import {
  getSubscriptionTierLabel,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../../../config/subscriptionTiers";
import { parseTierUpgradePlan } from "../../../utils/subscriptionFeatures";
import type { CustomerRequestRow } from "../../../utils/customerRequests";
import { formatPharmacyDate } from "../helpers";
import type { SuperAdminPageProps } from "../types";

type RequestsParams = Pick<SuperAdminPageProps, "isArabic" | "pharmacies"> & {
  onApproveSubscriptionRequest: SuperAdminPageProps["onApproveSubscriptionRequest"];
  onRejectSubscriptionRequest: SuperAdminPageProps["onRejectSubscriptionRequest"];
  onApprovePharmacyLoginAccount: SuperAdminPageProps["onApprovePharmacyLoginAccount"];
  onRejectPharmacyLoginAccount: SuperAdminPageProps["onRejectPharmacyLoginAccount"];
  onApprovePharmacySignupRequest: SuperAdminPageProps["onApprovePharmacySignupRequest"];
  onRejectPharmacySignupRequest: SuperAdminPageProps["onRejectPharmacySignupRequest"];
  onRefreshAdminRequests: SuperAdminPageProps["onRefreshAdminRequests"];
};

export function useSuperAdminRequestsState(params: RequestsParams) {
  const {
    isArabic,
    pharmacies,
    onApproveSubscriptionRequest,
    onRejectSubscriptionRequest,
    onApprovePharmacyLoginAccount,
    onRejectPharmacyLoginAccount,
    onApprovePharmacySignupRequest,
    onRejectPharmacySignupRequest,
    onRefreshAdminRequests,
  } = params;

  useEffect(() => {
    void onRefreshAdminRequests();
  }, [onRefreshAdminRequests]);

  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [loginRequestActionId, setLoginRequestActionId] = useState<string | null>(null);
  const [signupRequestActionId, setSignupRequestActionId] = useState<string | null>(null);
  const [roleRequestActionId, setRoleRequestActionId] = useState<string | null>(null);
  const [requestUpdating, setRequestUpdating] = useState(false);
  const [signupApproveTarget, setSignupApproveTarget] = useState<PharmacySignupRequest | null>(
    null,
  );
  const [signupApproveTier, setSignupApproveTier] = useState<SubscriptionTier>("professional");

  async function handleApproveRequest(requestId: number) {
    setRequestActionId(requestId);
    setRequestUpdating(true);
    try {
      await onApproveSubscriptionRequest(requestId);
    } finally {
      setRequestUpdating(false);
      setRequestActionId(null);
    }
  }

  async function handleRejectRequest(requestId: number) {
    const note = window.prompt(isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):");
    if (note === null) return;
    setRequestActionId(requestId);
    setRequestUpdating(true);
    try {
      await onRejectSubscriptionRequest(requestId, note || undefined);
    } finally {
      setRequestUpdating(false);
      setRequestActionId(null);
    }
  }

  async function handleApproveLoginRequest(accountId: string) {
    setLoginRequestActionId(accountId);
    setRequestUpdating(true);
    try {
      await onApprovePharmacyLoginAccount(accountId);
    } finally {
      setRequestUpdating(false);
      setLoginRequestActionId(null);
    }
  }

  async function handleRejectLoginRequest(accountId: string) {
    const note = window.prompt(isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):");
    if (note === null) return;
    setLoginRequestActionId(accountId);
    setRequestUpdating(true);
    try {
      await onRejectPharmacyLoginAccount(accountId, note || undefined);
    } finally {
      setRequestUpdating(false);
      setLoginRequestActionId(null);
    }
  }

  function openSignupApproveModal(request: PharmacySignupRequest) {
    setSignupApproveTier("professional");
    setSignupApproveTarget(request);
  }

  function closeSignupApproveModal() {
    if (requestUpdating) return;
    setSignupApproveTarget(null);
  }

  async function confirmSignupApprove() {
    if (!signupApproveTarget) return;
    setSignupRequestActionId(signupApproveTarget.id);
    setRequestUpdating(true);
    try {
      const ok = await onApprovePharmacySignupRequest(signupApproveTarget.id, {
        subscriptionTier: signupApproveTier,
      });
      if (ok) setSignupApproveTarget(null);
    } finally {
      setRequestUpdating(false);
      setSignupRequestActionId(null);
    }
  }

  async function handleApproveSignupRequest(request: PharmacySignupRequest) {
    openSignupApproveModal(request);
  }

  async function handleRejectSignupRequest(requestId: string) {
    const note = window.prompt(isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):");
    if (note === null) return;
    setSignupRequestActionId(requestId);
    setRequestUpdating(true);
    try {
      await onRejectPharmacySignupRequest(requestId, note || undefined);
    } finally {
      setRequestUpdating(false);
      setSignupRequestActionId(null);
    }
  }

  async function handleApproveRoleRequest(roleId: string) {
    setRoleRequestActionId(roleId);
    setRequestUpdating(true);
    try {
      await pharmacyService.activatePharmacyCustomRole(roleId);
      await onRefreshAdminRequests();
      alert(isArabic ? "تم اعتماد الدور" : "Role approved");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الاعتماد" : "Could not approve");
    } finally {
      setRequestUpdating(false);
      setRoleRequestActionId(null);
    }
  }

  async function handleRejectRoleRequest(roleId: string) {
    const confirmed = window.confirm(
      isArabic ? "رفض طلب الدور وحذفه؟" : "Reject this role request and delete it?",
    );
    if (!confirmed) return;
    setRoleRequestActionId(roleId);
    setRequestUpdating(true);
    try {
      await pharmacyService.deletePharmacyCustomRole(roleId);
      await onRefreshAdminRequests();
      alert(isArabic ? "تم رفض الطلب" : "Request rejected");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الرفض" : "Could not reject");
    } finally {
      setRequestUpdating(false);
      setRoleRequestActionId(null);
    }
  }

  function formatEndDateAfterApproval(request: SubscriptionRequest) {
    const targetTier = parseTierUpgradePlan(request.plan);
    if (targetTier) {
      return getSubscriptionTierLabel(targetTier, isArabic);
    }
    const pharmacy = pharmacies.find((item) => item.id === request.pharmacyId);
    const endDate = computeSubscriptionEndDate(pharmacy?.subscriptionEndDate, request.days);
    return formatPharmacyDate(endDate, isArabic);
  }

  function getCustomerRequestResult(row: CustomerRequestRow) {
    if (row.signupRequest) {
      return row.resultAfterApproval || (isArabic ? "فتح صيدلية جديدة" : "Create new pharmacy");
    }
    if (row.subscriptionRequest) {
      return formatEndDateAfterApproval(row.subscriptionRequest);
    }
    if (row.customRole) {
      return isArabic ? "دور معتمد ومتاح للاستخدام" : "Approved role available for use";
    }
    const account = row.loginAccount;
    if (!account) return "—";
    const kind = account.linkRequestPending ? "link" : account.editPending ? "edit" : "new";
    if (kind === "link") {
      return isArabic ? "ربط الحساب بالموظف" : "Account linked to employee";
    }
    if (kind === "edit") {
      return isArabic ? "تطبيق التعديلات" : "Apply pending changes";
    }
    return isArabic ? "حساب دخول معتمد" : "Approved login account";
  }

  function isCustomerRequestBusy(row: CustomerRequestRow) {
    if (!requestUpdating) return false;
    if (row.signupRequest) return signupRequestActionId === row.signupRequest.id;
    if (row.subscriptionRequest) return requestActionId === row.subscriptionRequest.id;
    if (row.loginAccount) return loginRequestActionId === row.loginAccount.id;
    if (row.customRole) return roleRequestActionId === row.customRole.id;
    return false;
  }

  return {
    requestUpdating,
    signupApproveTarget,
    signupApproveTier,
    setSignupApproveTier,
    closeSignupApproveModal,
    confirmSignupApprove,
    handleApproveRequest,
    handleRejectRequest,
    handleApproveLoginRequest,
    handleRejectLoginRequest,
    handleApproveSignupRequest,
    handleRejectSignupRequest,
    handleApproveRoleRequest,
    handleRejectRoleRequest,
    formatEndDateAfterApproval,
    getCustomerRequestResult,
    isCustomerRequestBusy,
  };
}
