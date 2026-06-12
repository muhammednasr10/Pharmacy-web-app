import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, PharmacySettings, SubscriptionRequest } from "../types";
import {
  computeSubscriptionEndDate,
  getTierUpgradeAmount,
  planToSubscriptionPlan,
} from "../config/subscription";
import { getSubscriptionTierLabel, type SubscriptionTier } from "../config/subscriptionTiers";
import { buildTierUpgradePlan, parseTierUpgradePlan } from "../utils/subscriptionFeatures";
import { canRequestSubscription, isOrgPharmacyAdmin, isSuperAdmin } from "../utils/roles";
import type { SettingsFormState } from "../utils/pharmacySettingsForm";

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type UseSubscriptionRequestsOptions = {
  isArabic: boolean;
  appUser: AppUser | null;
  subscriptionRequests: SubscriptionRequest[];
  setSubscriptionRequests: Dispatch<SetStateAction<SubscriptionRequest[]>>;
  branches: PharmacySettings[];
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
  settingsForm: SettingsFormState;
  setSettingsForm: Dispatch<SetStateAction<SettingsFormState>>;
  pharmacySettings: PharmacySettings | null;
  getPharmacyId: () => string;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
};

export function useSubscriptionRequests({
  isArabic,
  appUser,
  subscriptionRequests,
  setSubscriptionRequests,
  branches,
  setBranches,
  settingsForm,
  setSettingsForm,
  pharmacySettings,
  getPharmacyId,
  addActivityLog,
}: UseSubscriptionRequestsOptions) {
  const handleSubmitSubscriptionRequest = useCallback(
    async (input: {
      plan: string;
      days: number;
      amount: number;
    }): Promise<SubscriptionRequest | null> => {
      if (!canRequestSubscription(appUser)) {
        return null;
      }

      const pharmacyId = getPharmacyId();
      const hasPending = subscriptionRequests.some(
        (request) => request.pharmacyId === pharmacyId && request.status === "pending",
      );
      if (hasPending) {
        alert(
          isArabic
            ? "لديك طلب اشتراك قيد المراجعة بالفعل"
            : "You already have a pending subscription request",
        );
        return (
          subscriptionRequests.find(
            (request) => request.pharmacyId === pharmacyId && request.status === "pending",
          ) || null
        );
      }

      try {
        const created = await pharmacyService.createSubscriptionRequest({
          pharmacyId,
          pharmacyName: settingsForm.name || pharmacySettings?.name || pharmacyId,
          plan: input.plan,
          days: input.days,
          amount: input.amount,
          requestedBy: appUser?.uid,
          requestedByName: appUser?.name,
        });

        await addActivityLog({
          type: "subscription_request",
          title: isArabic ? "طلب تجديد اشتراك" : "Subscription renewal requested",
          description: isArabic
            ? `طلب تجديد ${input.days} يوم — ${created.requestNumber}`
            : `Renewal request for ${input.days} days — ${created.requestNumber}`,
          referenceType: "subscription_request",
          referenceId: String(created.id),
        });

        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        alert(
          isArabic
            ? "تم إرسال الطلب. اتبع تعليمات InstaPay لإتمام الدفع."
            : "Request submitted. Follow InstaPay instructions to complete payment.",
        );
        return created;
      } catch (error) {
        console.error(error);
        alert(isArabic ? "تعذر إرسال الطلب" : "Could not submit request");
        return null;
      }
    },
    [
      addActivityLog,
      appUser,
      getPharmacyId,
      isArabic,
      pharmacySettings?.name,
      setSubscriptionRequests,
      settingsForm.name,
      subscriptionRequests,
    ],
  );

  const handleSubmitTierUpgradeRequest = useCallback(
    async (targetTier: SubscriptionTier): Promise<SubscriptionRequest | null> => {
      if (!isOrgPharmacyAdmin(appUser) && !isSuperAdmin(appUser)) {
        return null;
      }

      const pharmacyId = getPharmacyId();
      const hasPending = subscriptionRequests.some(
        (request) => request.pharmacyId === pharmacyId && request.status === "pending",
      );
      if (hasPending) {
        alert(
          isArabic
            ? "لديك طلب اشتراك قيد المراجعة بالفعل"
            : "You already have a pending subscription request",
        );
        return (
          subscriptionRequests.find(
            (request) => request.pharmacyId === pharmacyId && request.status === "pending",
          ) || null
        );
      }

      try {
        const created = await pharmacyService.createSubscriptionRequest({
          pharmacyId,
          pharmacyName: settingsForm.name || pharmacySettings?.name || pharmacyId,
          plan: buildTierUpgradePlan(targetTier),
          days: 0,
          amount: getTierUpgradeAmount(targetTier),
          requestedBy: appUser?.uid,
          requestedByName: appUser?.name,
        });

        await addActivityLog({
          type: "subscription_request",
          title: isArabic ? "طلب ترقية باقة" : "Package upgrade requested",
          description: isArabic
            ? `طلب ترقية إلى ${getSubscriptionTierLabel(targetTier, true)} — ${created.requestNumber} — ${getTierUpgradeAmount(targetTier)} ج.م`
            : `Upgrade request to ${getSubscriptionTierLabel(targetTier, false)} — ${created.requestNumber} — ${getTierUpgradeAmount(targetTier)} EGP`,
          referenceType: "subscription_request",
          referenceId: String(created.id),
        });

        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        return created;
      } catch (error) {
        console.error(error);
        alert(isArabic ? "تعذر إرسال طلب الترقية" : "Could not submit upgrade request");
        return null;
      }
    },
    [
      addActivityLog,
      appUser,
      getPharmacyId,
      isArabic,
      pharmacySettings?.name,
      setSubscriptionRequests,
      settingsForm.name,
      subscriptionRequests,
    ],
  );

  const handleApproveSubscriptionRequest = useCallback(
    async (requestId: number): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;

      const request = subscriptionRequests.find((item) => item.id === requestId);
      if (!request || request.status !== "pending") return false;

      try {
        const pharmacy =
          branches.find((item) => item.id === request.pharmacyId) ||
          (await pharmacyService.getPharmacySettings(request.pharmacyId));

        const targetTier = parseTierUpgradePlan(request.plan);
        if (targetTier) {
          const organizationId = pharmacy?.organizationId || `org-${request.pharmacyId}`;
          await pharmacyService.updateOrganizationSubscriptionTier(
            organizationId,
            targetTier,
            appUser,
          );

          await pharmacyService.updateSubscriptionRequestStatus(requestId, {
            status: "approved",
            reviewedBy: appUser?.uid,
            reviewedByName: appUser?.name,
          });

          await addActivityLog({
            type: "subscription_renew",
            title: isArabic ? "اعتماد ترقية الباقة" : "Package upgrade approved",
            description: isArabic
              ? `تم اعتماد ${request.requestNumber} وترقية الباقة إلى ${getSubscriptionTierLabel(targetTier, true)}`
              : `Approved ${request.requestNumber}, upgraded to ${getSubscriptionTierLabel(targetTier, false)}`,
            referenceType: "subscription_request",
            referenceId: String(requestId),
            pharmacyId: request.pharmacyId,
          });

          setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
          setBranches(await pharmacyService.getPharmacies());
          alert(
            isArabic
              ? `تم اعتماد ترقية الباقة إلى ${getSubscriptionTierLabel(targetTier, true)}`
              : `Package upgraded to ${getSubscriptionTierLabel(targetTier, false)}`,
          );
          return true;
        }

        const newEndDate = computeSubscriptionEndDate(pharmacy?.subscriptionEndDate, request.days);
        const newPlan = planToSubscriptionPlan(request.days);

        await pharmacyService.updatePharmacySettings(request.pharmacyId, {
          subscriptionEndDate: newEndDate,
          subscriptionPlan: newPlan,
          isActive: true,
          subscriptionStatus: "active",
        });

        await pharmacyService.updateSubscriptionRequestStatus(requestId, {
          status: "approved",
          reviewedBy: appUser?.uid,
          reviewedByName: appUser?.name,
        });

        await addActivityLog({
          type: "subscription_renew",
          title: isArabic ? "اعتماد تجديد الاشتراك" : "Subscription renewal approved",
          description: isArabic
            ? `تم اعتماد ${request.requestNumber} وتمديد الاشتراك ${request.days} يوم حتى ${newEndDate}`
            : `Approved ${request.requestNumber}, extended ${request.days} days until ${newEndDate}`,
          referenceType: "subscription_request",
          referenceId: String(requestId),
          pharmacyId: request.pharmacyId,
        });

        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        setBranches((prev) =>
          prev.map((item) =>
            item.id === request.pharmacyId
              ? {
                  ...item,
                  subscriptionEndDate: newEndDate,
                  subscriptionPlan: newPlan,
                  isActive: true,
                  subscriptionStatus: "active",
                }
              : item,
          ),
        );
        setBranches(await pharmacyService.getPharmacies());
        if (request.pharmacyId === getPharmacyId()) {
          setSettingsForm((prev) => ({
            ...prev,
            subscriptionEndDate: newEndDate,
            subscriptionPlan: newPlan,
          }));
        }
        alert(
          isArabic
            ? `تم اعتماد الطلب وتمديد الاشتراك حتى ${newEndDate}`
            : `Request approved. Subscription extended until ${newEndDate}`,
        );
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          isArabic
            ? `تعذر اعتماد الطلب${message ? `: ${message}` : ""}`
            : `Could not approve request${message ? `: ${message}` : ""}`,
        );
        return false;
      }
    },
    [
      addActivityLog,
      appUser,
      branches,
      getPharmacyId,
      isArabic,
      setBranches,
      setSettingsForm,
      setSubscriptionRequests,
      subscriptionRequests,
    ],
  );

  const handleRejectSubscriptionRequest = useCallback(
    async (requestId: number, note?: string): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;

      const request = subscriptionRequests.find((item) => item.id === requestId);
      if (!request || request.status !== "pending") return false;

      try {
        await pharmacyService.updateSubscriptionRequestStatus(requestId, {
          status: "rejected",
          reviewedBy: appUser?.uid,
          reviewedByName: appUser?.name,
          reviewNote: note,
        });

        await addActivityLog({
          type: "subscription_request",
          title: isArabic ? "رفض طلب تجديد" : "Subscription renewal rejected",
          description: isArabic
            ? `تم رفض الطلب ${request.requestNumber}${note ? ` — ${note}` : ""}`
            : `Rejected request ${request.requestNumber}${note ? ` — ${note}` : ""}`,
          referenceType: "subscription_request",
          referenceId: String(requestId),
          pharmacyId: request.pharmacyId,
        });

        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        alert(isArabic ? "تم رفض الطلب" : "Request rejected");
        return true;
      } catch (error) {
        console.error(error);
        alert(isArabic ? "تعذر رفض الطلب" : "Could not reject request");
        return false;
      }
    },
    [addActivityLog, appUser, isArabic, setSubscriptionRequests, subscriptionRequests],
  );

  return {
    handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest,
    handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest,
  };
}
