import { useState } from "react";
import type { Employee } from "../../../../types";
import * as pharmacyService from "../../../../services/pharmacyService";
import { formatTransferEmployeeError } from "../../helpers";
import type { StaffEmployeesParams } from "./types";

type Params = Pick<
  StaffEmployeesParams,
  | "isArabic"
  | "pharmacies"
  | "onActivityLog"
  | "setBusy"
  | "branchLabel"
  | "catalogByEmployeeId"
  | "loadAll"
>;

export function useStaffEmployeeTransferActions({
  isArabic,
  pharmacies,
  onActivityLog,
  setBusy,
  branchLabel,
  catalogByEmployeeId,
  loadAll,
}: Params) {
  const [transferEmployee, setTransferEmployee] = useState<Employee | null>(null);
  const [transferTargetBranchId, setTransferTargetBranchId] = useState("");

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

  return {
    transferEmployee,
    setTransferEmployee,
    transferTargetBranchId,
    setTransferTargetBranchId,
    openTransferEmployeeModal,
    confirmTransferEmployee,
  };
}
