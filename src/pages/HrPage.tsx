import HrAttendanceTab from "./hr/HrAttendanceTab";
import HrPayrollTab from "./hr/HrPayrollTab";
import HrRequestsTab from "./hr/HrRequestsTab";
import HrPayrollAdditionsModal from "./hr/modals/HrPayrollAdditionsModal";
import HrPayrollDeductionsModal from "./hr/modals/HrPayrollDeductionsModal";
import { useHrPageState } from "./hr/useHrPageState";
import type { HrPageProps } from "./hr/types";

export type { HrTab } from "./hr/types";

export default function HrPage(props: HrPageProps) {
  const state = useHrPageState(props);
  const {
    isArabic,
    embedded,
    error,
    orgHrReadOnly,
    showOrgHr,
    tabs,
    activeTab,
    setInternalTab,
  } = state;

  const panelContent = (
    <>
      {error && (
        <p className="errorText" style={{ padding: "0 1rem" }}>
          {isArabic
            ? "تأكد من تنفيذ ملف SQL في Supabase (supabase/attendance-payroll.sql)"
            : "Run supabase/attendance-payroll.sql in Supabase if tables are missing"}
        </p>
      )}

      {orgHrReadOnly && showOrgHr && (
        <p className="catalogLinkToolbarHint" style={{ padding: "0 1rem", marginBottom: 12 }}>
          {isArabic
            ? "عرض HR لكل الفروع — التعديل متاح لفرعك الأساسي فقط (قراءة فقط للفروع الأخرى)."
            : "Organization HR view — you can edit your home branch only; other branches are read-only."}
        </p>
      )}

      <HrAttendanceTab state={state} />
      <HrRequestsTab state={state} />
      <HrPayrollTab state={state} />
    </>
  );

  if (embedded) {
    return (
      <>
        {panelContent}
        <HrPayrollAdditionsModal state={state} />
        <HrPayrollDeductionsModal state={state} />
      </>
    );
  }

  return (
    <>
      <section className="card settingsPage hrPage">
        <div className="cardHeader">
          <div>
            <h2>{isArabic ? "الموظفين والمرتبات" : "Employees & Payroll"}</h2>
            <p className="returnsSectionHint">
              {isArabic
                ? "تسجيل حضور وانصراف الموظفين وحساب المرتبات الشهرية"
                : "Track attendance and calculate monthly payroll"}
            </p>
          </div>
        </div>

        <nav className="settingsTabsNav" aria-label={isArabic ? "أقسام الموظفين" : "HR sections"}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settingsTabBtn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setInternalTab(tab.id)}
            >
              {isArabic ? tab.ar : tab.en}
            </button>
          ))}
        </nav>

        {panelContent}
      </section>
      <HrPayrollAdditionsModal state={state} />
      <HrPayrollDeductionsModal state={state} />
    </>
  );
}
