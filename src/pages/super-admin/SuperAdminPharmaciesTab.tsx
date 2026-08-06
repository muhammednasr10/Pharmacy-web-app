import { Fragment } from "react";
import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import {
  getSubscriptionTierLabel,
  parseSubscriptionTier,
} from "../../config/subscriptionTiers";
import { getOrganizationBranchUsage } from "../../utils/branchLimits";
import { getOrganizationUserUsage } from "../../utils/userLimits";
import {
  getPharmacyEndDate,
  getPharmacyStartDate,
  getTierBadgeClass,
  isPharmacyActive,
} from "./helpers";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

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
                    <th>{isArabic ? "الفرع" : "Branch"}</th>
                    <th>{isArabic ? "العنوان" : "Address"}</th>
                    <th>{isArabic ? "الهاتف" : "Phone"}</th>
                    <th>{isArabic ? "الباقة" : "Package"}</th>
                    <th>{isArabic ? "عدد المخازن" : "Warehouses"}</th>
                    <th className="saasDateCol">
                      {isArabic ? "تاريخ بدء الاشتراك" : "Subscription start"}
                    </th>
                    <th className="saasDateCol">
                      {isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription end"}
                    </th>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "المستخدمون" : "Users"}</th>
                    <th>{isArabic ? "حد المستخدمين" : "User limit"}</th>
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
                    const orgUsersCount = getOrganizationUserUsage(
                      systemUsers,
                      pharmacies,
                      pharmacy,
                    ).used;
                    const active = isPharmacyActive(pharmacy);
                    const branchUsage = getOrganizationBranchUsage(pharmacies, pharmacy);
                    const userUsage = getOrganizationUserUsage(systemUsers, pharmacies, pharmacy);

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
                            <strong className="saasOrgPharmacyName">{orgLabel}</strong>
                            {hasChildren ? (
                              <small className="saasSub saasOrgBranchHint">
                                {isArabic
                                  ? `${group.childBranches.length} فرع${group.childBranches.length === 1 ? "" : "اً"} — اضغط للتوسيع`
                                  : `${group.childBranches.length} branch${group.childBranches.length === 1 ? "" : "es"} — click to expand`}
                              </small>
                            ) : null}
                          </td>
                          <td className="saasOrgBranchNameCell">
                            <span className="saasOrgMainSiteBadge">
                              {isArabic ? "المقر الرئيسي" : "Main site"}
                            </span>
                          </td>
                          <td>{pharmacy.address || "—"}</td>
                          <td dir="ltr">{pharmacy.phone || "—"}</td>
                          <td>
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
                          </td>
                          <td>
                            <span className="saasBranchUsed">
                              {branchUsage.used} / {branchUsage.max}
                            </span>
                          </td>
                          <td className="saasDateCell">{getPharmacyStartDate(pharmacy, isArabic)}</td>
                          <td className="saasDateCell">{getPharmacyEndDate(pharmacy, isArabic)}</td>
                          <td>
                            <span className={`saasBadge ${active ? "ok" : "danger"}`}>
                              {active
                                ? isArabic
                                  ? "نشط"
                                  : "Active"
                                : isArabic
                                  ? "موقوف"
                                  : "Suspended"}
                            </span>
                          </td>
                          <td>{orgUsersCount}</td>
                          <td>
                            <span className="saasBranchUsed">
                              {userUsage.used} / {userUsage.max}
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
                              {active ? (
                                <StaffEmployeeActionButton
                                  icon="deactivate"
                                  tone="danger"
                                  label={isArabic ? "إيقاف" : "Suspend"}
                                  onClick={() =>
                                    setStatusTarget({ pharmacy, nextStatus: "suspended" })
                                  }
                                />
                              ) : (
                                <StaffEmployeeActionButton
                                  icon="activate"
                                  tone="success"
                                  label={isArabic ? "تفعيل" : "Activate"}
                                  onClick={() => setStatusTarget({ pharmacy, nextStatus: "active" })}
                                />
                              )}
                              <StaffEmployeeActionButton
                                icon="delete"
                                tone="delete"
                                label={isArabic ? "حذف" : "Delete"}
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
                            const branchUsersCount = systemUsers.filter(
                              (u) => u.pharmacyId === branch.id,
                            ).length;
                            const branchActive = isPharmacyActive(branch);
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
                                  <span className="saasOrgPharmacyNameMuted">{orgLabel}</span>
                                </td>
                                <td className="saasOrgBranchNameCell">
                                  <strong className="saasOrgBranchName">
                                    {isArabic ? branch.name : branch.name_en || branch.name}
                                  </strong>
                                </td>
                                <td>{branch.address || "—"}</td>
                                <td dir="ltr">{branch.phone || "—"}</td>
                                <td className="saasOrgInheritedCell">—</td>
                                <td className="saasOrgInheritedCell">—</td>
                                <td className="saasDateCell saasOrgInheritedCell">—</td>
                                <td className="saasDateCell saasOrgInheritedCell">—</td>
                                <td>
                                  <span className={`saasBadge ${branchActive ? "ok" : "danger"}`}>
                                    {branchActive
                                      ? isArabic
                                        ? "نشط"
                                        : "Active"
                                      : isArabic
                                        ? "موقوف"
                                        : "Suspended"}
                                  </span>
                                </td>
                                <td>{branchUsersCount}</td>
                                <td className="saasOrgInheritedCell">—</td>
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
          </div>
  );
}
