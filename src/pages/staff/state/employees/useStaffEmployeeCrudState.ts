import { useState } from "react";
import type { Employee } from "../../../../types";
import * as pharmacyService from "../../../../services/pharmacyService";
import type { WorkSchedule } from "../../../../utils/workSchedule";
import { emptyEmployeeForm } from "../../types";
import {
  applyWorkScheduleToForm,
  buildEmployeeSavePayload,
  createEmployeeFormForAdd,
  employeeRecordToForm,
} from "./employeeFormMappers";
import type { StaffEmployeesParams } from "./types";
import { useStaffEmployeeTransferActions } from "./useStaffEmployeeTransferActions";
import { useStaffPharmacyShifts } from "./useStaffPharmacyShifts";

type StaffEmployeeCrudParams = Pick<
  StaffEmployeesParams,
  | "isArabic"
  | "appUser"
  | "pharmacyId"
  | "pharmacies"
  | "onActivityLog"
  | "showOrgHrManage"
  | "setBusy"
  | "branchLabel"
  | "employeeById"
  | "catalogByEmployeeId"
  | "systemUsers"
  | "loadAll"
> & {
  onEmployeeDeleted?: (employeeId: string) => void;
};

export function useStaffEmployeeCrudState({
  isArabic,
  appUser,
  pharmacyId,
  pharmacies,
  onActivityLog,
  showOrgHrManage,
  setBusy,
  branchLabel,
  employeeById,
  catalogByEmployeeId,
  systemUsers,
  loadAll,
  onEmployeeDeleted,
}: StaffEmployeeCrudParams) {
  const [employeeModal, setEmployeeModal] = useState<"add" | "edit" | null>(null);
  const [attendanceBadgeEmployee, setAttendanceBadgeEmployee] = useState<Employee | null>(null);
  const [profileModalEmployee, setProfileModalEmployee] = useState<Employee | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const { pharmacyShifts, pharmacyDefaultShiftId } = useStaffPharmacyShifts(pharmacyId);
  const transfer = useStaffEmployeeTransferActions({
    isArabic,
    pharmacies,
    onActivityLog,
    setBusy,
    branchLabel,
    catalogByEmployeeId,
    loadAll,
  });

  function openAddEmployee() {
    setEditEmployeeId(null);
    const defaultPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
    setEmployeeForm(
      createEmployeeFormForAdd({
        pharmacyId: defaultPharmacyId,
        pharmacyShifts,
        pharmacyDefaultShiftId,
      }),
    );
    setEmployeeModal("add");
    void pharmacyService.suggestNextEmployeeCode(defaultPharmacyId).then((code) => {
      setEmployeeForm((prev) => ({ ...prev, employeeCode: code }));
    });
  }

  function openEditEmployee(employee: Employee) {
    setEditEmployeeId(employee.id);
    setEmployeeForm(employeeRecordToForm(employee, pharmacyShifts, pharmacyDefaultShiftId));
    setEmployeeModal("edit");
  }

  function updateEmployeeWorkSchedule(schedule: WorkSchedule) {
    setEmployeeForm((prev) => applyWorkScheduleToForm(prev, schedule));
  }

  async function saveEmployee() {
    if (!employeeForm.name.trim()) {
      alert(isArabic ? "أدخل اسم الموظف" : "Enter employee name");
      return;
    }

    setBusy("save-employee");
    try {
      const targetPharmacyId =
        (showOrgHrManage && employeeForm.pharmacyId) || pharmacyId || appUser?.pharmacyId || "main";
      const payload = buildEmployeeSavePayload(employeeForm, {
        targetPharmacyId,
        pharmacyShifts,
        pharmacyDefaultShiftId,
      });

      let savedEmployee: Employee;

      if (employeeModal === "edit" && editEmployeeId) {
        await pharmacyService.updateEmployee(editEmployeeId, payload);
        savedEmployee = { ...employeeById.get(editEmployeeId)!, ...payload, id: editEmployeeId };
        await onActivityLog({
          type: "employee_update",
          title: isArabic ? "تعديل موظف" : "Employee Updated",
          description: isArabic
            ? `تم تعديل بيانات الموظف ${payload.name}`
            : `Employee ${payload.name} was updated`,
          referenceType: "employee",
          referenceId: editEmployeeId,
        });
      } else {
        savedEmployee = await pharmacyService.createEmployee(payload);
        await onActivityLog({
          type: "employee_create",
          title: isArabic ? "إضافة موظف" : "Employee Added",
          description: isArabic
            ? `تم إضافة الموظف ${payload.name}`
            : `Employee ${payload.name} was added`,
          referenceType: "employee",
          referenceId: savedEmployee.id,
        });
      }

      setEmployeeModal(null);
      await loadAll();
      alert(isArabic ? "تم الحفظ" : "Saved");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setBusy("");
    }
  }

  async function deleteEmployeeRecord(employee: Employee) {
    const linkedAccount = catalogByEmployeeId.get(employee.id);
    const linkedUser = systemUsers.find((user) => user.employeeId === employee.id);
    let confirmMessage = isArabic
      ? `حذف الموظف «${employee.name}» نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Permanently delete employee "${employee.name}"? This cannot be undone.`;
    if (linkedAccount) {
      confirmMessage += isArabic
        ? `\n\nسيتم فك ربط حساب الدخول ${linkedAccount.email}.`
        : `\n\nLogin account ${linkedAccount.email} will be unlinked.`;
    }
    if (linkedUser) {
      confirmMessage += isArabic
        ? `\nسيتم فك ربط المستخدم ${linkedUser.email || linkedUser.name}.`
        : `\nUser ${linkedUser.email || linkedUser.name} will be unlinked.`;
    }
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBusy(`del-emp-${employee.id}`);
    try {
      await pharmacyService.deleteEmployee(employee.id);
      await onActivityLog({
        type: "employee_delete",
        title: isArabic ? "حذف موظف" : "Employee Deleted",
        description: employee.name,
        referenceType: "employee",
        referenceId: employee.id,
      });
      if (editEmployeeId === employee.id) {
        setEmployeeModal(null);
        setEditEmployeeId(null);
      }
      if (attendanceBadgeEmployee?.id === employee.id) {
        setAttendanceBadgeEmployee(null);
      }
      if (profileModalEmployee?.id === employee.id) {
        setProfileModalEmployee(null);
      }
      onEmployeeDeleted?.(employee.id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحذف" : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  async function toggleEmployeeActive(employee: Employee) {
    setBusy(`emp-${employee.id}`);
    try {
      const next = !employee.isActive;
      await pharmacyService.setEmployeeActive(employee.id, next);
      await onActivityLog({
        type: next ? "employee_activate" : "employee_deactivate",
        title: next
          ? isArabic
            ? "تفعيل موظف"
            : "Employee Activated"
          : isArabic
            ? "تعطيل موظف"
            : "Employee Deactivated",
        description: `${employee.name}`,
        referenceType: "employee",
        referenceId: employee.id,
      });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  return {
    employeeModal,
    setEmployeeModal,
    attendanceBadgeEmployee,
    setAttendanceBadgeEmployee,
    profileModalEmployee,
    setProfileModalEmployee,
    openEmployeeProfileModal: setProfileModalEmployee,
    closeEmployeeProfileModal: () => setProfileModalEmployee(null),
    editEmployeeId,
    setEditEmployeeId,
    employeeForm,
    setEmployeeForm,
    pharmacyShifts,
    pharmacyDefaultShiftId,
    ...transfer,
    openAddEmployee,
    openEditEmployee,
    updateEmployeeWorkSchedule,
    saveEmployee,
    deleteEmployeeRecord,
    toggleEmployeeActive,
  };
}
