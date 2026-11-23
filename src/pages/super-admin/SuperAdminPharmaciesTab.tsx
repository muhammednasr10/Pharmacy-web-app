import { Fragment, useMemo, useState } from "react";
import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import { getOrganizationBranchUsage } from "../../utils/branchLimits";
import { getOrganizationUserUsage } from "../../utils/userLimits";
import {
  getPharmacyEndDate,
  getPharmacyStartDate,
  getPharmacySubscriptionDisplayStatus,
  getPharmacySubscriptionStatusLabel,
} from "./helpers";
import SuperAdminInfoCardModal from "./SuperAdminInfoCardModal";
import { resolveOrgManager } from "./resolveOrgManager";
import type { SuperAdminPageState } from "./useSuperAdminPageState";
import type { PharmacySettings } from "../../types";

type Props = { state: SuperAdminPageState };

type InfoCardState =
  | {
      kind: "pharmacy";
      pharmacy: PharmacySettings;
      label: string;
    }
  | {
      kind: "manager";
      pharmacy: PharmacySettings;
      label: string;
    };

export default function SuperAdminPharmaciesTab({ state }: Props) {
  const {
    isArabic,
    pharmacies,
    systemUsers,
    pharmacyOrgGroups,
    expandedOrgIds,
    toggleOrgExpanded,
    selectedPharmacyId,
    openManage,
    handleViewAsTenant,
    setStatusTarget,
    setDeleteTarget,
  } = state;

  const [infoCard, setInfoCard] = useState<InfoCardState | null>(null);

  const managerByOrgId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveOrgManager>>();
    for (const group of pharmacyOrgGroups) {
      map.set(
        group.organizationId,
        resolveOrgManager(systemUsers, pharmacies, group.primary),
      );
    }
    return map;
  }, [pharmacyOrgGroups, systemUsers, pharmacies]);

  const openManager = infoCard?.kind === "manager" ? infoCard : null;
  const openManagerInfo = openManager
    ? resolveOrgManager(systemUsers, pharmacies, openManager.pharmacy) || {
        name: openManager.label,
        phone: "",
        email: "",
      }
    : null;

  return (
    <div className="settingsTabPanel">
      <div className="tableWrap">
        {pharmacies.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد صيدليات بعد" : "No pharmacies yet"}</p>
        ) : (
          <table className="dataTable saasTable">
            <thead>
              <tr>
                <th>{isArabic ? "المعرف" : "ID"}</th>
                <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                <th>{isArabic ? "اسم المدير" : "Manager"}</th>
                <th>{isArabic ? "الفرع" : "Branch"}</th>
                <th>{isArabic ? "حد الفروع" : "Branch limit"}</th>
                <th>{isArabic ? "حد المستخدمين" : "User limit"}</th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ بدء الاشتراك" : "Subscription start"}
                </th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription end"}
                </th>
                <th
                  title={
                    isArabic
                      ? "مفعّل إذا الاشتراك شغال ولم ينتهِ التاريخ ولم يُوقف يدويًا"
                      : "Active only if enabled, not expired, and not manually suspended"
                  }
                >
                  {isArabic ? "حالة الاشتراك" : "Subscription"}
                </th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pharmacyOrgGroups.map((group) => {
                const pharmacy = group.primary;
                const orgLabel = isArabic
                  ? pharmacy.name
                  : pharmacy.name_en || pharmacy.name;
                const hasChildren = group.childBranches.length > 0;
                const expanded = expandedOrgIds[group.organizationId] ?? false;
                const subscriptionStatus = getPharmacySubscriptionDisplayStatus(pharmacy);
                const branchUsage = getOrganizationBranchUsage(pharmacies, pharmacy);
                const userUsage = getOrganizationUserUsage(systemUsers, pharmacies, pharmacy);
                const manager = managerByOrgId.get(group.organizationId);

                return (
                  <Fragment key={group.organizationId}>
                    <tr
                      className={[
                        "saasOrgPrimaryRow",
                        selectedPharmacyId === pharmacy.id ? "saasRowSelected" : "",
                        hasChildren ? "saasOrgExpandableRow" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td>
                        <div className="saasOrgIdCell">
                          {hasChildren ? (
                            <button
                              type="button"
                              className="saasOrgExpandBtn"
                              aria-expanded={expanded}
                              aria-label={
                                isArabic
                                  ? expanded
                                    ? "طي الفروع"
                                    : "عرض الفروع"
                                  : expanded
                                    ? "Collapse branches"
                                    : "Expand branches"
                              }
                              onClick={() => toggleOrgExpanded(group.organizationId)}
                            >
                              <span
                                className={`saasOrgExpandIcon${expanded ? " expanded" : ""}`}
                                aria-hidden
                              >
                                ▶
                              </span>
                            </button>
                          ) : (
                            <span className="saasOrgExpandSpacer" aria-hidden />
                          )}
                          <code className="saasId">{pharmacy.id}</code>
                          <span className="saasOrgRoleBadge primary">
                            {isArabic ? "رئيسية" : "Main"}
                          </span>
                        </div>
                      </td>
                      <td className="saasOrgPharmacyNameCell">
                        <button
                          type="button"
                          className="saasLinkButton saasOrgPharmacyName"
                          onClick={() =>
                            setInfoCard({ kind: "pharmacy", pharmacy, label: orgLabel })
                          }
                        >
                          {orgLabel}
                        </button>
                        {hasChildren ? (
                          <small className="saasSub saasOrgBranchHint">
                            {isArabic
                              ? `${group.childBranches.length} فرع${group.childBranches.length === 1 ? "" : "اً"} — اضغط للتوسيع`
                              : `${group.childBranches.length} branch${group.childBranches.length === 1 ? "" : "es"} — click to expand`}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        {manager ? (
                          <button
                            type="button"
                            className="saasLinkButton"
                            onClick={() =>
                              setInfoCard({
                                kind: "manager",
                                pharmacy,
                                label: manager.name,
                              })
                            }
                          >
                            {manager.name}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="saasOrgBranchNameCell">
                        <span className="saasOrgMainSiteBadge">
                          {isArabic ? "المقر الرئيسي" : "Main site"}
                        </span>
                      </td>
                      <td>
                        <span className="saasBranchUsed">
                          {branchUsage.used} / {branchUsage.max}
                        </span>
                      </td>
                      <td>
                        <span className="saasBranchUsed">
                          {userUsage.used} / {userUsage.max}
                        </span>
                      </td>
                      <td className="saasDateCell">{getPharmacyStartDate(pharmacy, isArabic)}</td>
                      <td className="saasDateCell">{getPharmacyEndDate(pharmacy, isArabic)}</td>
                      <td>
                        <span
                          className={`saasBadge ${
                            subscriptionStatus === "active"
                              ? "ok"
                              : subscriptionStatus === "expired"
                                ? "warn"
                                : "danger"
                          }`}
                          title={
                            subscriptionStatus === "active"
                              ? isArabic
                                ? "الاشتراك مفعّل ولم ينتهِ — الصيدلية تقدر تدخل وتشتغل"
                                : "Subscription enabled and not expired — pharmacy can work"
                              : subscriptionStatus === "expired"
                                ? isArabic
                                  ? "تاريخ الانتهاء عدّى من غير تجديد — الاشتراك غير مفعّل"
                                  : "End date passed without renewal — subscription inactive"
                                : isArabic
                                  ? "الاشتراك موقوف يدويًا — الدخول والعمل متوقفان"
                                  : "Manually suspended — access is blocked"
                          }
                        >
                          {getPharmacySubscriptionStatusLabel(pharmacy, isArabic)}
                        </span>
                      </td>
                      <td>
                        <div className="saasActions">
                          <StaffEmployeeActionButton
                            icon="manage"
                            tone="primary"
                            label={isArabic ? "إدارة" : "Manage"}
                            onClick={() => openManage(pharmacy.id)}
                          />
                          <StaffEmployeeActionButton
                            icon="view"
                            tone="edit"
                            label={isArabic ? "عرض" : "View"}
                            onClick={() => handleViewAsTenant(pharmacy.id)}
                          />
                          {subscriptionStatus === "active" ? (
                            <StaffEmployeeActionButton
                              icon="deactivate"
                              tone="danger"
                              label={isArabic ? "إيقاف الاشتراك" : "Suspend"}
                              onClick={() =>
                                setStatusTarget({ pharmacy, nextStatus: "suspended" })
                              }
                            />
                          ) : subscriptionStatus === "suspended" ? (
                            <StaffEmployeeActionButton
                              icon="activate"
                              tone="success"
                              label={isArabic ? "تفعيل الاشتراك" : "Activate"}
                              onClick={() => setStatusTarget({ pharmacy, nextStatus: "active" })}
                            />
                          ) : null}
                          <StaffEmployeeActionButton
                            icon="delete"
                            tone="delete"
                            label={
                              isArabic
                                ? "حذف الصيدلية بالكامل"
                                : "Delete pharmacy completely"
                            }
                            onClick={() =>
                              setDeleteTarget({
                                kind: "organization",
                                organizationId: group.organizationId,
                                pharmacy,
                                branchCount: group.branches.length,
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                    {expanded &&
                      group.childBranches.map((branch) => {
                        const branchStatus = getPharmacySubscriptionDisplayStatus(branch);
                        return (
                          <tr
                            key={branch.id}
                            className={[
                              "saasOrgBranchRow",
                              selectedPharmacyId === branch.id ? "saasRowSelected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <td>
                              <div className="saasOrgIdCell saasOrgBranchIdCell">
                                <span className="saasOrgBranchConnector" aria-hidden>
                                  └
                                </span>
                                <code className="saasId">{branch.id}</code>
                                <span className="saasOrgRoleBadge branch">
                                  {isArabic ? "فرع" : "Branch"}
                                </span>
                              </div>
                            </td>
                            <td className="saasOrgPharmacyNameCell saasOrgPharmacyNameCellInherited">
                              <button
                                type="button"
                                className="saasLinkButton saasOrgPharmacyNameMuted"
                                onClick={() =>
                                  setInfoCard({
                                    kind: "pharmacy",
                                    pharmacy,
                                    label: orgLabel,
                                  })
                                }
                              >
                                {orgLabel}
                              </button>
                            </td>
                            <td className="saasOrgInheritedCell">
                              {manager ? (
                                <button
                                  type="button"
                                  className="saasLinkButton"
                                  onClick={() =>
                                    setInfoCard({
                                      kind: "manager",
                                      pharmacy,
                                      label: manager.name,
                                    })
                                  }
                                >
                                  {manager.name}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="saasOrgBranchNameCell">
                              <strong className="saasOrgBranchName">
                                {isArabic ? branch.name : branch.name_en || branch.name}
                              </strong>
                            </td>
                            <td className="saasOrgInheritedCell">—</td>
                            <td className="saasOrgInheritedCell">—</td>
                            <td className="saasDateCell saasOrgInheritedCell">—</td>
                            <td className="saasDateCell saasOrgInheritedCell">—</td>
                            <td>
                              <span
                                className={`saasBadge ${
                                  branchStatus === "active"
                                    ? "ok"
                                    : branchStatus === "expired"
                                      ? "warn"
                                      : "danger"
                                }`}
                                title={
                                  branchStatus === "expired"
                                    ? isArabic
                                      ? "تاريخ الانتهاء عدّى — الاشتراك غير مفعّل"
                                      : "End date passed — subscription inactive"
                                    : undefined
                                }
                              >
                                {getPharmacySubscriptionStatusLabel(branch, isArabic)}
                              </span>
                            </td>
                            <td>
                              <div className="saasActions">
                                <StaffEmployeeActionButton
                                  icon="manage"
                                  tone="primary"
                                  label={isArabic ? "إدارة" : "Manage"}
                                  onClick={() => openManage(branch.id)}
                                />
                                <StaffEmployeeActionButton
                                  icon="view"
                                  tone="edit"
                                  label={isArabic ? "عرض" : "View"}
                                  onClick={() => handleViewAsTenant(branch.id)}
                                />
                                <StaffEmployeeActionButton
                                  icon="delete"
                                  tone="delete"
                                  label={isArabic ? "حذف" : "Delete"}
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "branch",
                                      branch,
                                      organizationId: group.organizationId,
                                    })
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {infoCard?.kind === "pharmacy" ? (
        <SuperAdminInfoCardModal
          isArabic={isArabic}
          title={isArabic ? "بيانات الصيدلية" : "Pharmacy details"}
          rows={[
            {
              label: isArabic ? "الاسم" : "Name",
              value: infoCard.label,
            },
            {
              label: isArabic ? "العنوان" : "Address",
              value: infoCard.pharmacy.address || "—",
            },
            {
              label: isArabic ? "التليفون" : "Phone",
              value: infoCard.pharmacy.phone || "—",
              dir: "ltr",
            },
          ]}
          onClose={() => setInfoCard(null)}
        />
      ) : null}

      {openManagerInfo ? (
        <SuperAdminInfoCardModal
          isArabic={isArabic}
          title={isArabic ? "بيانات المدير" : "Manager details"}
          rows={[
            {
              label: isArabic ? "الاسم" : "Name",
              value: openManagerInfo.name || "—",
            },
            {
              label: isArabic ? "التليفون" : "Phone",
              value: openManagerInfo.phone || "—",
              dir: "ltr",
            },
            {
              label: isArabic ? "البريد الإلكتروني" : "Email",
              value: openManagerInfo.email || "—",
              dir: "ltr",
            },
          ]}
          onClose={() => setInfoCard(null)}
        />
      ) : null}
    </div>
  );
}
