import { EmployeePhotoThumb } from "../../components/staff/EmployeePhotoThumb";
import { getEmployeeJobRoleLabel, getRoleLabel } from "../../utils/roles";
import type { EmployeePortalPageState } from "./useEmployeePortalState";

type Props = { state: EmployeePortalPageState };

function formatHireDate(value: string | undefined, isArabic: boolean) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EmployeePortalIdentityCard({ state }: Props) {
  const { isArabic, staff, branchLabel, payrollConfig, schedule } = state;
  if (!staff) return null;

  const roleOrTitle =
    (staff.jobTitle && getEmployeeJobRoleLabel(staff.jobTitle, isArabic)) ||
    (staff.role && getRoleLabel(staff.role, isArabic)) ||
    "";

  const rows: Array<{ label: string; value: string; dir?: "ltr" }> = [
    {
      label: isArabic ? "الرقم الوظيفي" : "Employee code",
      value: staff.employeeCode?.trim() || "—",
      dir: "ltr",
    },
    {
      label: isArabic ? "الهاتف" : "Phone",
      value: staff.phone?.trim() || "—",
      dir: "ltr",
    },
    {
      label: isArabic ? "المسمى / الدور" : "Title / role",
      value: roleOrTitle || "—",
    },
    {
      label: isArabic ? "البريد" : "Email",
      value: staff.email?.trim() || "—",
      dir: "ltr",
    },
    {
      label: isArabic ? "الفرع" : "Branch",
      value: branchLabel || "—",
    },
    {
      label: isArabic ? "تاريخ التعيين" : "Hire date",
      value: formatHireDate(staff.hireDate, isArabic) || "—",
    },
  ];

  if (schedule && payrollConfig) {
    rows.push({
      label: isArabic ? "ساعات العمل اليومية" : "Daily work hours",
      value: String(staff.requiredWorkHours || "—"),
    });
  }

  if (staff.notes?.trim()) {
    rows.push({
      label: isArabic ? "ملاحظات" : "Notes",
      value: staff.notes.trim(),
    });
  }

  return (
    <div className="employeePortalIdentityCard cardInner">
      <div className="employeePortalIdentityMain">
        <EmployeePhotoThumb
          variant="form"
          photoBase64={staff.photoBase64}
          name={staff.name}
        />
        <div className="employeePortalIdentityText">
          <strong className="employeePortalIdentityName">{staff.name}</strong>
          {roleOrTitle ? (
            <span className="employeePortalIdentityRole">{roleOrTitle}</span>
          ) : null}
          <span className="employeePortalIdentityHint">
            {isArabic
              ? "بيانات ملف الموظف المرتبطة بحسابك"
              : "Employee profile linked to your account"}
          </span>
        </div>
      </div>

      <dl className="employeePortalIdentityGrid">
        {rows.map((row) => (
          <div key={row.label} className="employeePortalIdentityField">
            <dt>{row.label}</dt>
            <dd dir={row.dir}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
