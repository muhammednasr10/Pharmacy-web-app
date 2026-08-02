import StaffEmployeeActionButton from "../../../../components/staff/StaffEmployeeActionButton";
import { resolveBranchDisplay } from "../../../../utils/branchLabel";
import { formatUsageLabel, isPharmacyActive } from "../../helpers";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";

type Props = Pick<
  SuperAdminPageState,
  | "isArabic"
  | "selected"
  | "selectedBranchUsage"
  | "selectedOrgBranches"
  | "deletingBranchId"
  | "creatingBranch"
  | "openAddBranchModal"
  | "openEditBranchModal"
  | "deleteBranch"
>;

export default function ManageTenantBranchesSection({ state }: { state: Props }) {
  const {
    isArabic,
    selected,
    selectedBranchUsage,
    selectedOrgBranches,
    deletingBranchId,
    creatingBranch,
    openAddBranchModal,
    openEditBranchModal,
    deleteBranch,
  } = state;

  if (!selected) return null;

  return (
    <section className="saasManageRolesCard">
      <div className="saasManageLimitsHead">
        <div>
          <h3>{isArabic ? "المخازن / الفروع" : "Warehouses / branches"}</h3>
          <p className="saasManageLimitsHint">
            {selectedBranchUsage
              ? formatUsageLabel(
                  selectedBranchUsage.used,
                  selectedBranchUsage.max,
                  "مخزن",
                  "warehouses",
                  isArabic,
                )
              : ""}
          </p>
        </div>
        <div className="saasManageRolesToolbar">
          <button
            type="button"
            className="smallBtn"
            disabled={!selectedBranchUsage?.canAdd}
            title={
              selectedBranchUsage?.canAdd
                ? undefined
                : isArabic
                  ? "تم الوصول لحد المخازن"
                  : "Warehouse limit reached"
            }
            onClick={openAddBranchModal}
          >
            + {isArabic ? "إضافة فرع" : "Add branch"}
          </button>
        </div>
      </div>
      <div className="tableWrap saasManageBranchesTableWrap">
        <table className="dataTable saasManageBranchesTable">
          <thead>
            <tr>
              <th>{isArabic ? "الفرع" : "Branch"}</th>
              <th className="saasManageBranchPhoneCol">{isArabic ? "رقم التليفون" : "Phone"}</th>
              <th>{isArabic ? "العنوان" : "Address"}</th>
              <th>{isArabic ? "الحالة" : "Status"}</th>
              <th className="saasManageBranchesActionsCol">
                {isArabic ? "إجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {selectedOrgBranches.map((branch) => {
              const canDeleteBranch = selectedOrgBranches.length > 1;
              const display = resolveBranchDisplay(branch.id, selectedOrgBranches, isArabic);
              return (
                <tr
                  key={branch.id}
                  className={branch.id === selected.id ? "saasManageBranchRowCurrent" : undefined}
                >
                  <td className="saasManageBranchNameCell">
                    <strong>{display.branchName}</strong>
                    <code className="saasManageRoleKey" dir="ltr">
                      {branch.id}
                    </code>
                  </td>
                  <td className="saasManageBranchPhoneCell" dir="ltr">
                    {branch.phone || "—"}
                  </td>
                  <td className="saasManageBranchAddressCell">{branch.address || "—"}</td>
                  <td>
                    <span
                      className={`saasManageRoleTag${isPharmacyActive(branch) ? "" : " inactive"}`}
                    >
                      {isPharmacyActive(branch)
                        ? isArabic
                          ? "نشط"
                          : "Active"
                        : isArabic
                          ? "موقوف"
                          : "Suspended"}
                    </span>
                  </td>
                  <td>
                    <div className="saasManageRoleItemActions saasManageBranchesActions">
                      <StaffEmployeeActionButton
                        icon="edit"
                        tone="edit"
                        label={isArabic ? "تعديل الفرع" : "Edit branch"}
                        disabled={!!deletingBranchId || creatingBranch}
                        onClick={() => openEditBranchModal(branch)}
                      />
                      <StaffEmployeeActionButton
                        icon="delete"
                        tone="delete"
                        label={
                          canDeleteBranch
                            ? isArabic
                              ? "حذف الفرع"
                              : "Delete branch"
                            : isArabic
                              ? "لا يمكن حذف آخر فرع"
                              : "Cannot delete the last branch"
                        }
                        disabled={
                          !canDeleteBranch || deletingBranchId === branch.id || creatingBranch
                        }
                        loading={deletingBranchId === branch.id}
                        onClick={() => void deleteBranch(branch)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
