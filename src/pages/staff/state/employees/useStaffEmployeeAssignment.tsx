import type { Employee } from "../../../../types";
import * as pharmacyService from "../../../../services/pharmacyService";
import { formatLoginAccountSyncError } from "../../../../utils/staffLoginAccountErrors";
import {
  buildPharmacyRoleSelectOptions,
  formatPharmacyGeneralManagerTakenError,
  isPharmacyGeneralManagerRole,
  isPharmacyGeneralManagerSlotTaken,
} from "../../../../utils/pharmacyGeneralManager";
import {
  getRoleLabel,
  isOrgPharmacyAdmin,
  isStaffAssignableLoginAccount,
  isStaffAssignableSystemUser,
  isSuperAdmin,
  parseLoginAccountRole,
} from "../../../../utils/roles";
import {
  employeeLoginAccountOptionsFor,
  employeeSystemUserOptionsFor,
  getEmployeeAssignedAccountId,
  getEmployeeLinkedUserUid,
  getEmployeeSelectedRole,
  isAccountCustomRole,
  staffActionErrorMessage,
} from "../../helpers";
import type { StaffEmployeesParams } from "./types";

type StaffEmployeeAssignmentParams = Pick<
  StaffEmployeesParams,
  | "isArabic"
  | "appUser"
  | "canManage"
  | "canViewLoginAccountsTab"
  | "busy"
  | "setBusy"
  | "employeeById"
  | "catalogByEmployeeId"
  | "generalManagerScope"
  | "loginCatalogByPharmacy"
  | "loginCatalog"
  | "customRoles"
  | "systemUsers"
  | "loadAll"
  | "syncSavedCatalogAccount"
  | "branchCustomRoles"
>;

export function useStaffEmployeeAssignment({
  isArabic,
  appUser,
  canManage,
  canViewLoginAccountsTab,
  busy,
  setBusy,
  employeeById,
  catalogByEmployeeId,
  generalManagerScope,
  loginCatalogByPharmacy,
  loginCatalog,
  customRoles,
  systemUsers,
  loadAll,
  syncSavedCatalogAccount,
  branchCustomRoles,
}: StaffEmployeeAssignmentParams) {
  function employeeRoleOptionsFor(
    targetPharmacyId: string,
    excludeEmployeeId?: string,
    currentRole?: string,
  ): string[] {
    return buildPharmacyRoleSelectOptions({
      pharmacyId: targetPharmacyId,
      customRoles,
      appUser,
      generalManagerScope,
      employeeId: excludeEmployeeId,
      currentRole,
    });
  }

  async function assignEmployeeRole(employee: Employee, roleKey: string) {
    const selectedRole = getEmployeeSelectedRole(employee, catalogByEmployeeId, systemUsers);
    const parsedRole = roleKey ? parseLoginAccountRole(roleKey) : "";

    if (parsedRole === selectedRole) return;

    if (!roleKey) {
      setBusy(`role-emp-${employee.id}`);
      try {
        await pharmacyService.updateEmployee(employee.id, { jobTitle: "" });
        await loadAll();
      } catch (err) {
        alert(err instanceof Error ? err.message : isArabic ? "تعذر تحديث الدور" : "Could not update role");
      } finally {
        setBusy("");
      }
      return;
    }

    if (!employeeRoleOptionsFor(employee.pharmacyId, employee.id, selectedRole).includes(parsedRole)) {
      alert(isArabic ? "الدور غير متاح لهذا الفرع" : "This role is not available for this branch");
      return;
    }

    if (
      isPharmacyGeneralManagerRole(parsedRole) &&
      isPharmacyGeneralManagerSlotTaken(employee.pharmacyId, generalManagerScope, {
        employeeId: employee.id,
      })
    ) {
      alert(formatPharmacyGeneralManagerTakenError(isArabic));
      return;
    }

    setBusy(`role-emp-${employee.id}`);
    try {
      await pharmacyService.updateEmployee(employee.id, { jobTitle: parsedRole });
      await loadAll();

      const syncErrors: string[] = [];
      const linkedUser = systemUsers.find((user) => user.employeeId === employee.id);
      if (
        linkedUser &&
        isStaffAssignableSystemUser(linkedUser) &&
        parseLoginAccountRole(linkedUser.role) !== parsedRole
      ) {
        try {
          await pharmacyService.updateSystemUser(linkedUser.uid, {
            role: parsedRole,
            name: employee.name,
          });
        } catch (syncErr) {
          syncErrors.push(
            syncErr instanceof Error
              ? formatLoginAccountSyncError(syncErr.message, isArabic)
              : isArabic
                ? "تعذر مزامنة الدور مع حساب الدخول"
                : "Could not sync role with login account",
          );
        }
      }

      const linked = catalogByEmployeeId.get(employee.id);
      if (
        linked &&
        isStaffAssignableLoginAccount(linked) &&
        parsedRole &&
        parseLoginAccountRole(linked.role) !== parsedRole
      ) {
        try {
          await pharmacyService.updatePharmacyLoginAccount(linked.id, { role: parsedRole });
          if (linked.status === "approved" && (isSuperAdmin(appUser) || isOrgPharmacyAdmin(appUser))) {
            await syncSavedCatalogAccount(employee.pharmacyId, parsedRole, linked.id);
          }
        } catch (syncErr) {
          syncErrors.push(
            syncErr instanceof Error
              ? formatLoginAccountSyncError(syncErr.message, isArabic)
              : isArabic
                ? "تعذر مزامنة الدور مع سجل حساب الدخول"
                : "Could not sync role with login catalog",
          );
        }
      }

      if (syncErrors.length > 0) {
        alert(
          isArabic
            ? `تم حفظ دور الموظف، لكن: ${syncErrors.join(" — ")}`
            : `Employee role saved, but: ${syncErrors.join(" — ")}`,
        );
      }
    } catch (err) {
      alert(staffActionErrorMessage(err, isArabic, isArabic ? "تعذر تحديث الدور" : "Could not update role"));
    } finally {
      setBusy("");
    }
  }

  function renderEmployeeRoleCell(emp: Employee) {
    const selectedRole = getEmployeeSelectedRole(emp, catalogByEmployeeId, systemUsers);
    const roleOptions = employeeRoleOptionsFor(emp.pharmacyId, emp.id, selectedRole);
    const optionsWithSelected =
      selectedRole && !roleOptions.includes(selectedRole)
        ? [selectedRole, ...roleOptions]
        : roleOptions;
    const rowBusy = busy === `role-emp-${emp.id}`;
    const isSelfEmployeeRow = Boolean(appUser?.employeeId && appUser.employeeId === emp.id);

    if (canManage && !isSelfEmployeeRow) {
      return (
        <select
          className="tableSelect employeeRoleSelect"
          value={selectedRole}
          disabled={rowBusy}
          onChange={(e) => void assignEmployeeRole(emp, e.target.value)}
        >
          <option value="">{isArabic ? "— بدون دور —" : "— No role —"}</option>
          {optionsWithSelected.map((roleKey) => (
            <option key={roleKey} value={roleKey}>
              {getRoleLabel(roleKey, isArabic)}
            </option>
          ))}
          {optionsWithSelected.length === 0 && (
            <option value="" disabled>
              {isArabic
                ? "لا توجد أدوار — أضفها من تبويب «أدوار»"
                : "No roles — add them from the «Roles» tab"}
            </option>
          )}
        </select>
      );
    }

    if (!selectedRole) {
      return <span className="catalogEmptyCell">—</span>;
    }
    if (isSelfEmployeeRow) {
      return (
        <span title={isArabic ? "يُدار من مالك النظام" : "Managed by system owner"}>
          {getRoleLabel(selectedRole, isArabic)}
        </span>
      );
    }
    return getRoleLabel(selectedRole, isArabic);
  }

  async function assignEmployeeLoginAccount(employee: Employee, accountId: string) {
    const targetPharmacyId = employee.pharmacyId;
    const currentAccountId = getEmployeeAssignedAccountId(employee, catalogByEmployeeId);

    if (!accountId) {
      const linked = catalogByEmployeeId.get(employee.id);
      if (!linked) return;
      setBusy(`assign-emp-${employee.id}`);
      try {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(
          linked.id,
          null,
          targetPharmacyId,
        );
        await pharmacyService.updateEmployee(employee.id, { jobTitle: "" });
        await loadAll();
      } catch (err) {
        alert(err instanceof Error ? err.message : isArabic ? "تعذر فك الربط" : "Unlink failed");
      } finally {
        setBusy("");
      }
      return;
    }

    if (accountId === currentAccountId) return;

    const acc = loginCatalog.find((item) => item.id === accountId);
    if (!acc) {
      alert(isArabic ? "الحساب غير موجود" : "Account not found");
      return;
    }
    if (acc.status !== "approved") {
      alert(
        isArabic
          ? "اعتمد حساب الدخول أولاً من زر «حسابات الدخول» أعلى صفحة الموظفين."
          : "Approve this login account first using «Login accounts» at the top of the Staff page.",
      );
      return;
    }
    if (!isStaffAssignableLoginAccount(acc)) {
      alert(
        isArabic
          ? "حساب مالك النظام لا يمكن ربطه بموظف"
          : "System owner account cannot be linked to an employee",
      );
      return;
    }
    if (acc.employeeId && acc.employeeId !== employee.id) {
      const other = employeeById.get(acc.employeeId);
      alert(
        isArabic
          ? `هذا الحساب مربوط بالفعل بالموظف «${other?.name || "آخر"}».`
          : `This account is already assigned to ${other?.name || "another employee"}.`,
      );
      return;
    }

    if (
      isPharmacyGeneralManagerRole(acc.role) &&
      isPharmacyGeneralManagerSlotTaken(targetPharmacyId, generalManagerScope, {
        employeeId: employee.id,
        accountId: acc.id,
      })
    ) {
      alert(formatPharmacyGeneralManagerTakenError(isArabic));
      return;
    }

    setBusy(`assign-emp-${employee.id}`);
    try {
      const previousLinked = catalogByEmployeeId.get(employee.id);
      if (previousLinked && previousLinked.id !== acc.id) {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(
          previousLinked.id,
          null,
          targetPharmacyId,
        );
      }

      await pharmacyService.assignPharmacyLoginAccountToEmployee(
        acc.id,
        employee.id,
        targetPharmacyId,
      );
      await pharmacyService.updateEmployee(employee.id, { jobTitle: acc.role });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "login_account_already_assigned"
          ? isArabic
            ? "هذا الحساب مربوط بموظف آخر"
            : "This account is assigned to another employee"
          : msg === "login_account_email_exists_on_branch"
            ? isArabic
              ? "يوجد حساب بنفس الإيميل على فرع الموظف — احذفه أو اربطه من هناك"
              : "Same email already exists on the employee's branch"
            : msg || (isArabic ? "تعذر الربط" : "Assign failed"),
      );
    } finally {
      setBusy("");
    }
  }

  async function assignEmployeeSystemUser(employee: Employee, uid: string) {
    const targetPharmacyId = employee.pharmacyId;
    const currentLinkedUid = getEmployeeLinkedUserUid(employee, systemUsers);

    if (!uid) {
      if (!currentLinkedUid) return;
      setBusy(`assign-emp-${employee.id}`);
      try {
        await pharmacyService.linkUserToEmployee(currentLinkedUid, null);
        await loadAll();
      } catch (err) {
        alert(err instanceof Error ? err.message : isArabic ? "تعذر فك الربط" : "Unlink failed");
      } finally {
        setBusy("");
      }
      return;
    }

    if (uid === currentLinkedUid) return;

    const user = systemUsers.find((item) => item.uid === uid);
    if (!user) {
      alert(isArabic ? "المستخدم غير موجود" : "User not found");
      return;
    }
    if (!isStaffAssignableSystemUser(user)) {
      alert(
        isArabic
          ? "حساب مالك النظام لا يمكن ربطه بموظف"
          : "System owner account cannot be linked to an employee",
      );
      return;
    }
    if (user.employeeId && user.employeeId !== employee.id) {
      const other = employeeById.get(user.employeeId);
      alert(
        isArabic
          ? `هذا الحساب مربوط بالفعل بالموظف «${other?.name || "آخر"}».`
          : `This account is already assigned to ${other?.name || "another employee"}.`,
      );
      return;
    }

    const role = getEmployeeSelectedRole(employee, catalogByEmployeeId, systemUsers) || user.role;
    if (
      isPharmacyGeneralManagerRole(role) &&
      isPharmacyGeneralManagerSlotTaken(targetPharmacyId, generalManagerScope, {
        employeeId: employee.id,
      })
    ) {
      alert(formatPharmacyGeneralManagerTakenError(isArabic));
      return;
    }

    setBusy(`assign-emp-${employee.id}`);
    try {
      if (currentLinkedUid && currentLinkedUid !== uid) {
        await pharmacyService.linkUserToEmployee(currentLinkedUid, null);
      }

      await pharmacyService.linkUserToEmployee(uid, employee.id);
      await pharmacyService.updateSystemUser(uid, {
        name: employee.name,
        role: parseLoginAccountRole(role),
      });
      if (!employee.jobTitle && role) {
        await pharmacyService.updateEmployee(employee.id, {
          jobTitle: parseLoginAccountRole(role),
        });
      }
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الربط" : "Assign failed");
    } finally {
      setBusy("");
    }
  }

  function renderEmployeeLoginCell(emp: Employee) {
    const accountOptions = employeeSystemUserOptionsFor(
      emp.pharmacyId,
      emp.id,
      systemUsers,
      appUser,
    );
    const rowBusy = busy === `assign-emp-${emp.id}`;
    const selectedUserUid = getEmployeeLinkedUserUid(emp, systemUsers);
    const isSelfEmployeeRow = Boolean(appUser?.employeeId && appUser.employeeId === emp.id);

    if (canViewLoginAccountsTab && !isSelfEmployeeRow) {
      return (
        <select
          className="tableSelect employeeLoginAccountSelect"
          value={selectedUserUid}
          disabled={rowBusy}
          onChange={(e) => void assignEmployeeSystemUser(emp, e.target.value)}
        >
          <option value="">{isArabic ? "— بدون حساب —" : "— No account —"}</option>
          {accountOptions.map((user) => (
            <option key={user.uid} value={user.uid}>
              {user.email}
            </option>
          ))}
          {accountOptions.length === 0 && (
            <option value="" disabled>
              {isArabic
                ? "لا توجد حسابات متاحة — يضيفها مالك النظام من إدارة الصيدليات"
                : "No accounts available — the system owner adds them from Pharmacy Tenants"}
            </option>
          )}
        </select>
      );
    }

    if (isSelfEmployeeRow) {
      const selfUser = systemUsers.find((user) => user.uid === appUser?.uid);
      return (
        <span dir="ltr" title={isArabic ? "يُدار من مالك النظام" : "Managed by system owner"}>
          {selfUser?.email || appUser?.email || "—"}
        </span>
      );
    }

    return <span className="catalogEmptyCell">—</span>;
  }

  return {
    assignEmployeeLoginAccount,
    assignEmployeeRole,
    renderEmployeeRoleCell,
    assignEmployeeSystemUser,
    renderEmployeeLoginCell,
    getEmployeeAssignedAccountId: (employee: Employee) =>
      getEmployeeAssignedAccountId(employee, catalogByEmployeeId),
    getEmployeeLinkedUserUid: (employee: Employee) =>
      getEmployeeLinkedUserUid(employee, systemUsers),
    employeeLoginAccountOptionsFor: (pharmacyId: string, employeeId: string) =>
      employeeLoginAccountOptionsFor(
        pharmacyId,
        employeeId,
        catalogByEmployeeId,
        loginCatalogByPharmacy,
        isArabic,
      ),
    employeeSystemUserOptionsFor: (pharmacyId: string, employeeId: string) =>
      employeeSystemUserOptionsFor(pharmacyId, employeeId, systemUsers, appUser),
    isAccountCustomRole: (roleKey: string) => isAccountCustomRole(roleKey, branchCustomRoles),
    employeeRoleOptionsFor,
    getEmployeeSelectedRole: (emp: Employee) =>
      getEmployeeSelectedRole(emp, catalogByEmployeeId, systemUsers),
  };
}
