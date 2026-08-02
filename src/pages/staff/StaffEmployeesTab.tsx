import { EmployeePhotoThumb } from "../../components/staff/EmployeePhotoThumb";
import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import BranchScopeSelect from "../../components/BranchScopeSelect";
import { getShiftDisplayName, type ShiftId } from "../../utils/workSchedule";
import { formatDate } from "./helpers";
import type { EmployeesUsersPageState } from "./useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffEmployeesTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    loading,
    canFilterEmployeesByBranch,
    branchDirectory,
    employeeBranchFilter,
    setEmployeeBranchFilter,
    filteredEmployees,
    showEmployeesBranchColumn,
    branchLabel,
    pharmacyDefaultShiftId,
    pharmacyShifts,
    canViewLoginAccountsTab,
    canManage,
    canManageRolePermissions,
    showOrgHr,
    pharmacies,
    busy,
    renderEmployeeRoleCell,
    renderEmployeeLoginCell,
    isCurrentAppEmployee,
    openPermissionEditorForEmployee,
    openTransferEmployeeModal,
    openEditEmployee,
    toggleEmployeeActive,
    deleteEmployeeRecord,
    setAttendanceBadgeEmployee,
  } = state;

  if (activeTab !== "employees" || loading) return null;

  return (
    <div className="settingsTabPanel">
      {canFilterEmployeesByBranch && (
        <div className="filtersBar staffBranchFilterBar">
          <BranchScopeSelect
            pharmacies={branchDirectory}
            value={employeeBranchFilter}
            onChange={setEmployeeBranchFilter}
            isArabic={isArabic}
            includeAllOption={{
              value: "all",
              label: isArabic ? "كل الفروع" : "All branches",
            }}
          />
        </div>
      )}
      {filteredEmployees.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد موظفون" : "No employees"}</p>
      ) : (
        <div className="tableWrap staffEmployeesTableWrap">
          <table className="staffEmployeesTable">
            <thead>
              <tr>
                {showEmployeesBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "كود الموظف" : "Code"}</th>
                <th className="col-photo">{isArabic ? "الصورة" : "Photo"}</th>
                <th>{isArabic ? "الاسم" : "Name"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "الدور" : "Role"}</th>
                <th>{isArabic ? "الشيفت" : "Shift"}</th>
                <th>{isArabic ? "التعيين" : "Hire date"}</th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                {canViewLoginAccountsTab && (
                  <th>{isArabic ? "حساب الدخول" : "Login account"}</th>
                )}
                {canManage && (
                  <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  {showEmployeesBranchColumn && <td>{branchLabel(emp.pharmacyId)}</td>}
                  <td dir="ltr">
                    <code>{emp.employeeCode || "—"}</code>
                  </td>
                  <td className="col-photo">
                    <EmployeePhotoThumb photoBase64={emp.photoBase64} name={emp.name} />
                  </td>
                  <td>{emp.name}</td>
                  <td>{emp.phone || "—"}</td>
                  <td>{renderEmployeeRoleCell(emp)}</td>
                  <td>
                    {emp.useCustomWorkSchedule
                      ? isArabic
                        ? "مخصص"
                        : "Custom"
                      : getShiftDisplayName(
                          (emp.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
                          pharmacyShifts,
                          isArabic,
                        )}
                  </td>
                  <td>{formatDate(emp.hireDate, isArabic)}</td>
                  <td>
                    <span className={emp.isActive ? "badge ok" : "badge danger"}>
                      {emp.isActive
                        ? isArabic
                          ? "نشط"
                          : "Active"
                        : isArabic
                          ? "موقوف"
                          : "Inactive"}
                    </span>
                  </td>
                  {canViewLoginAccountsTab && <td>{renderEmployeeLoginCell(emp)}</td>}
                  {canManage && (
                    <td className="col-actions">
                      <div
                        className="staffEmployeesActions"
                        role="group"
                        aria-label={isArabic ? "إجراءات الموظف" : "Employee actions"}
                      >
                        {emp.employeeCode && (
                          <StaffEmployeeActionButton
                            icon="qr"
                            tone="primary"
                            label={isArabic ? "بطاقة QR" : "QR badge"}
                            onClick={() => setAttendanceBadgeEmployee(emp)}
                          />
                        )}
                        {canManageRolePermissions && (
                          <StaffEmployeeActionButton
                            icon="permissions"
                            tone="primary"
                            label={
                              isCurrentAppEmployee(emp)
                                ? isArabic
                                  ? "لا يمكن تعديل صلاحياتك"
                                  : "Cannot edit your own permissions"
                                : isArabic
                                  ? "صلاحيات"
                                  : "Permissions"
                            }
                            disabled={!!busy || isCurrentAppEmployee(emp)}
                            onClick={() => openPermissionEditorForEmployee(emp)}
                          />
                        )}
                        {showOrgHr && pharmacies.length > 1 && (
                          <StaffEmployeeActionButton
                            icon="transfer"
                            tone="primary"
                            label={isArabic ? "نقل فرع" : "Transfer branch"}
                            disabled={!!busy}
                            loading={busy === `transfer-emp-${emp.id}`}
                            onClick={() => openTransferEmployeeModal(emp)}
                          />
                        )}
                        <StaffEmployeeActionButton
                          icon="edit"
                          tone="edit"
                          label={isArabic ? "تعديل" : "Edit"}
                          onClick={() => openEditEmployee(emp)}
                        />
                        <StaffEmployeeActionButton
                          icon={emp.isActive ? "deactivate" : "activate"}
                          tone={emp.isActive ? "danger" : "success"}
                          label={
                            emp.isActive
                              ? isArabic
                                ? "تعطيل"
                                : "Deactivate"
                              : isArabic
                                ? "تفعيل"
                                : "Activate"
                          }
                          disabled={!!busy}
                          onClick={() => void toggleEmployeeActive(emp)}
                        />
                        <StaffEmployeeActionButton
                          icon="delete"
                          tone="delete"
                          label={isArabic ? "حذف" : "Delete"}
                          disabled={!!busy}
                          loading={busy === `del-emp-${emp.id}`}
                          onClick={() => void deleteEmployeeRecord(emp)}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
