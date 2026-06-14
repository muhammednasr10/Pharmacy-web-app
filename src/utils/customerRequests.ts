import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import type { PharmacyLoginAccount, SubscriptionRequest } from "../types";
import { getRoleLabel } from "./roles";
import { isTierUpgradePlan, parseTierUpgradePlan } from "./subscriptionFeatures";

export type CustomerRequestCategory = "subscription" | "login";

export type CustomerRequestFilter = "all" | CustomerRequestCategory;

export type CustomerRequestRow = {
  key: string;
  category: CustomerRequestCategory;
  pharmacyId: string;
  pharmacyName: string;
  requestNumber: string;
  typeLabel: string;
  details: string;
  requestedBy?: string;
  createdAt?: string;
  resultAfterApproval?: string;
  subscriptionRequest?: SubscriptionRequest;
  loginAccount?: PharmacyLoginAccount;
};

export function getSubscriptionRequestTypeLabel(
  request: SubscriptionRequest,
  isArabic: boolean,
): string {
  const targetTier = parseTierUpgradePlan(request.plan);
  if (targetTier) {
    return isArabic
      ? `ترقية باقة → ${getSubscriptionTierLabel(targetTier, true)}`
      : `Package upgrade → ${getSubscriptionTierLabel(targetTier, false)}`;
  }
  return isArabic ? "تجديد اشتراك" : "Subscription renewal";
}

export function getSubscriptionRequestDetails(
  request: SubscriptionRequest,
  isArabic: boolean,
): string {
  if (isTierUpgradePlan(request.plan)) {
    return `${request.amount} ${request.currency || "EGP"}`;
  }
  return `${request.days} ${isArabic ? "يوم" : "days"} · ${request.amount} ${request.currency || "EGP"}`;
}

export function getLoginAccountRequestKind(account: PharmacyLoginAccount) {
  if (account.linkRequestPending) return "link" as const;
  if (account.editPending) return "edit" as const;
  return "new" as const;
}

export function getLoginAccountRequestTypeLabel(
  account: PharmacyLoginAccount,
  isArabic: boolean,
): string {
  const kind = getLoginAccountRequestKind(account);
  if (kind === "link") return isArabic ? "ربط حساب بموظف" : "Link account to employee";
  if (kind === "edit") return isArabic ? "تعديل حساب دخول" : "Edit login account";
  return isArabic ? "حساب دخول جديد" : "New login account";
}

export function getLoginAccountRequestDetails(
  account: PharmacyLoginAccount,
  isArabic: boolean,
): string {
  const kind = getLoginAccountRequestKind(account);
  const proposedEmail = account.pendingEmail || account.email;
  const proposedRole = account.pendingRole || account.role;

  if (kind === "edit") {
    const parts = [proposedEmail];
    if (account.pendingRole && account.pendingRole !== account.role) {
      parts.push(getRoleLabel(proposedRole, isArabic));
    }
    return parts.join(" · ");
  }

  return `${proposedEmail} · ${getRoleLabel(proposedRole, isArabic)}`;
}

export function buildCustomerRequestRows(input: {
  subscriptionRequests: SubscriptionRequest[];
  loginAccounts: PharmacyLoginAccount[];
  pharmacyNameById: Map<string, string>;
  isArabic: boolean;
  filter?: CustomerRequestFilter;
}): CustomerRequestRow[] {
  const {
    subscriptionRequests,
    loginAccounts,
    pharmacyNameById,
    isArabic,
    filter = "all",
  } = input;

  const rows: CustomerRequestRow[] = [];

  if (filter === "all" || filter === "subscription") {
    subscriptionRequests
      .filter((request) => request.status === "pending")
      .forEach((request) => {
        rows.push({
          key: `sub-${request.id}`,
          category: "subscription",
          pharmacyId: request.pharmacyId,
          pharmacyName: request.pharmacyName || pharmacyNameById.get(request.pharmacyId) || request.pharmacyId,
          requestNumber: request.requestNumber,
          typeLabel: getSubscriptionRequestTypeLabel(request, isArabic),
          details: getSubscriptionRequestDetails(request, isArabic),
          requestedBy: request.requestedByName,
          createdAt: request.createdAt,
          subscriptionRequest: request,
        });
      });
  }

  if (filter === "all" || filter === "login") {
    loginAccounts.forEach((account) => {
      rows.push({
        key: `login-${account.id}`,
        category: "login",
        pharmacyId: account.pharmacyId,
        pharmacyName: pharmacyNameById.get(account.pharmacyId) || account.pharmacyId,
        requestNumber: account.id.slice(0, 8).toUpperCase(),
        typeLabel: getLoginAccountRequestTypeLabel(account, isArabic),
        details: getLoginAccountRequestDetails(account, isArabic),
        requestedBy:
          account.linkRequestedByName ||
          account.editRequestedByName ||
          account.requestedByName,
        createdAt: account.linkRequestedAt || account.editRequestedAt || account.createdAt,
        loginAccount: account,
      });
    });
  }

  return rows.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

export function getCustomerRequestCategoryLabel(
  category: CustomerRequestCategory,
  isArabic: boolean,
): string {
  if (category === "subscription") {
    return isArabic ? "اشتراك" : "Subscription";
  }
  return isArabic ? "حساب دخول" : "Login account";
}
