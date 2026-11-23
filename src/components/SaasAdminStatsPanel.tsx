import type { SubscriptionRequest } from "../types";
import {
  buildSaasAdminStats,
  formatSaasMoney,
  getRequestTypeSummary,
  type SaasAdminStats,
} from "../utils/saasAdminStats";
import type { AppUser, PharmacySettings } from "../types";

type SaasAdminStatsPanelProps = {
  isArabic: boolean;
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  subscriptionRequests: SubscriptionRequest[];
  pendingLoginAccountRequests: number;
  isPharmacyActive: (pharmacy: PharmacySettings) => boolean;
};

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "red" | "blue" | "warn";
}) {
  return (
    <div className={`saasStatCard ${tone !== "default" ? tone : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small className="saasStatSub">{sub}</small> : null}
    </div>
  );
}

export default function SaasAdminStatsPanel({
  isArabic,
  pharmacies,
  systemUsers,
  subscriptionRequests,
  pendingLoginAccountRequests,
  isPharmacyActive,
}: SaasAdminStatsPanelProps) {
  const stats: SaasAdminStats = buildSaasAdminStats({
    pharmacies,
    systemUsers,
    subscriptionRequests,
    pendingLoginAccountRequests,
    isPharmacyActive,
  });

  return (
    <section className="saasStatsDashboard">
      <div className="saasPageHeader">
        <div>
          <h3>{isArabic ? "ملخص النظام" : "System summary"}</h3>
          <p className="pageHint">
            {isArabic
              ? "عدد الصيدليات والفروع والحالة والاشتراكات والمستخدمين"
              : "Pharmacies, branches, status, subscriptions, and users"}
          </p>
        </div>
      </div>

      <div className="saasStats saasStatsPrimary">
        <StatCard
          label={isArabic ? "عدد الصيدليات" : "Pharmacies"}
          value={String(stats.totalOrganizations)}
          sub={isArabic ? "عملاء مسجّلون في النظام" : "Registered clients in the system"}
          tone="blue"
        />
        <StatCard
          label={isArabic ? "عدد الفروع" : "Branches"}
          value={String(stats.totalBranches)}
          sub={
            isArabic
              ? `متوسط ${(stats.totalOrganizations ? stats.totalBranches / stats.totalOrganizations : 0).toFixed(1)} فرع لكل صيدلية`
              : `Avg ${(stats.totalOrganizations ? stats.totalBranches / stats.totalOrganizations : 0).toFixed(1)} branches per pharmacy`
          }
          tone="blue"
        />
        <StatCard
          label={isArabic ? "نشط" : "Active"}
          value={String(stats.activePharmacies)}
          sub={
            isArabic
              ? `من أصل ${stats.totalPharmacies} فرع`
              : `of ${stats.totalPharmacies} branches`
          }
          tone="green"
        />
        <StatCard
          label={isArabic ? "غير نشط" : "Inactive"}
          value={String(stats.suspendedPharmacies)}
          sub={
            isArabic
              ? "موقوف أو منتهي الاشتراك"
              : "Suspended or expired subscription"
          }
          tone={stats.suspendedPharmacies > 0 ? "red" : "default"}
        />
      </div>

      <div className="saasStats saasStatsSecondary">
        <StatCard
          label={isArabic ? "المستخدمون" : "Users"}
          value={String(stats.totalUsers)}
          sub={
            isArabic
              ? `${stats.activeUsers} نشط · ${Math.max(0, stats.totalUsers - stats.activeUsers)} غير نشط`
              : `${stats.activeUsers} active · ${Math.max(0, stats.totalUsers - stats.activeUsers)} inactive`
          }
        />
        <StatCard
          label={isArabic ? "اشتراكات تنتهي خلال 7 أيام" : "Expiring within 7 days"}
          value={String(stats.expiringWithin7Days)}
          tone={stats.expiringWithin7Days > 0 ? "warn" : "default"}
        />
        <StatCard
          label={isArabic ? "اشتراكات منتهية" : "Expired subscriptions"}
          value={String(stats.expiredSubscriptions)}
          tone={stats.expiredSubscriptions > 0 ? "red" : "default"}
        />
        <StatCard
          label={isArabic ? "طلبات قيد المراجعة" : "Pending requests"}
          value={String(stats.pendingSubscriptionRequests + stats.pendingLoginAccountRequests)}
          sub={
            isArabic
              ? `${stats.pendingSubscriptionRequests} اشتراك · ${stats.pendingLoginAccountRequests} حساب`
              : `${stats.pendingSubscriptionRequests} subscription · ${stats.pendingLoginAccountRequests} login`
          }
          tone="warn"
        />
      </div>

      <div className="saasStats saasStatsSecondary">
        <StatCard
          label={isArabic ? "إيرادات معتمدة" : "Approved revenue"}
          value={formatSaasMoney(stats.approvedRevenueTotal)}
          sub={
            isArabic
              ? `${formatSaasMoney(stats.approvedRevenueLast30Days)} آخر 30 يوم`
              : `${formatSaasMoney(stats.approvedRevenueLast30Days)} last 30 days`
          }
          tone="green"
        />
        <StatCard
          label={isArabic ? "إيرادات متوقعة (طلبات معلّقة)" : "Expected revenue (pending)"}
          value={formatSaasMoney(stats.pendingRevenueTotal)}
          tone={stats.pendingRevenueTotal > 0 ? "warn" : "default"}
        />
      </div>

      {stats.recentApprovedRequests.length > 0 && (
        <div className="saasRecentRevenue">
          <h4>{isArabic ? "آخر مدفوعات معتمدة" : "Recent approved payments"}</h4>
          <div className="tableWrap">
            <table className="dataTable saasRequestsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                  <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "المبلغ" : "Amount"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentApprovedRequests.map((request) => (
                  <tr key={request.id}>
                    <td dir="ltr">
                      <code>{request.requestNumber}</code>
                    </td>
                    <td>{request.pharmacyName || request.pharmacyId}</td>
                    <td>{getRequestTypeSummary(request, isArabic)}</td>
                    <td>{formatSaasMoney(request.amount, request.currency || "EGP")}</td>
                    <td>
                      {request.reviewedAt || request.createdAt
                        ? new Date(request.reviewedAt || request.createdAt || "").toLocaleString(
                            isArabic ? "ar-EG" : "en-GB",
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
