import { Suspense } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import { EmployeePhotoThumb, readEmployeePhotoFile } from "../../../components/staff/EmployeePhotoThumb";
import BranchScopeSelect from "../../../components/BranchScopeSelect";
import {
  computeWorkHoursFromSchedule,
  getShiftDisplayName,
  type ShiftId,
} from "../../../utils/workSchedule";
import { LazyWorkScheduleEditor } from "../lazyStaffModules";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffEmployeeFormModal({ state }: Props) {
  const {
    isArabic,
    employeeModal,
    setEmployeeModal,
    showOrgHrManage,
    pharmacies,
    employeeForm,
    setEmployeeForm,
    pharmacyShifts,
    updateEmployeeWorkSchedule,
    busy,
    saveEmployee,
  } = state;

  if (!employeeModal) return null;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal userModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <h2>
            {employeeModal === "add"
              ? isArabic
                ? "إضافة موظف"
                : "Add Employee"
              : isArabic
                ? "تعديل موظف"
                : "Edit Employee"}
          </h2>
          <button type="button" className="deleteSmallBtn" onClick={() => setEmployeeModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <div className="userFormGrid">
          {showOrgHrManage && employeeModal === "add" && (
            <label className="userFormFullWidth">
              {isArabic ? "الفرع" : "Branch"}
              <BranchScopeSelect
                pharmacies={pharmacies}
                value={employeeForm.pharmacyId}
                onChange={(nextBranchId) => {
                  setEmployeeForm({ ...employeeForm, pharmacyId: nextBranchId });
                  void pharmacyService.suggestNextEmployeeCode(nextBranchId).then((code) => {
                    setEmployeeForm((prev) =>
                      prev.pharmacyId === nextBranchId ? { ...prev, employeeCode: code } : prev,
                    );
                  });
                }}
                isArabic={isArabic}
              />
            </label>
          )}
          <div className="employeeTopRow">
            <label className="employeeCodeField">
              {isArabic ? "كود الموظف" : "Employee code"}
              <input
                className="searchInput"
                value={employeeForm.employeeCode}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })
                }
                placeholder="EMP-001"
                dir="ltr"
              />
            </label>
            <div className="employeePhotoCompact">
              <span className="employeePhotoCompactLabel">
                {isArabic ? "صورة الموظف" : "Employee photo"}
              </span>
              <label className="employeePhotoPicker" htmlFor="employee-photo-input">
                <EmployeePhotoThumb
                  variant="form"
                  photoBase64={employeeForm.photoBase64}
                  name={employeeForm.name || "?"}
                />
                <span className="employeePhotoPickerHint">
                  {employeeForm.photoBase64
                    ? isArabic
                      ? "تغيير"
                      : "Change"
                    : isArabic
                      ? "رفع صورة"
                      : "Upload"}
                </span>
              </label>
              <input
                id="employee-photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="employeePhotoFileInput"
                onChange={(e) =>
                  readEmployeePhotoFile(e.target.files?.[0] ?? null, isArabic, (dataUrl) =>
                    setEmployeeForm({ ...employeeForm, photoBase64: dataUrl }),
                  )
                }
              />
              {employeeForm.photoBase64 && (
                <button
                  type="button"
                  className="employeePhotoRemoveBtn"
                  onClick={() => setEmployeeForm({ ...employeeForm, photoBase64: "" })}
                >
                  {isArabic ? "حذف" : "Remove"}
                </button>
              )}
            </div>
          </div>
          <label>
            {isArabic ? "الاسم" : "Name"} *
            <input
              className="searchInput"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
            />
          </label>
          <label>
            {isArabic ? "الهاتف" : "Phone"}
            <input
              className="searchInput"
              value={employeeForm.phone}
              onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
            />
          </label>
          <label>
            {isArabic ? "تاريخ التعيين" : "Hire date"}
            <input
              type="date"
              className="searchInput"
              value={employeeForm.hireDate}
              onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            {isArabic ? "ملاحظات" : "Notes"}
            <input
              className="searchInput"
              value={employeeForm.notes}
              onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
            />
          </label>
          <label>
            {isArabic ? "ساعات العمل المطلوبة (يومياً)" : "Required work hours (daily)"}
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className="searchInput"
              value={employeeForm.requiredWorkHours}
              disabled={employeeForm.useCustomWorkSchedule}
              onChange={(e) =>
                setEmployeeForm({
                  ...employeeForm,
                  requiredWorkHours: Number(e.target.value) || 0,
                })
              }
            />
          </label>

          <div className="workScheduleEmployeeSection" style={{ gridColumn: "1 / -1" }}>
            <label>
              {isArabic ? "الشيفت" : "Shift"}
              <select
                className="tableSelect"
                value={employeeForm.assignedShiftId}
                disabled={employeeForm.useCustomWorkSchedule}
                onChange={(e) => {
                  const assignedShiftId = e.target.value as ShiftId;
                  const shift =
                    pharmacyShifts.find((item) => item.id === assignedShiftId) || pharmacyShifts[0];
                  setEmployeeForm((prev) => ({
                    ...prev,
                    assignedShiftId,
                    workDayStart: shift.dayStart,
                    workDayEnd: shift.dayEnd,
                    workBreaks: shift.breaks.map((item) => ({ ...item })),
                    requiredWorkHours: computeWorkHoursFromSchedule({
                      dayStart: shift.dayStart,
                      dayEnd: shift.dayEnd,
                      breaks: shift.breaks,
                    }),
                  }));
                }}
              >
                {pharmacyShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {getShiftDisplayName(shift.id, pharmacyShifts, isArabic)} ({shift.dayStart}–
                    {shift.dayEnd})
                  </option>
                ))}
              </select>
            </label>

            <label className="workScheduleCustomRow">
              <input
                type="checkbox"
                checked={employeeForm.useCustomWorkSchedule}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  const shift =
                    pharmacyShifts.find((item) => item.id === employeeForm.assignedShiftId) ||
                    pharmacyShifts[0];
                  setEmployeeForm((prev) => ({
                    ...prev,
                    useCustomWorkSchedule: enabled,
                    workDayStart: enabled ? prev.workDayStart : shift.dayStart,
                    workDayEnd: enabled ? prev.workDayEnd : shift.dayEnd,
                    workBreaks: enabled
                      ? prev.workBreaks.length > 0
                        ? prev.workBreaks
                        : shift.breaks.map((item) => ({ ...item }))
                      : shift.breaks.map((item) => ({ ...item })),
                    requiredWorkHours: enabled
                      ? computeWorkHoursFromSchedule({
                          dayStart: prev.workDayStart,
                          dayEnd: prev.workDayEnd,
                          breaks: prev.workBreaks.length > 0 ? prev.workBreaks : shift.breaks,
                        })
                      : computeWorkHoursFromSchedule({
                          dayStart: shift.dayStart,
                          dayEnd: shift.dayEnd,
                          breaks: shift.breaks,
                        }),
                  }));
                }}
              />
              <span>
                {isArabic
                  ? "مواعيد عمل مخصصة (بدل الشيفت)"
                  : "Custom work schedule (override shift)"}
              </span>
            </label>

            {employeeForm.useCustomWorkSchedule ? (
              <Suspense
                fallback={
                  <p className="hintText">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
                }
              >
                <LazyWorkScheduleEditor
                  isArabic={isArabic}
                  schedule={{
                    dayStart: employeeForm.workDayStart,
                    dayEnd: employeeForm.workDayEnd,
                    breaks: employeeForm.workBreaks,
                  }}
                  onChange={updateEmployeeWorkSchedule}
                />
              </Suspense>
            ) : (
              <p className="workScheduleHint">
                {isArabic
                  ? `مواعيد ${getShiftDisplayName(employeeForm.assignedShiftId, pharmacyShifts, true)}: ${employeeForm.workDayStart} → ${employeeForm.workDayEnd}`
                  : `${getShiftDisplayName(employeeForm.assignedShiftId, pharmacyShifts, false)} schedule: ${employeeForm.workDayStart} → ${employeeForm.workDayEnd}`}
              </p>
            )}
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={!!busy}
            onClick={() => void saveEmployee()}
          >
            {isArabic ? "حفظ" : "Save"}
          </button>
          <button type="button" className="editBtn" onClick={() => setEmployeeModal(null)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
