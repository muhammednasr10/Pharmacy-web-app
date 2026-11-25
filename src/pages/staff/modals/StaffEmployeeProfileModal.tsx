import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { buildStaffEmployeeProfileRows } from "../employeeProfileRows";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffEmployeeProfileModal({ state }: Props) {
  const {
    isArabic,
    profileModalEmployee,
    closeEmployeeProfileModal,
    branchLabel,
    pharmacyDefaultShiftId,
    pharmacyShifts,
    openEditEmployee,
    canManage,
  } = state;

  if (!profileModalEmployee) return null;

  const emp = profileModalEmployee;
  const rows = buildStaffEmployeeProfileRows(emp, {
    isArabic,
    branchLabel,
    pharmacyShifts,
    pharmacyDefaultShiftId,
  });

  return (
    <div className="modalOverlay" onClick={closeEmployeeProfileModal}>
      <div
        className="invoiceModal userModal staffEmployeeProfileModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "البيانات الشخصية" : "Personal details"}</h2>
            <p className="returnsSectionHint" style={{ margin: "0.25rem 0 0" }}>
              {emp.name}
            </p>
          </div>
          <button type="button" className="deleteSmallBtn" onClick={closeEmployeeProfileModal}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="staffEmployeeProfileHero">
          <EmployeePhotoThumb photoBase64={emp.photoBase64} name={emp.name} variant="form" />
          <div>
            <strong>{emp.name}</strong>
            <span className="saasSub">
              {[emp.employeeCode, branchLabel(emp.pharmacyId)].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>

        <div className="staffEmployeeProfileGrid">
          {rows.map((row) => (
            <div key={row.label} className="staffEmployeeProfileRow">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>

        {canManage ? (
          <div className="modalActions">
            <button
              type="button"
              className="completeBtn"
              onClick={() => {
                closeEmployeeProfileModal();
                openEditEmployee(emp);
              }}
            >
              {isArabic ? "تعديل البيانات" : "Edit details"}
            </button>
            <button type="button" className="editBtn" onClick={closeEmployeeProfileModal}>
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
