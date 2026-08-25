import { useMemo, useState } from "react";
import { getBranchLabel } from "../../../utils/branchLabel";
import { groupPharmaciesByOrganization } from "../../../utils/branchLimits";
import {
  buildCustomerRequestRows,
  type CustomerRequestFilter,
} from "../../../utils/customerRequests";
import type {
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacySignupRequest,
  SubscriptionRequest,
} from "../../../types";
import type { SaasTab } from "../types";
import type { SuperAdminSharedContext } from "./shared";

type OverviewParams = Pick<SuperAdminSharedContext, "isArabic" | "pharmacies"> & {
  subscriptionRequests: SubscriptionRequest[];
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  pendingPharmacySignupRequests: PharmacySignupRequest[];
  pendingCustomRoles: PharmacyCustomRole[];
};

export function useSuperAdminOverviewState(params: OverviewParams) {
  const {
    isArabic,
    pharmacies,
    subscriptionRequests,
    pendingPharmacyLoginAccounts,
    pendingPharmacySignupRequests,
    pendingCustomRoles,
  } = params;

  const [activeTab, setActiveTab] = useState<SaasTab>("pharmacies");
  const [customerRequestFilter, setCustomerRequestFilter] = useState<CustomerRequestFilter>("all");
  const [expandedOrgIds, setExpandedOrgIds] = useState<Record<string, boolean>>({});

  const pendingSubscriptionRequests = useMemo(
    () => subscriptionRequests.filter((request) => request.status === "pending"),
    [subscriptionRequests],
  );
  const pendingCustomerRequestsCount =
    pendingSubscriptionRequests.length +
    pendingPharmacyLoginAccounts.length +
    pendingPharmacySignupRequests.length +
    pendingCustomRoles.length;

  const pharmacyNameById = useMemo(() => {
    const map = new Map<string, string>();
    pharmacies.forEach((pharmacy) => {
      map.set(pharmacy.id, getBranchLabel(pharmacy.id, pharmacies, isArabic));
    });
    return map;
  }, [pharmacies, isArabic]);

  const pharmacyOrgGroups = useMemo(
    () => groupPharmaciesByOrganization(pharmacies),
    [pharmacies],
  );

  function toggleOrgExpanded(organizationId: string) {
    setExpandedOrgIds((prev) => ({ ...prev, [organizationId]: !prev[organizationId] }));
  }

  const saasTabs = useMemo(
    () => [
      { id: "pharmacies" as const, ar: "الصيدليات", en: "Pharmacies" },
      { id: "roles" as const, ar: "أدوار", en: "Roles" },
      { id: "overview" as const, ar: "ملخص", en: "Overview" },
      {
        id: "customerRequests" as const,
        ar: "طلبات العملاء",
        en: "Customer requests",
        badge: pendingCustomerRequestsCount,
      },
      { id: "packages" as const, ar: "الباقات", en: "Packages" },
    ],
    [pendingCustomerRequestsCount],
  );

  const customerRequestRows = useMemo(
    () =>
      buildCustomerRequestRows({
        subscriptionRequests,
        loginAccounts: pendingPharmacyLoginAccounts,
        customRoles: pendingCustomRoles,
        signupRequests: pendingPharmacySignupRequests,
        pharmacyNameById,
        isArabic,
        filter: customerRequestFilter,
      }),
    [
      subscriptionRequests,
      pendingPharmacyLoginAccounts,
      pendingPharmacySignupRequests,
      pendingCustomRoles,
      pharmacyNameById,
      isArabic,
      customerRequestFilter,
    ],
  );

  return {
    activeTab,
    setActiveTab,
    customerRequestFilter,
    setCustomerRequestFilter,
    expandedOrgIds,
    setExpandedOrgIds,
    pendingCustomerRequestsCount,
    pharmacyNameById,
    pharmacyOrgGroups,
    saasTabs,
    customerRequestRows,
    toggleOrgExpanded,
  };
}
