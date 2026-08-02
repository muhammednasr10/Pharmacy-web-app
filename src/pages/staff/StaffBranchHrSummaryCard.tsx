import type { EmployeesUsersPageState } from "./useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffBranchHrSummaryCard({ state }: Props) {
  const {
    isArabic,
    showOrgHr,
    branchHrSummaryRows,
    branchHrSummaryOpen,
    setBranchHrSummaryOpen,
    activeTab,
    isHrTab,
  } = state;

  if (!showOrgHr || branchHrSummaryRows.length === 0) return null;
  if (activeTab !== "employees" && !isHrTab) return null;

  return (
    <section className="card branchReportBreakdown branchHrSummaryCard collapsibleSummaryCard">
      <button
        type="button"
        className="collapsibleSummaryHead"
        aria-expanded={branchHrSummaryOpen}
        onClick={() => setBranchHrSummaryOpen((open) => !open)}
      >
        <span
          className={`collapsibleSummaryChevron${branchHrSummaryOpen ? " open" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <h3>{isArabic ? "الموظفون حسب الفرع" : "Staff by branch"}</h3>
        <span className="collapsibleSummaryMeta">
          {branchHrSummaryRows.length} {isArabic ? "فروع" : "branches"}
        </span>
      </button>
      {branchHrSummaryOpen && (
        <div className="tableWrap collapsibleSummaryBody">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "الفرع" : "Branch"}</th>
                <th>{isArabic ? "الإجمالي" : "Total"}</th>
                <th>{isArabic ? "نشط" : "Active"}</th>
                <th>{isArabic ? "موقوف" : "Inactive"}</th>
              </tr>
            </thead>
            <tbody>
              {branchHrSummaryRows.map((row) => (
                <tr key={row.branchId}>
                  <td>{row.branchLabel}</td>
                  <td>{row.totalEmployees}</td>
                  <td>{row.activeEmployees}</td>
                  <td>{row.inactiveEmployees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
