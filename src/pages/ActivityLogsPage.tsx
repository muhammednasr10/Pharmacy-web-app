import { useMemo, useState } from "react";
import type { ActivityLog, PharmacySettings } from "../types";
import {
  ACTIVITY_LOG_TYPE_OPTIONS,
  buildActivityLogSummary,
  filterActivityLogs,
  getActivityTypeLabel,
  listActivityLogUsers,
} from "../utils/activityLogAudit";
import { formatDateInput } from "../utils/date";
import BranchScopeSelect from "../components/BranchScopeSelect";

type ActivityLogsPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  logs: ActivityLog[];
  branches: PharmacySettings[];
  showBranchFilter?: boolean;
  showOrgAudit?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  onRefresh?: () => void | Promise<void>;
  downloadCSV: (filename: string, rows: string[][]) => void;
};

export default function ActivityLogsPage({
  isArabic,
  t,
  logs,
  branches,
  showBranchFilter = false,
  showOrgAudit = false,
  getBranchLabel,
  onRefresh,
  downloadCSV,
}: ActivityLogsPageProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredLogs = useMemo(
    () =>
      filterActivityLogs(logs, {
        search,
        type: typeFilter,
        branchId: branchFilter,
        userName: userFilter,
        fromDate,
        toDate,
      }),
    [logs, search, typeFilter, branchFilter, userFilter, fromDate, toDate],
  );

  const summary = useMemo(() => buildActivityLogSummary(filteredLogs), [filteredLogs]);
  const users = useMemo(() => listActivityLogUsers(logs), [logs]);

  const knownTypes = useMemo(() => {
    const fromLogs = [...new Set(logs.map((log) => log.type).filter(Boolean))];
    return [...new Set([...ACTIVITY_LOG_TYPE_OPTIONS, ...fromLogs])];
  }, [logs]);

  function exportCsv() {
    const rows = [
      [
        isArabic ? "النوع" : "Type",
        ...(showBranchFilter ? [isArabic ? "الفرع" : "Branch"] : []),
        isArabic ? "العنوان" : "Title",
        isArabic ? "التفاصيل" : "Description",
        isArabic ? "نوع المرجع" : "Reference Type",
        isArabic ? "رقم المرجع" : "Reference ID",
        isArabic ? "المستخدم" : "User",
        isArabic ? "التاريخ" : "Date",
      ],
      ...filteredLogs.map((log) => [
        getActivityTypeLabel(log.type, isArabic),
        ...(showBranchFilter
          ? [getBranchLabel ? getBranchLabel(log.pharmacyId) : log.pharmacyId || "-"]
          : []),
        log.title || "-",
        log.description || "-",
        log.referenceType || "-",
        log.referenceId || "-",
        log.userName || "-",
        log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
      ]),
    ];

    downloadCSV(`activity-audit-${formatDateInput(new Date())}.csv`, rows);
  }

  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="card activityLogsPage">
      <div className="cardHeader">
        <div>
          <h2>
            {showOrgAudit
              ? isArabic
                ? "سجل تدقيق المنظمة"
                : "Organization Audit Log"
              : isArabic
                ? "سجل النشاط"
                : "Activity Log"}
          </h2>
          <p className="returnsSectionHint">
            {showOrgAudit
              ? isArabic
                ? "من غيّر ماذا في أي فرع — للمدير العام والمحاسب"
                : "Who changed what in each branch — for general manager and accountant"
              : isArabic
                ? "سجل العمليات والتعديلات في النظام"
                : "System operations and changes history"}
          </p>
        </div>
        <div className="returnsHeaderBtns">
          {onRefresh && (
            <button
              type="button"
              className="editBtn"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
            >
              {refreshing ? (isArabic ? "..." : "...") : isArabic ? "تحديث" : "Refresh"}
            </button>
          )}
          <button type="button" className="printBtn" onClick={exportCsv}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      <div className="stockCountSummaryRow activityAuditSummary">
        <span>
          {isArabic ? "السجلات" : "Records"}: {summary.total}
        </span>
        <span>
          {isArabic ? "اليوم" : "Today"}: {summary.todayCount}
        </span>
        <span>
          {isArabic ? "مستخدمون" : "Users"}: {summary.uniqueUsers}
        </span>
        {summary.topTypes[0] && (
          <span>
            {isArabic ? "الأكثر" : "Top"}: {getActivityTypeLabel(summary.topTypes[0][0], isArabic)}{" "}
            ({summary.topTypes[0][1]})
          </span>
        )}
      </div>

      <div className="filtersBar activityAuditFilters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            isArabic
              ? "بحث بالعنوان أو التفاصيل أو المرجع أو المستخدم"
              : "Search title, description, reference, or user"
          }
        />

        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">{isArabic ? "كل الأنواع" : "All types"}</option>
          {knownTypes.map((type) => (
            <option key={type} value={type}>
              {getActivityTypeLabel(type, isArabic)}
            </option>
          ))}
        </select>

        {showBranchFilter && branches.length > 1 && (
          <BranchScopeSelect
            pharmacies={branches}
            value={branchFilter}
            onChange={setBranchFilter}
            isArabic={isArabic}
            includeAllOption={{
              value: "all",
              label: isArabic ? "كل الفروع" : "All branches",
            }}
          />
        )}

        {users.length > 0 && (
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
            <option value="all">{isArabic ? "كل المستخدمين" : "All users"}</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        )}

        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />

        <button
          type="button"
          className="clearCartBtn"
          onClick={() => {
            setSearch("");
            setTypeFilter("all");
            setBranchFilter("all");
            setUserFilter("all");
            setFromDate("");
            setToDate("");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد سجلات مطابقة" : "No matching audit records"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "النوع" : "Type"}</th>
                {showBranchFilter && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التفاصيل" : "Description"}</th>
                <th>{isArabic ? "المرجع" : "Reference"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{getActivityTypeLabel(log.type, isArabic)}</td>
                  {showBranchFilter && (
                    <td>
                      {getBranchLabel ? getBranchLabel(log.pharmacyId) : log.pharmacyId || "-"}
                    </td>
                  )}
                  <td>{log.title}</td>
                  <td>{log.description}</td>
                  <td>
                    {log.referenceType || "-"} {log.referenceId ? `#${log.referenceId}` : ""}
                  </td>
                  <td>{log.userName || "-"}</td>
                  <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
