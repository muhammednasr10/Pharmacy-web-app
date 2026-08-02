import { formatDateTime } from "./helpers";
import type { EmployeesUsersPageState } from "./useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffActivityTab({ state }: Props) {
  const { isArabic, loading, activeTab, staffActivity } = state;

  if (activeTab !== "activity" || loading) return null;

  return (
    <div className="settingsTabPanel">
      {staffActivity.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد نشاط مسجل" : "No staff activity yet"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "التاريخ" : "Date"}</th>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التفاصيل" : "Details"}</th>
                <th>{isArabic ? "بواسطة" : "By"}</th>
              </tr>
            </thead>
            <tbody>
              {staffActivity.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt, isArabic)}</td>
                  <td>{log.type}</td>
                  <td>{log.title}</td>
                  <td>{log.description}</td>
                  <td>{log.userName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
