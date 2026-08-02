import type { CrmCustomerProfile, CustomerActivity } from "../../types";
import {
  getCustomerActivityStatusLabel,
  getCustomerActivityTypeLabel,
} from "../../utils/crmLabels";

type CustomerCrmFollowUpsPanelProps = {
  isArabic: boolean;
  profiles: CrmCustomerProfile[];
  activities: CustomerActivity[];
  statusFilter: "open" | "done" | "all";
  onStatusFilterChange: (value: "open" | "done" | "all") => void;
  onOpenProfile: (profile: CrmCustomerProfile) => void;
  onUpdateActivityStatus: (id: number, status: CustomerActivity["status"]) => Promise<void>;
};

export default function CustomerCrmFollowUpsPanel({
  isArabic,
  profiles,
  activities,
  statusFilter,
  onStatusFilterChange,
  onOpenProfile,
  onUpdateActivityStatus,
}: CustomerCrmFollowUpsPanelProps) {
  const filtered = activities
    .filter((activity) => activity.activityType === "follow_up")
    .filter((activity) => statusFilter === "all" || activity.status === statusFilter)
    .sort((a, b) => String(a.dueDate || a.createdAt).localeCompare(String(b.dueDate || b.createdAt)));

  function resolveProfile(activity: CustomerActivity) {
    return profiles.find(
      (profile) =>
        profile.id === activity.customerId ||
        profile.name.trim().toLowerCase() === (activity.customerName || "").trim().toLowerCase(),
    );
  }

  return (
    <div className="crmFollowUpsPanel">
      <div className="filtersBar">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "open" | "done" | "all")}
        >
          <option value="open">{isArabic ? "مفتوحة" : "Open"}</option>
          <option value="done">{isArabic ? "منجزة" : "Done"}</option>
          <option value="all">{isArabic ? "الكل" : "All"}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد متابعات" : "No follow-ups"}</p>
      ) : (
        <div className="crmFollowUpCards">
          {filtered.map((activity) => {
            const profile = resolveProfile(activity);
            return (
              <article key={activity.id} className="crmFollowUpCard">
                <div className="crmFollowUpHead">
                  <strong>{activity.customerName || profile?.name || "—"}</strong>
                  <span className={`badge ${activity.status === "open" ? "warn" : "ok"}`}>
                    {getCustomerActivityStatusLabel(activity.status, isArabic)}
                  </span>
                </div>
                <p className="crmFollowUpType">
                  {getCustomerActivityTypeLabel(activity.activityType, isArabic)}
                </p>
                {activity.title ? <p className="crmFollowUpTitle">{activity.title}</p> : null}
                {activity.body ? <p>{activity.body}</p> : null}
                <div className="crmFollowUpMeta">
                  {activity.dueDate ? (
                    <span>
                      {isArabic ? "الموعد:" : "Due:"} {activity.dueDate}
                    </span>
                  ) : null}
                  {activity.createdByName ? <span>{activity.createdByName}</span> : null}
                </div>
                <div className="actionButtons">
                  {profile ? (
                    <button type="button" className="smallBtn" onClick={() => onOpenProfile(profile)}>
                      {isArabic ? "ملف العميل" : "Customer profile"}
                    </button>
                  ) : null}
                  {activity.status === "open" ? (
                    <button
                      type="button"
                      className="printBtn"
                      onClick={() => void onUpdateActivityStatus(activity.id, "done")}
                    >
                      {isArabic ? "تمت" : "Done"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
