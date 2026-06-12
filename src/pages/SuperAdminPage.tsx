import { useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  PharmacyLoginAccount,
  PharmacySettings,
  SubscriptionRequest,
  UserRole,
} from "../types";
import { computeSubscriptionEndDate } from "../config/subscription";
import {
  getSubscriptionTier,
  getSubscriptionTierLabel,
  parseSubscriptionTier,
  subscriptionTierOrder,
  subscriptionTiers,
  type SubscriptionTier,
} from "../config/subscriptionTiers";
import { getOrganizationBranchUsage } from "../utils/branchLimits";
import { getRoleLabel, superAdminRoleOptions } from "../utils/roles";
import { isTierUpgradePlan, parseTierUpgradePlan } from "../utils/subscriptionFeatures";
import { getSuperAdminSubscriptionWhatsappUrl } from "../utils/superAdminNotify";
import SaasAdminStatsPanel from "../components/SaasAdminStatsPanel";

type TenantForm = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  uid: string;
  pharmacyId: string;
};

type SuperAdminPageProps = {
  isArabic: boolean;
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  selectedPharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  onSwitchTenant: (id: string) => void;
  tenantForm: TenantForm;
  onTenantFormChange: (updates: Partial<TenantForm>) => void;
  onResetTenantForm: () => void;
  onCreateTenant: () => Promise<boolean>;
  creatingTenant: boolean;
  userForm: UserForm;
  onUserFormChange: (updates: Partial<UserForm>) => void;
  onResetUserForm: () => void;
  onCreateTenantUser: () => Promise<boolean>;
  creatingTenantUser: boolean;
  onUpdateTenantStatus: (pharmacyId: string, status: "active" | "suspended") => Promise<boolean>;
  onUpdateMaxBranches: (organizationId: string, maxBranches: number) => Promise<boolean>;
  onUpdateSubscriptionTier: (organizationId: string, tier: SubscriptionTier) => Promise<boolean>;
  subscriptionRequests: SubscriptionRequest[];
  onApproveSubscriptionRequest: (requestId: number) => Promise<boolean>;
  onRejectSubscriptionRequest: (requestId: number, note?: string) => Promise<boolean>;
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  onApprovePharmacyLoginAccount: (accountId: string) => Promise<boolean>;
  onRejectPharmacyLoginAccount: (accountId: string, note?: string) => Promise<boolean>;
  onRefreshAdminRequests: () => Promise<void>;
};

function isPharmacyActive(pharmacy: PharmacySettings) {
  const status = pharmacy.subscriptionStatus || "active";
  return (status === "active" || status === "trial") && pharmacy.isActive !== false;
}

export default function SuperAdminPage({
  isArabic,
  pharmacies,
  systemUsers,
  selectedPharmacyId,
  onSelectPharmacy,
  onSwitchTenant,
  tenantForm,
  onTenantFormChange,
  onResetTenantForm,
  onCreateTenant,
  creatingTenant,
  userForm,
  onUserFormChange,
  onResetUserForm,
  onCreateTenantUser,
  creatingTenantUser,
  onUpdateTenantStatus,
  onUpdateMaxBranches,
  onUpdateSubscriptionTier,
  subscriptionRequests,
  onApproveSubscriptionRequest,
  onRejectSubscriptionRequest,
  pendingPharmacyLoginAccounts,
  onApprovePharmacyLoginAccount,
  onRejectPharmacyLoginAccount,
  onRefreshAdminRequests,
}: SuperAdminPageProps) {
  useEffect(() => {
    void onRefreshAdminRequests();
  }, [onRefreshAdminRequests]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    pharmacy: PharmacySettings;
    nextStatus: "active" | "suspended";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const selected = pharmacies.find((p) => p.id === selectedPharmacyId);
  const tenantUsers = systemUsers.filter((u) => u.pharmacyId === selectedPharmacyId);
  const pendingRequests = subscriptionRequests.filter((r) => r.status === "pending");
  const pharmacyNameById = useMemo(() => {
    const map = new Map<string, string>();
    pharmacies.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [pharmacies]);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [loginRequestActionId, setLoginRequestActionId] = useState<string | null>(null);
  const [requestUpdating, setRequestUpdating] = useState(false);
  const [maxBranchDrafts, setMaxBranchDrafts] = useState<Record<string, string>>({});
  const [maxBranchSavingId, setMaxBranchSavingId] = useState<string | null>(null);
  const [tierSavingId, setTierSavingId] = useState<string | null>(null);

  function getTierBadgeClass(tier: SubscriptionTier) {
    if (tier === "premium") return "saasTierBadge premium";
    if (tier === "professional") return "saasTierBadge professional";
    return "saasTierBadge basic";
  }

  async function handleTierChange(pharmacy: PharmacySettings, nextTier: SubscriptionTier) {
    const currentTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    );
    if (nextTier === currentTier) return;

    const usage = getOrganizationBranchUsage(pharmacies, pharmacy);
    const tierMax = getSubscriptionTier(nextTier).maxBranches;
    if (usage.used > tierMax) {
      alert(
        isArabic
          ? `لا يمكن خفض الباقة — الصيدلية تستخدم ${usage.used} فروع والباقة الجديدة تسمح بـ ${tierMax} فقط`
          : `Cannot downgrade — pharmacy uses ${usage.used} branches but the new tier allows only ${tierMax}`,
      );
      return;
    }

    setTierSavingId(usage.organizationId);
    try {
      await onUpdateSubscriptionTier(usage.organizationId, nextTier);
    } finally {
      setTierSavingId(null);
    }
  }

  function getMaxBranchDraft(organizationId: string, fallback: number) {
    return maxBranchDrafts[organizationId] ?? String(fallback);
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
          ? `لا يمكن تقليل الحد عن الفروع الحالية (${currentUsed})`
          : `Cannot set limit below current branches (${currentUsed})`,
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

  function openManage(pharmacyId: string) {
    onSelectPharmacy(pharmacyId);
    setManageModalOpen(true);
  }

  function closeAddModal() {
    setAddModalOpen(false);
    onResetTenantForm();
  }

  async function submitCreateTenant() {
    const ok = await onCreateTenant();
    if (ok) {
      setAddModalOpen(false);
      onResetTenantForm();
    }
  }

  async function submitCreateUser() {
    const ok = await onCreateTenantUser();
    if (ok) {
      setAddUserModalOpen(false);
      onResetUserForm();
    }
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setStatusUpdating(true);
    try {
      const ok = await onUpdateTenantStatus(statusTarget.pharmacy.id, statusTarget.nextStatus);
      if (ok) setStatusTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  }

  function handleViewAsTenant(pharmacyId: string) {
    onSwitchTenant(pharmacyId);
  }

  function getRequestTypeLabel(request: SubscriptionRequest) {
    const targetTier = parseTierUpgradePlan(request.plan);
    if (targetTier) {
      return isArabic
        ? `ترقية إلى ${getSubscriptionTierLabel(targetTier, true)}`
        : `Upgrade to ${getSubscriptionTierLabel(targetTier, false)}`;
    }
    return isArabic ? "تجديد اشتراك" : "Renewal";
  }

  function formatEndDateAfterApproval(request: SubscriptionRequest) {
    const targetTier = parseTierUpgradePlan(request.plan);
    if (targetTier) {
      return getSubscriptionTierLabel(targetTier, isArabic);
    }
    const pharmacy = pharmacies.find((item) => item.id === request.pharmacyId);
    const endDate = computeSubscriptionEndDate(pharmacy?.subscriptionEndDate, request.days);
    return formatPharmacyDate(endDate);
  }

  function formatPharmacyDate(value?: string) {
    if (!value) return "—";

    const normalized = value.includes("T") ? value : `${value}T12:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getPharmacyStartDate(pharmacy: PharmacySettings) {
    return formatPharmacyDate(pharmacy.subscriptionStartedAt || pharmacy.createdAt);
  }

  function getPharmacyEndDate(pharmacy: PharmacySettings) {
    return formatPharmacyDate(pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt);
  }

  return (
    <section className="card saasPage">
      <div className="saasPageHeader">
        <div>
          <h2>{isArabic ? "إدارة الصيدليات (SaaS)" : "Pharmacy Tenants (SaaS)"}</h2>
          <p className="pageHint">
            {isArabic
              ? "كل صيدلية = عميل منفصل. البيانات معزولة عبر pharmacy_id و RLS."
              : "Each pharmacy is an isolated tenant (pharmacy_id + RLS)."}
          </p>
        </div>
        <button
          type="button"
          className="completeBtn saasAddBtn"
          onClick={() => setAddModalOpen(true)}
        >
          + {isArabic ? "إضافة صيدلية" : "Add Pharmacy"}
        </button>
      </div>

      <SaasAdminStatsPanel
        isArabic={isArabic}
        pharmacies={pharmacies}
        systemUsers={systemUsers}
        subscriptionRequests={subscriptionRequests}
        pendingLoginAccountRequests={pendingPharmacyLoginAccounts.length}
        isPharmacyActive={isPharmacyActive}
      />

      <section className="saasRequestsPanel">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "طلبات تجديد الاشتراك" : "Subscription renewal requests"}</h3>
            <p className="pageHint">
              {isArabic
                ? "الطلبات قيد المراجعة فقط — بعد الاعتماد أو الرفض تختفي من هذه القائمة"
                : "Pending requests only — approved or rejected requests are removed from this list"}
            </p>
          </div>
          <span className={`saasRequestsCount${pendingRequests.length ? " active" : ""}`}>
            {pendingRequests.length} {isArabic ? "قيد المراجعة" : "pending"}
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد طلبات قيد المراجعة حالياً" : "No pending subscription requests"}
          </p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable saasRequestsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                  <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "مقدم الطلب" : "Requested by"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "النتيجة بعد الاعتماد" : "Result after approval"}</th>
                  <th>{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td dir="ltr">
                      <code>{request.requestNumber}</code>
                    </td>
                    <td>
                      <strong>{request.pharmacyName || request.pharmacyId}</strong>
                      <small className="saasSub" dir="ltr">
                        {request.pharmacyId}
                      </small>
                    </td>
                    <td>{getRequestTypeLabel(request)}</td>
                    <td>
                      {isTierUpgradePlan(request.plan)
                        ? `${request.amount} ${request.currency || "EGP"}`
                        : `${request.days} ${isArabic ? "يوم" : "days"} · ${request.amount} ${request.currency || "EGP"}`}
                    </td>
                    <td>{request.requestedByName || "—"}</td>
                    <td>
                      {request.createdAt ? new Date(request.createdAt).toLocaleString() : "—"}
                    </td>
                    <td>
                      <strong>{formatEndDateAfterApproval(request)}</strong>
                    </td>
                    <td>
                      <div className="saasActions">
                        <a
                          className="smallBtn"
                          href={getSuperAdminSubscriptionWhatsappUrl(request)}
                          target="_blank"
                          rel="noreferrer"
                          title={
                            isArabic
                              ? "نسخ تفاصيل الطلب على واتساب"
                              : "Share request details on WhatsApp"
                          }
                        >
                          WhatsApp
                        </a>
                        <button
                          type="button"
                          className="smallBtn"
                          disabled={requestUpdating && requestActionId === request.id}
                          onClick={() => void handleApproveRequest(request.id)}
                        >
                          {isArabic ? "اعتماد" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="dangerBtn"
                          disabled={requestUpdating && requestActionId === request.id}
                          onClick={() => void handleRejectRequest(request.id)}
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
        )}
      </section>

      <section className="saasRequestsPanel">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "اعتماد حسابات الدخول" : "Login account approvals"}</h3>
            <p className="pageHint">
              {isArabic
                ? "حسابات جديدة، تعديلات، أو طلبات ربط — اعتمد أو ارفض. رفض التعديل يُبقي الحساب معتمداً، ورفض الربط يُبقيه غير مربوط."
                : "New accounts, edits, or link requests — approve or reject. Rejecting an edit keeps the account approved; rejecting a link keeps it unlinked."}
            </p>
          </div>
          <span
            className={`saasRequestsCount${pendingPharmacyLoginAccounts.length ? " active" : ""}`}
          >
            {pendingPharmacyLoginAccounts.length} {isArabic ? "قيد المراجعة" : "pending"}
          </span>
          <button type="button" className="printBtn" onClick={() => void onRefreshAdminRequests()}>
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>

        {pendingPharmacyLoginAccounts.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد حسابات بانتظار الاعتماد" : "No login accounts awaiting approval"}
          </p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable saasRequestsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "الإيميل" : "Email"}</th>
                  <th>{isArabic ? "كلمة المرور" : "Password"}</th>
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "مقدم الطلب" : "Requested by"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {pendingPharmacyLoginAccounts.map((account) => {
                  const requestKind = account.linkRequestPending
                    ? "link"
                    : account.editPending
                      ? "edit"
                      : "new";
                  const isEditRequest = requestKind === "edit";
                  const proposedEmail = account.pendingEmail || account.email;
                  const proposedPassword = account.pendingPassword || account.password;
                  const proposedRole = account.pendingRole || account.role;

                  return (
                    <tr key={account.id}>
                      <td>
                        <strong>
                          {pharmacyNameById.get(account.pharmacyId) || account.pharmacyId}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            requestKind === "new" ? "ok" : requestKind === "link" ? "warn" : "warn"
                          }`}
                        >
                          {requestKind === "link"
                            ? isArabic
                              ? "ربط"
                              : "Link"
                            : requestKind === "edit"
                              ? isArabic
                                ? "تعديل"
                                : "Edit"
                              : isArabic
                                ? "جديد"
                                : "New"}
                        </span>
                      </td>
                      <td dir="ltr">
                        {isEditRequest && proposedEmail !== account.email ? (
                          <span>
                            {account.email} → <strong>{proposedEmail}</strong>
                          </span>
                        ) : (
                          proposedEmail
                        )}
                      </td>
                      <td dir="ltr">
                        <code>{proposedPassword || "—"}</code>
                      </td>
                      <td>
                        {isEditRequest && proposedRole !== account.role ? (
                          <span>
                            {getRoleLabel(account.role, isArabic)} →{" "}
                            <strong>{getRoleLabel(proposedRole, isArabic)}</strong>
                          </span>
                        ) : (
                          getRoleLabel(proposedRole, isArabic)
                        )}
                      </td>
                      <td>
                        {account.linkRequestedByName ||
                          account.editRequestedByName ||
                          account.requestedByName ||
                          "—"}
                      </td>
                      <td>
                        {account.linkRequestedAt || account.editRequestedAt || account.createdAt
                          ? new Date(
                              account.linkRequestedAt ||
                                account.editRequestedAt ||
                                account.createdAt ||
                                "",
                            ).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        <div className="saasActions">
                          <button
                            type="button"
                            className="smallBtn"
                            disabled={requestUpdating && loginRequestActionId === account.id}
                            onClick={() => void handleApproveLoginRequest(account.id)}
                          >
                            {isArabic ? "اعتماد" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="dangerBtn"
                            disabled={requestUpdating && loginRequestActionId === account.id}
                            onClick={() => void handleRejectLoginRequest(account.id)}
                          >
                            {isArabic ? "رفض" : "Reject"}
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
      </section>

      <section className="saasTierPackages">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "باقات الاشتراك" : "Subscription packages"}</h3>
            <p className="pageHint">
              {isArabic
                ? "اختر الباقة لكل صيدلية من الجدول — يتم ضبط عدد الفروع تلقائياً"
                : "Pick a package per pharmacy in the table — branch limits apply automatically"}
            </p>
          </div>
        </div>
        <div className="saasTierGrid">
          {subscriptionTierOrder.map((tierId) => {
            const tier = subscriptionTiers[tierId];
            return (
              <article key={tierId} className={`saasTierCard ${tierId}`}>
                <div className="saasTierCardHeader">
                  <strong>{isArabic ? tier.labelAr : tier.labelEn}</strong>
                  <span className={getTierBadgeClass(tierId)}>
                    {isArabic ? `${tier.maxBranches} فروع` : `${tier.maxBranches} branches`}
                  </span>
                </div>
                <p>{isArabic ? tier.summaryAr : tier.summaryEn}</p>
                <ul>
                  {(isArabic ? tier.featuresAr : tier.featuresEn).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <div className="tableWrap">
        {pharmacies.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد صيدليات بعد" : "No pharmacies yet"}</p>
        ) : (
          <table className="dataTable saasTable">
            <thead>
              <tr>
                <th>{isArabic ? "المعرف" : "ID"}</th>
                <th>{isArabic ? "الاسم" : "Name"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "الباقة" : "Package"}</th>
                <th>{isArabic ? "الفروع" : "Branches"}</th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ بدء الاشتراك" : "Subscription start"}
                </th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription end"}
                </th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{isArabic ? "المستخدمون" : "Users"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pharmacies.map((pharmacy) => {
                const usersCount = systemUsers.filter((u) => u.pharmacyId === pharmacy.id).length;
                const active = isPharmacyActive(pharmacy);
                const branchUsage = getOrganizationBranchUsage(pharmacies, pharmacy);
                return (
                  <tr
                    key={pharmacy.id}
                    className={selectedPharmacyId === pharmacy.id ? "saasRowSelected" : ""}
                  >
                    <td>
                      <code className="saasId">{pharmacy.id}</code>
                    </td>
                    <td>
                      <strong>
                        {isArabic ? pharmacy.name : pharmacy.name_en || pharmacy.name}
                      </strong>
                      {pharmacy.address ? (
                        <small className="saasSub">{pharmacy.address}</small>
                      ) : null}
                    </td>
                    <td dir="ltr">{pharmacy.phone || "—"}</td>
                    <td>
                      <div className="saasTierCell">
                        <span
                          className={getTierBadgeClass(
                            parseSubscriptionTier(
                              pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
                            ),
                          )}
                        >
                          {getSubscriptionTierLabel(
                            pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
                            isArabic,
                          )}
                        </span>
                        <select
                          className="saasTierSelect"
                          value={parseSubscriptionTier(
                            pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
                          )}
                          disabled={tierSavingId === branchUsage.organizationId}
                          onChange={(e) =>
                            void handleTierChange(pharmacy, e.target.value as SubscriptionTier)
                          }
                        >
                          {subscriptionTierOrder.map((tierId) => (
                            <option key={tierId} value={tierId}>
                              {isArabic
                                ? subscriptionTiers[tierId].labelAr
                                : subscriptionTiers[tierId].labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="saasBranchLimitCell">
                        <span className="saasBranchUsed">
                          {branchUsage.used} / {branchUsage.max}
                        </span>
                        <div className="saasBranchLimitEditor">
                          <input
                            type="number"
                            min={branchUsage.used}
                            className="saasBranchLimitInput"
                            value={getMaxBranchDraft(branchUsage.organizationId, branchUsage.max)}
                            disabled={maxBranchSavingId === branchUsage.organizationId}
                            onChange={(e) =>
                              setMaxBranchDrafts((prev) => ({
                                ...prev,
                                [branchUsage.organizationId]: e.target.value,
                              }))
                            }
                            aria-label={isArabic ? "الحد الأقصى للفروع" : "Max branches"}
                          />
                          <button
                            type="button"
                            className="smallBtn"
                            disabled={maxBranchSavingId === branchUsage.organizationId}
                            onClick={() =>
                              void saveMaxBranches(branchUsage.organizationId, branchUsage.used)
                            }
                          >
                            {maxBranchSavingId === branchUsage.organizationId
                              ? "…"
                              : isArabic
                                ? "حفظ"
                                : "Save"}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="saasDateCell">{getPharmacyStartDate(pharmacy)}</td>
                    <td className="saasDateCell">{getPharmacyEndDate(pharmacy)}</td>
                    <td>
                      <span className={`saasBadge ${active ? "ok" : "danger"}`}>
                        {active ? (isArabic ? "نشط" : "Active") : isArabic ? "موقوف" : "Suspended"}
                      </span>
                    </td>
                    <td>{usersCount}</td>
                    <td>
                      <div className="saasActions">
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => openManage(pharmacy.id)}
                        >
                          {isArabic ? "إدارة" : "Manage"}
                        </button>
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => handleViewAsTenant(pharmacy.id)}
                        >
                          {isArabic ? "عرض" : "View"}
                        </button>
                        {active ? (
                          <button
                            type="button"
                            className="dangerBtn"
                            onClick={() => setStatusTarget({ pharmacy, nextStatus: "suspended" })}
                          >
                            {isArabic ? "إيقاف" : "Suspend"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="smallBtn"
                            onClick={() => setStatusTarget({ pharmacy, nextStatus: "active" })}
                          >
                            {isArabic ? "تفعيل" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addModalOpen && (
        <div className="modalOverlay" onClick={closeAddModal}>
          <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "إضافة صيدلية جديدة" : "Add New Pharmacy"}</h2>
                <p>
                  {isArabic
                    ? "المعرف يستخدم في قاعدة البيانات ولا يمكن تغييره لاحقاً"
                    : "ID is stored in the database and cannot be changed later"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={closeAddModal}>
                ×
              </button>
            </div>

            <div className="formGrid saasFormGrid">
              <label className="saasField">
                <span>{isArabic ? "المعرف (slug)" : "ID (slug)"}</span>
                <input
                  value={tenantForm.id}
                  onChange={(e) => onTenantFormChange({ id: e.target.value })}
                  placeholder="focus-pharmacy"
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "اسم الصيدلية" : "Pharmacy name"}</span>
                <input
                  value={tenantForm.name}
                  onChange={(e) => onTenantFormChange({ name: e.target.value })}
                  placeholder={isArabic ? "صيدلية فوكس" : "Focus Pharmacy"}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
                <input
                  value={tenantForm.name_en}
                  onChange={(e) => onTenantFormChange({ name_en: e.target.value })}
                  placeholder="Focus Pharmacy"
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الهاتف" : "Phone"}</span>
                <input
                  value={tenantForm.phone}
                  onChange={(e) => onTenantFormChange({ phone: e.target.value })}
                  placeholder="01020304050"
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "العنوان" : "Address"}</span>
                <input
                  value={tenantForm.address}
                  onChange={(e) => onTenantFormChange({ address: e.target.value })}
                  placeholder={isArabic ? "القاهرة" : "Cairo"}
                />
              </label>
              <div className="saasField saasFieldFullWidth">
                <span>{isArabic ? "باقة الاشتراك" : "Subscription package"}</span>
                <div className="saasTierPickGrid">
                  {subscriptionTierOrder.map((tierId) => {
                    const tier = subscriptionTiers[tierId];
                    const selected = tenantForm.subscriptionTier === tierId;
                    return (
                      <button
                        key={tierId}
                        type="button"
                        className={`saasTierPickCard ${tierId}${selected ? " selected" : ""}`}
                        onClick={() =>
                          onTenantFormChange({
                            subscriptionTier: tierId,
                            maxBranches: tier.maxBranches,
                          })
                        }
                      >
                        <strong>{isArabic ? tier.labelAr : tier.labelEn}</strong>
                        <small>
                          {isArabic ? `${tier.maxBranches} فروع` : `${tier.maxBranches} branches`}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modalActions saasModalActions">
              <button type="button" className="deleteSmallBtn" onClick={closeAddModal}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={creatingTenant}
                onClick={() => void submitCreateTenant()}
              >
                {creatingTenant
                  ? isArabic
                    ? "جاري الإنشاء..."
                    : "Creating..."
                  : isArabic
                    ? "إنشاء الصيدلية"
                    : "Create Pharmacy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageModalOpen && selected && (
        <div className="modalOverlay" onClick={() => setManageModalOpen(false)}>
          <div
            className="invoiceModal saasModal saasModalWide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "إدارة الصيدلية" : "Manage Pharmacy"} — {selected.name}
                </h2>
                <p>
                  <code dir="ltr">{selected.id}</code>
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={() => setManageModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="saasInfoGrid">
              <div>
                <span>{isArabic ? "الهاتف" : "Phone"}</span>
                <strong dir="ltr">{selected.phone || "—"}</strong>
              </div>
              <div>
                <span>{isArabic ? "الفروع" : "Branches"}</span>
                <strong>
                  {(() => {
                    const usage = getOrganizationBranchUsage(pharmacies, selected);
                    return `${usage.used} / ${usage.max}`;
                  })()}
                </strong>
              </div>
              <div>
                <span>{isArabic ? "الباقة" : "Package"}</span>
                <strong>
                  {getSubscriptionTierLabel(
                    selected.subscriptionTier || selected.subscriptionPlan,
                    isArabic,
                  )}
                </strong>
              </div>
              <div className="saasManageTierField">
                <span>{isArabic ? "تغيير الباقة" : "Change package"}</span>
                <select
                  className="saasTierSelect"
                  value={parseSubscriptionTier(
                    selected.subscriptionTier || selected.subscriptionPlan,
                  )}
                  disabled={
                    tierSavingId === getOrganizationBranchUsage(pharmacies, selected).organizationId
                  }
                  onChange={(e) =>
                    void handleTierChange(selected, e.target.value as SubscriptionTier)
                  }
                >
                  {subscriptionTierOrder.map((tierId) => (
                    <option key={tierId} value={tierId}>
                      {isArabic
                        ? subscriptionTiers[tierId].labelAr
                        : subscriptionTiers[tierId].labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span>{isArabic ? "الحالة" : "Status"}</span>
                <strong>
                  {isPharmacyActive(selected)
                    ? isArabic
                      ? "نشط"
                      : "Active"
                    : isArabic
                      ? "موقوف"
                      : "Suspended"}
                </strong>
              </div>
              <div>
                <span>{isArabic ? "المستخدمون" : "Users"}</span>
                <strong>{tenantUsers.length}</strong>
              </div>
            </div>

            <div className="saasManageToolbar">
              <button
                type="button"
                className="smallBtn"
                onClick={() => {
                  onUserFormChange({ pharmacyId: selected.id });
                  onSelectPharmacy(selected.id);
                  setAddUserModalOpen(true);
                }}
              >
                + {isArabic ? "إضافة مستخدم" : "Add User"}
              </button>
              <button
                type="button"
                className="editBtn"
                onClick={() => handleViewAsTenant(selected.id)}
              >
                {isArabic ? "عرض بيانات الصيدلية" : "View pharmacy data"}
              </button>
            </div>

            {tenantUsers.length === 0 ? (
              <p className="empty">
                {isArabic ? "لا يوجد مستخدمون لهذه الصيدلية" : "No users for this pharmacy"}
              </p>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الاسم" : "Name"}</th>
                      <th>{isArabic ? "البريد" : "Email"}</th>
                      <th>{isArabic ? "الدور" : "Role"}</th>
                      <th>{isArabic ? "نشط" : "Active"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantUsers.map((user) => (
                      <tr key={user.uid}>
                        <td>{user.name}</td>
                        <td dir="ltr">{user.email}</td>
                        <td>{getRoleLabel(user.role, isArabic)}</td>
                        <td>
                          <span className={`saasBadge ${user.isActive ? "ok" : "danger"}`}>
                            {user.isActive ? (isArabic ? "نعم" : "Yes") : isArabic ? "لا" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {addUserModalOpen && selected && (
        <div className="modalOverlay" onClick={() => setAddUserModalOpen(false)}>
          <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "إضافة مستخدم" : "Add User"}</h2>
                <p>
                  {selected.name} (<code dir="ltr">{selected.id}</code>)
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={() => setAddUserModalOpen(false)}>
                ×
              </button>
            </div>

            <p className="loginHint">
              {isArabic
                ? "لربط مستخدم موجود: أنشئه في Supabase → Authentication ثم الصق UID. أو أدخل email + password لحساب جديد."
                : "Link existing Auth user via UID, or use email + password for a new account."}
            </p>

            <div className="formGrid saasFormGrid">
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "الصيدلية" : "Pharmacy"}</span>
                <select
                  value={userForm.pharmacyId || selectedPharmacyId}
                  onChange={(e) => {
                    onSelectPharmacy(e.target.value);
                    onUserFormChange({ pharmacyId: e.target.value });
                  }}
                >
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {(isArabic ? pharmacy.name : pharmacy.name_en) || pharmacy.name} (
                      {pharmacy.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="saasField">
                <span>{isArabic ? "الاسم" : "Name"}</span>
                <input
                  value={userForm.name}
                  onChange={(e) => onUserFormChange({ name: e.target.value })}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "البريد" : "Email"}</span>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => onUserFormChange({ email: e.target.value })}
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "UID (اختياري)" : "UID (optional)"}</span>
                <input
                  value={userForm.uid}
                  onChange={(e) => onUserFormChange({ uid: e.target.value })}
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "كلمة المرور (حساب جديد)" : "Password (new account)"}</span>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => onUserFormChange({ password: e.target.value })}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الدور" : "Role"}</span>
                <select
                  value={userForm.role}
                  onChange={(e) => onUserFormChange({ role: e.target.value as UserRole })}
                >
                  {superAdminRoleOptions
                    .filter((r) => r !== "super_admin")
                    .map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role, isArabic)}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setAddUserModalOpen(false)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={creatingTenantUser}
                onClick={() => void submitCreateUser()}
              >
                {creatingTenantUser
                  ? isArabic
                    ? "جاري الإضافة..."
                    : "Adding..."
                  : isArabic
                    ? "إضافة المستخدم"
                    : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusTarget && (
        <div className="modalOverlay" onClick={() => !statusUpdating && setStatusTarget(null)}>
          <div
            className="invoiceModal saasModal saasConfirmModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {statusTarget.nextStatus === "suspended"
                    ? isArabic
                      ? "إيقاف الصيدلية؟"
                      : "Suspend pharmacy?"
                    : isArabic
                      ? "تفعيل الصيدلية؟"
                      : "Activate pharmacy?"}
                </h2>
                <p>
                  {statusTarget.pharmacy.name} (<code dir="ltr">{statusTarget.pharmacy.id}</code>)
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={statusUpdating}
                onClick={() => setStatusTarget(null)}
              >
                ×
              </button>
            </div>

            <p className="loginHint">
              {statusTarget.nextStatus === "suspended"
                ? isArabic
                  ? "المستخدمون لن يتمكنوا من الدخول حتى تعيد التفعيل."
                  : "Users will not be able to sign in until you reactivate."
                : isArabic
                  ? "سيتمكن مستخدمو الصيدلية من الدخول مرة أخرى."
                  : "Pharmacy users will be able to sign in again."}
            </p>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={statusUpdating}
                onClick={() => setStatusTarget(null)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className={statusTarget.nextStatus === "suspended" ? "dangerBtn" : "completeBtn"}
                disabled={statusUpdating}
                onClick={() => void confirmStatusChange()}
              >
                {statusUpdating
                  ? isArabic
                    ? "جاري التحديث..."
                    : "Updating..."
                  : statusTarget.nextStatus === "suspended"
                    ? isArabic
                      ? "إيقاف"
                      : "Suspend"
                    : isArabic
                      ? "تفعيل"
                      : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
