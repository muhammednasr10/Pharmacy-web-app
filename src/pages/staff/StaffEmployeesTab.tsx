import { EmployeePhotoThumb } from "../../components/staff/EmployeePhotoThumb";
import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import { formatEmployeeShiftLabel } from "./employeeDisplay";
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
    openEmployeeSalaryModal,
    openEmployeeProfileModal,
    toggleEmployeeActive,
    deleteEmployeeRecord,
    setAttendanceBadgeEmployee,
  } = state;

  if (activeTab !== "employees" || loading) return null;

  return (
    <div className="settingsTabPanel">
      {canFilterEmployeesByBranch && branchDirectory.length > 1 ? (
        <div
          className="staffBranchFilterChips"
          role="group"
          aria-label={isArabic ? "تصفية حسب الفرع" : "Filter by branch"}
        >
          <button
            type="button"
            className={`staffBranchFilterChip${employeeBranchFilter === "all" ? " active" : ""}`}
            onClick={() => setEmployeeBranchFilter("all")}
          >
            {isArabic ? "الكل" : "All"}
          </button>
          {branchDirectory.map((branch) => {
            const label = branchLabel(branch.id);
            return (
              <button
                key={branch.id}
                type="button"
                className={`staffBranchFilterChip${employeeBranchFilter === branch.id ? " active" : ""}`}
                onClick={() => setEmployeeBranchFilter(branch.id)}
                title={label}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      {filteredEmployees.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد موظفون" : "No employees"}</p>
      ) : (
        <div className="tableWrap staffEmployeesTableWrap">
          <table className="staffEmployeesTable">
            <thead>
              <tr>
                {showEmployeesBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th className="col-photo">{isArabic ? "الصورة" : "Photo"}</th>
                <th>{isArabic ? "كود الموظف" : "Code"}</th>
                <th>{isArabic ? "الاسم" : "Name"}</th>
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
                  <td className="col-photo">
                    <EmployeePhotoThumb photoBase64={emp.photoBase64} name={emp.name} />
                  </td>
                  <td dir="ltr">
                    <code>{emp.employeeCode || "—"}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="staffEmployeeNameLink"
                      onClick={() => openEmployeeProfileModal(emp)}
                      title={isArabic ? "عرض البيانات الشخصية" : "View personal details"}
                    >
                      {emp.name}
                    </button>
                  </td>
                  <td>{renderEmployeeRoleCell(emp)}</td>
                  <td>
                    {formatEmployeeShiftLabel(
                      emp,
                      pharmacyShifts,
                      pharmacyDefaultShiftId,
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
                          icon="salary"
                          tone="salary"
                          label={isArabic ? "المرتب" : "Salary"}
                          onClick={() => openEmployeeSalaryModal(emp)}
                        />
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
