import { useEffect, useState } from "react";
import type { Employee } from "../../../../types";
import * as pharmacyService from "../../../../services/pharmacyService";
import {
  computeWorkHoursFromSchedule,
  parseWorkBreaks,
  resolveWorkSchedule,
  DEFAULT_PHARMACY_SHIFTS,
  clonePharmacyShifts,
  type ShiftId,
  type WorkSchedule,
} from "../../../../utils/workSchedule";
import { emptyEmployeeForm } from "../../types";
import { formatTransferEmployeeError } from "../../helpers";
import type { StaffEmployeesParams } from "./types";

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
>;

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
}: StaffEmployeeCrudParams) {
  const [employeeModal, setEmployeeModal] = useState<"add" | "edit" | null>(null);
  const [attendanceBadgeEmployee, setAttendanceBadgeEmployee] = useState<Employee | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [pharmacyShifts, setPharmacyShifts] = useState(
    clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS),
  );
  const [pharmacyDefaultShiftId, setPharmacyDefaultShiftId] = useState<ShiftId>("A");
  const [transferEmployee, setTransferEmployee] = useState<Employee | null>(null);
  const [transferTargetBranchId, setTransferTargetBranchId] = useState("");

  useEffect(() => {
    if (!pharmacyId) return;
    void pharmacyService.loadPayrollSettings(pharmacyId).then((settings) => {
      setPharmacyShifts(clonePharmacyShifts(settings.workShifts));
      setPharmacyDefaultShiftId(settings.defaultShiftId);
    });
  }, [pharmacyId]);

  function openAddEmployee() {
    setEditEmployeeId(null);
    const defaultShift =
      pharmacyShifts.find((item) => item.id === pharmacyDefaultShiftId) || pharmacyShifts[0];
    setEmployeeForm({
      ...emptyEmployeeForm,
      pharmacyId: pharmacyId || appUser?.pharmacyId || "main",
      hireDate: new Date().toISOString().slice(0, 10),
      assignedShiftId: pharmacyDefaultShiftId,
      workDayStart: defaultShift.dayStart,
      workDayEnd: defaultShift.dayEnd,
      workBreaks: defaultShift.breaks.map((item) => ({ ...item })),
    });
    setEmployeeModal("add");
    void pharmacyService.suggestNextEmployeeCode(pharmacyId || appUser?.pharmacyId).then((code) => {
      setEmployeeForm((prev) => ({ ...prev, employeeCode: code }));
    });
  }

  function openEditEmployee(employee: Employee) {
    setEditEmployeeId(employee.id);
    setEmployeeForm({
      pharmacyId: employee.pharmacyId,
      employeeCode: employee.employeeCode || "",
      photoBase64: employee.photoBase64 || "",
      name: employee.name,
      phone: employee.phone || "",
      salary: employee.salary,
      commissionRate: employee.commissionRate,
      requiredWorkHours: employee.requiredWorkHours ?? 8,
      assignedShiftId: (employee.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
      useCustomWorkSchedule: Boolean(employee.useCustomWorkSchedule),
      workDayStart: employee.workDayStart || pharmacyShifts[0].dayStart,
      workDayEnd: employee.workDayEnd || pharmacyShifts[0].dayEnd,
      workBreaks: parseWorkBreaks(employee.workBreaks),
      hireDate: employee.hireDate || "",
      notes: employee.notes || "",
      isActive: employee.isActive,
    });
    setEmployeeModal("edit");
  }

  function updateEmployeeWorkSchedule(schedule: WorkSchedule) {
    const requiredWorkHours = computeWorkHoursFromSchedule(schedule);
    setEmployeeForm((prev) => ({
      ...prev,
      workDayStart: schedule.dayStart,
      workDayEnd: schedule.dayEnd,
      workBreaks: schedule.breaks,
      requiredWorkHours,
    }));
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
      const customSchedule = employeeForm.useCustomWorkSchedule
        ? {
            dayStart: employeeForm.workDayStart,
            dayEnd: employeeForm.workDayEnd,
            breaks: employeeForm.workBreaks,
          }
        : resolveWorkSchedule(
            {
              assignedShiftId: employeeForm.assignedShiftId,
              useCustomWorkSchedule: false,
            },
            pharmacyShifts,
            pharmacyDefaultShiftId,
          );
      const requiredWorkHours = computeWorkHoursFromSchedule(customSchedule);

      const payload = {
        pharmacyId: targetPharmacyId,
        employeeCode: employeeForm.employeeCode.trim() || undefined,
        photoBase64: employeeForm.photoBase64 || undefined,
        name: employeeForm.name.trim(),
        phone: employeeForm.phone.trim() || undefined,
        salary: Number(employeeForm.salary) || 0,
        commissionRate: Number(employeeForm.commissionRate) || 0,
        requiredWorkHours,
        assignedShiftId: employeeForm.assignedShiftId,
        useCustomWorkSchedule: employeeForm.useCustomWorkSchedule,
        workDayStart: employeeForm.useCustomWorkSchedule
          ? employeeForm.workDayStart
          : (null as unknown as undefined),
        workDayEnd: employeeForm.useCustomWorkSchedule
          ? employeeForm.workDayEnd
          : (null as unknown as undefined),
        workBreaks: employeeForm.useCustomWorkSchedule
          ? employeeForm.workBreaks
          : (null as unknown as undefined),
        hireDate: employeeForm.hireDate || undefined,
        notes: employeeForm.notes.trim() || undefined,
        isActive: employeeForm.isActive,
      };

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

  function openTransferEmployeeModal(employee: Employee) {
    const fallbackTarget = pharmacies.find((branch) => branch.id !== employee.pharmacyId)?.id || "";
    setTransferTargetBranchId(fallbackTarget);
    setTransferEmployee(employee);
  }

  async function confirmTransferEmployee() {
    if (!transferEmployee || !transferTargetBranchId) {
      alert(isArabic ? "اختر الفرع المستهدف" : "Select a target branch");
      return;
    }
    if (transferTargetBranchId === transferEmployee.pharmacyId) {
      alert(isArabic ? "اختر فرعاً مختلفاً" : "Choose a different branch");
      return;
    }

    const linked = catalogByEmployeeId.get(transferEmployee.id);
    const confirmMessage = isArabic
      ? `نقل «${transferEmployee.name}» من ${branchLabel(transferEmployee.pharmacyId)} إلى ${branchLabel(transferTargetBranchId)}?${
          linked ? `\n\nسيُنقل حساب الدخول: ${linked.email}` : ""
        }`
      : `Move "${transferEmployee.name}" from ${branchLabel(transferEmployee.pharmacyId)} to ${branchLabel(transferTargetBranchId)}?${
          linked ? `\n\nLogin account will move: ${linked.email}` : ""
        }`;
    if (!window.confirm(confirmMessage)) return;

    setBusy(`transfer-emp-${transferEmployee.id}`);
    try {
      const result = await pharmacyService.transferEmployeeToBranch(
        transferEmployee.id,
        transferTargetBranchId,
      );
      await onActivityLog({
        type: "employee_branch_transfer",
        title: isArabic ? "نقل موظف بين الفروع" : "Employee branch transfer",
        description: isArabic
          ? `نُقل ${transferEmployee.name} من ${branchLabel(result.fromPharmacyId)} إلى ${branchLabel(result.toPharmacyId)}${
              result.loginEmail ? ` — حساب: ${result.loginEmail}` : ""
            }`
          : `${transferEmployee.name} moved from ${branchLabel(result.fromPharmacyId)} to ${branchLabel(result.toPharmacyId)}${
              result.loginEmail ? ` — account: ${result.loginEmail}` : ""
            }`,
        referenceType: "employee",
        referenceId: transferEmployee.id,
      });
      setTransferEmployee(null);
      setTransferTargetBranchId("");
      await loadAll();
      alert(
        isArabic
          ? `تم النقل إلى ${branchLabel(result.toPharmacyId)}${
              result.loginEmail
                ? result.loginSynced
                  ? `\nوتم تحديث حساب الدخول (${result.loginEmail})`
                  : `\nحساب الكتالوج: ${result.loginEmail} — اضغط «ربط» إن لزم`
                : ""
            }`
          : `Transferred to ${branchLabel(result.toPharmacyId)}${
              result.loginEmail
                ? result.loginSynced
                  ? `\nLogin account updated (${result.loginEmail})`
                  : `\nCatalog account: ${result.loginEmail} — use Link if needed`
                : ""
            }`,
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? formatTransferEmployeeError(err.message, isArabic)
          : isArabic
            ? "تعذر النقل"
            : "Transfer failed",
      );
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
    editEmployeeId,
    setEditEmployeeId,
    employeeForm,
    setEmployeeForm,
    pharmacyShifts,
    pharmacyDefaultShiftId,
    transferEmployee,
    setTransferEmployee,
    transferTargetBranchId,
    setTransferTargetBranchId,
    openAddEmployee,
    openEditEmployee,
    updateEmployeeWorkSchedule,
    saveEmployee,
    openTransferEmployeeModal,
    confirmTransferEmployee,
    deleteEmployeeRecord,
    toggleEmployeeActive,
  };
}
