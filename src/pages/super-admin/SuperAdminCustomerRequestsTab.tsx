import { useMemo, useState } from "react";
import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import * as pharmacyService from "../../services/pharmacyService";
import type { PharmacySettings, PharmacySignupRequest } from "../../types";
import { resolveOrganizationId } from "../../utils/branchLimits";
import { getCustomerRequestCategoryLabel } from "../../utils/customerRequests";
import { getRoleLabel } from "../../utils/roles";
import { getSuperAdminSubscriptionWhatsappUrl } from "../../utils/superAdminNotify";
import CustomerRequestInfoModal from "./modals/CustomerRequestInfoModal";
import SignupPackageEditModal, {
  type SignupPackageEditDraft,
} from "./modals/SignupPackageEditModal";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

type InfoCard = {
  title: string;
  fields: Array<{ label: string; value: string; dir?: "ltr" | "rtl" }>;
};

type SignupEditTarget = {
  pharmacy: PharmacySettings;
  signupRequest: PharmacySignupRequest;
};

export default function SuperAdminCustomerRequestsTab({ state }: Props) {
  const {
    isArabic,
    pharmacies,
    pendingCustomerRequestsCount,
    customerRequestFilter,
    setCustomerRequestFilter,
    customerRequestRows,
    onRefreshAdminRequests,
    handleApproveRequest,
    handleRejectRequest,
    handleApproveLoginRequest,
    handleRejectLoginRequest,
    handleRejectSignupRequest,
    handleApproveRoleRequest,
    handleRejectRoleRequest,
    getCustomerRequestResult,
    isCustomerRequestBusy,
    setDeleteTarget,
    onRefreshPharmacies,
  } = state;

  const [infoCard, setInfoCard] = useState<InfoCard | null>(null);
  const [signupEditTarget, setSignupEditTarget] = useState<SignupEditTarget | null>(null);
  const [signupEditSaving, setSignupEditSaving] = useState(false);

  const pharmacyById = useMemo(() => {
    const map = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));
    return map;
  }, [pharmacies]);

  function openPharmacyCard(row: (typeof customerRequestRows)[number]) {
    const signup = row.signupRequest;
    const pharmacy = pharmacyById.get(row.pharmacyId);
    setInfoCard({
      title: isArabic ? "بيانات الصيدلية" : "Pharmacy details",
      fields: [
        {
          label: isArabic ? "الاسم" : "Name",
          value: signup?.pharmacyName || pharmacy?.name || row.pharmacyName || "—",
        },
        {
          label: isArabic ? "العنوان" : "Address",
          value: signup?.address || pharmacy?.address || "—",
        },
        {
          label: isArabic ? "رقم التليفون" : "Phone",
          value: signup?.phone || pharmacy?.phone || "—",
          dir: "ltr",
        },
      ],
    });
  }

  function openRequesterCard(row: (typeof customerRequestRows)[number]) {
    const signup = row.signupRequest;
    const login = row.loginAccount;
    const subscription = row.subscriptionRequest;

    if (signup) {
      setInfoCard({
        title: isArabic ? "بيانات مقدم الطلب" : "Requester details",
        fields: [
          { label: isArabic ? "الاسم" : "Name", value: signup.adminName || "—" },
          { label: isArabic ? "البريد" : "Email", value: signup.email || "—", dir: "ltr" },
          {
            label: isArabic ? "رقم التليفون" : "Phone",
            value: signup.phone || "—",
            dir: "ltr",
          },
        ],
      });
      return;
    }

    if (login) {
      const proposedEmail = login.pendingEmail || login.email;
      const proposedRole = login.pendingRole || login.role;
      const proposedPassword = login.pendingPassword || login.password;
      setInfoCard({
        title: isArabic ? "بيانات مقدم الطلب / الحساب" : "Requester / account details",
        fields: [
          {
            label: isArabic ? "مقدم الطلب" : "Requested by",
            value:
              login.linkRequestedByName ||
              login.editRequestedByName ||
              login.requestedByName ||
              "—",
          },
          { label: isArabic ? "البريد" : "Email", value: proposedEmail || "—", dir: "ltr" },
          {
            label: isArabic ? "الدور" : "Role",
            value: getRoleLabel(proposedRole, isArabic),
          },
          {
            label: isArabic ? "كلمة المرور المقترحة" : "Proposed password",
            value: proposedPassword || "—",
            dir: "ltr",
          },
        ],
      });
      return;
    }

    setInfoCard({
      title: isArabic ? "بيانات مقدم الطلب" : "Requester details",
      fields: [
        {
          label: isArabic ? "الاسم" : "Name",
          value: row.requestedBy || subscription?.requestedByName || "—",
        },
      ],
    });
  }

  return (
    <section className="saasRequestsPanel settingsTabPanel">
      <div className="saasPageHeader">
        <div>
          <h3>{isArabic ? "طلبات العملاء" : "Customer requests"}</h3>
          <p className="pageHint">
            {isArabic
              ? "كل الطلبات الواردة: تسجيل صيدلية جديدة، تجديد اشتراك، ترقية باقة، مستخدمين جدد، وتعديلات/ربط حسابات — طلبات الأدوار في تبويب «أدوار»"
              : "All requests: new pharmacy signups, renewals, upgrades, new users, and account edits/links — role requests are under the Roles tab"}
          </p>
        </div>
        <span className={`saasRequestsCount${pendingCustomerRequestsCount ? " active" : ""}`}>
          {pendingCustomerRequestsCount} {isArabic ? "قيد المراجعة" : "pending"}
        </span>
        <button type="button" className="printBtn" onClick={() => void onRefreshAdminRequests()}>
          {isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      <div
        className="saasCustomerRequestFilters"
        role="tablist"
        aria-label={isArabic ? "تصفية الطلبات" : "Filter requests"}
      >
        {(
          [
            { id: "all" as const, ar: "الكل", en: "All" },
            { id: "signup" as const, ar: "تسجيل جديد", en: "New signup" },
            { id: "subscription" as const, ar: "اشتراك", en: "Subscription" },
            { id: "login" as const, ar: "حسابات دخول", en: "Login accounts" },
          ] as const
        ).map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={customerRequestFilter === filter.id}
            className={`saasCustomerRequestFilterBtn${customerRequestFilter === filter.id ? " active" : ""}`}
            onClick={() => setCustomerRequestFilter(filter.id)}
          >
            {isArabic ? filter.ar : filter.en}
          </button>
        ))}
      </div>

      {customerRequestRows.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد طلبات قيد المراجعة حالياً" : "No pending customer requests"}
        </p>
      ) : (
        <div className="tableWrap">
          <table className="dataTable saasRequestsTable">
            <thead>
              <tr>
                <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                <th>{isArabic ? "التصنيف" : "Category"}</th>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "مقدم الطلب" : "Requested by"}</th>
                <th>{isArabic ? "التاريخ" : "Date"}</th>
                <th>{isArabic ? "الحالة / النتيجة" : "Status / result"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {customerRequestRows.map((row) => {
                const loginAccount = row.loginAccount;
                const subscriptionRequest = row.subscriptionRequest;
                const signupRequest = row.signupRequest;

                return (
                  <tr key={row.key}>
                    <td dir="ltr">
                      <code>{row.requestNumber}</code>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="saasRequestLinkBtn"
                        onClick={() => openPharmacyCard(row)}
                      >
                        <strong>{row.pharmacyName}</strong>
                      </button>
                      <small className="saasSub" dir="ltr">
                        {row.pharmacyId}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          row.category === "subscription"
                            ? "ok"
                            : row.category === "signup"
                              ? "ok"
                              : row.category === "role"
                                ? "warn"
                                : "warn"
                        }`}
                      >
                        {getCustomerRequestCategoryLabel(row.category, isArabic)}
                      </span>
                    </td>
                    <td>{row.typeLabel}</td>
                    <td>
                      {row.requestedBy ? (
                        <button
                          type="button"
                          className="saasRequestLinkBtn"
                          onClick={() => openRequesterCard(row)}
                        >
                          {row.requestedBy}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <strong>{getCustomerRequestResult(row)}</strong>
                    </td>
                    <td>
                      <div className="saasActions">
                        {signupRequest ? (
                          (() => {
                            const pharmacy =
                              (signupRequest.pharmacyId &&
                                pharmacyById.get(signupRequest.pharmacyId)) ||
                              null;
                            if (!pharmacy) {
                              return (
                                <StaffEmployeeActionButton
                                  icon="delete"
                                  tone="delete"
                                  label={isArabic ? "حذف الطلب" : "Delete request"}
                                  disabled={isCustomerRequestBusy(row)}
                                  onClick={() =>
                                    void handleRejectSignupRequest(signupRequest.id)
                                  }
                                />
                              );
                            }
                            return (
                              <>
                                <StaffEmployeeActionButton
                                  icon="edit"
                                  tone="edit"
                                  label={isArabic ? "تعديل الحالة" : "Edit status"}
                                  onClick={() =>
                                    setSignupEditTarget({ pharmacy, signupRequest })
                                  }
                                />
                                <StaffEmployeeActionButton
                                  icon="delete"
                                  tone="delete"
                                  label={isArabic ? "حذف الصيدلية" : "Delete pharmacy"}
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "organization",
                                      organizationId: resolveOrganizationId(pharmacy),
                                      pharmacy,
                                      branchCount: pharmacies.filter(
                                        (item) =>
                                          resolveOrganizationId(item) ===
                                          resolveOrganizationId(pharmacy),
                                      ).length,
                                      signupRequestId: signupRequest.id,
                                    })
                                  }
                                />
                              </>
                            );
                          })()
                        ) : (
                          <>
                            {subscriptionRequest ? (
                              <a
                                className="smallBtn"
                                href={getSuperAdminSubscriptionWhatsappUrl(subscriptionRequest)}
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
                            ) : null}
                            <StaffEmployeeActionButton
                              icon="activate"
                              tone="success"
                              label={isArabic ? "اعتماد" : "Approve"}
                              disabled={isCustomerRequestBusy(row)}
                              onClick={() => {
                                if (subscriptionRequest) {
                                  void handleApproveRequest(subscriptionRequest.id);
                                  return;
                                }
                                if (loginAccount) {
                                  void handleApproveLoginRequest(loginAccount.id);
                                  return;
                                }
                                if (row.customRole) {
                                  void handleApproveRoleRequest(row.customRole.id);
                                }
                              }}
                            />
                            <StaffEmployeeActionButton
                              icon="delete"
                              tone="delete"
                              label={isArabic ? "رفض" : "Reject"}
                              disabled={isCustomerRequestBusy(row)}
                              onClick={() => {
                                if (subscriptionRequest) {
                                  void handleRejectRequest(subscriptionRequest.id);
                                  return;
                                }
                                if (loginAccount) {
                                  void handleRejectLoginRequest(loginAccount.id);
                                  return;
                                }
                                if (row.customRole) {
                                  void handleRejectRoleRequest(row.customRole.id);
                                }
                              }}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {infoCard ? (
        <CustomerRequestInfoModal
          isArabic={isArabic}
          title={infoCard.title}
          fields={infoCard.fields}
          onClose={() => setInfoCard(null)}
        />
      ) : null}

      {signupEditTarget ? (
        <SignupPackageEditModal
          isArabic={isArabic}
          pharmacy={signupEditTarget.pharmacy}
          signupRequest={signupEditTarget.signupRequest}
          saving={signupEditSaving}
          onClose={() => {
            if (!signupEditSaving) setSignupEditTarget(null);
          }}
          onSave={async (draft: SignupPackageEditDraft) => {
            const { pharmacy, signupRequest } = signupEditTarget;
            const organizationId = resolveOrganizationId(pharmacy);
            setSignupEditSaving(true);
            try {
              await pharmacyService.updateOrganizationFreeTrial(organizationId, {
                enabled: true,
                endDate: draft.endDate,
              });
              await pharmacyService.updateOrganizationMaxBranches(
                organizationId,
                draft.maxBranches,
              );
              await pharmacyService.updateOrganizationMaxUsers(organizationId, draft.maxUsers);

              const orgPharmacies = pharmacies.filter(
                (item) => resolveOrganizationId(item) === organizationId,
              );
              await Promise.all(
                orgPharmacies.map((item) =>
                  pharmacyService.updatePharmacySettings(item.id, {
                    staffAddon: draft.staffAddon,
                    customersAddon: draft.customersAddon,
                    investmentAddon: draft.investmentAddon,
                  }),
                ),
              );

              if (draft.status === "suspended") {
                await pharmacyService.updatePharmacyStatus(pharmacy.id, {
                  subscriptionStatus: "suspended",
                  isActive: false,
                });
              }

              await pharmacyService.markPharmacySignupRequestReviewed(
                signupRequest.id,
                draft.status === "suspended" ? "rejected" : "approved",
              );
              await Promise.all([onRefreshPharmacies(), onRefreshAdminRequests()]);
              setSignupEditTarget(null);
              alert(isArabic ? "تم حفظ تعديلات الاشتراك" : "Subscription changes saved");
            } catch (error) {
              const message = error instanceof Error ? error.message : "";
              alert(
                message === "trial_end_date_past"
                  ? isArabic
                    ? "تاريخ الانتهاء يجب أن يكون اليوم أو بعده"
                    : "End date must be today or later"
                  : message ||
                      (isArabic ? "تعذر حفظ التعديلات" : "Could not save changes"),
              );
            } finally {
              setSignupEditSaving(false);
            }
          }}
        />
      ) : null}
    </section>
  );
}
