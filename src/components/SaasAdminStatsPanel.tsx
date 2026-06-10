import { getSubscriptionTierLabel, subscriptionTiers } from "../config/subscriptionTiers";
import type { SubscriptionRequest } from "../types";
import {
  buildSaasAdminStats,
  formatSaasMoney,
  getRequestTypeSummary,
  subscriptionTierOrder,
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
          <h3>{isArabic ? "لوحة إحصائيات SaaS" : "SaaS statistics dashboard"}</h3>
          <p className="pageHint">
            {isArabic
              ? "ملخص العملاء والإيرادات والباقات والفروع"
              : "Overview of tenants, revenue, packages, and branches"}
          </p>
        </div>
      </div>

      <div className="saasStats saasStatsPrimary">
        <StatCard
          label={isArabic ? "المنظمات / العملاء" : "Organizations / clients"}
          value={String(stats.totalOrganizations)}
          sub={
            isArabic
              ? `${stats.totalBranches} فرع مسجّل`
              : `${stats.totalBranches} registered branches`
          }
          tone="blue"
        />
        <StatCard
          label={isArabic ? "صيدليات نشطة" : "Active pharmacies"}
          value={String(stats.activePharmacies)}
          sub={
            isArabic
              ? `${stats.suspendedPharmacies} موقوفة`
              : `${stats.suspendedPharmacies} suspended`
          }
          tone="green"
        />
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
          label={isArabic ? "طلبات قيد المراجعة" : "Pending requests"}
          value={String(stats.pendingSubscriptionRequests)}
          sub={
            isArabic
              ? `${formatSaasMoney(stats.pendingRevenueTotal)} متوقعة · ${stats.pendingLoginAccountRequests} حساب`
              : `${formatSaasMoney(stats.pendingRevenueTotal)} expected · ${stats.pendingLoginAccountRequests} accounts`
          }
          tone="warn"
        />
      </div>

      <div className="saasStats saasStatsSecondary">
        <StatCard
          label={isArabic ? "المستخدمون" : "Users"}
          value={String(stats.totalUsers)}
          sub={isArabic ? `${stats.activeUsers} نشط` : `${stats.activeUsers} active`}
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
          label={isArabic ? "إجمالي الفروع" : "Total branches"}
          value={String(stats.totalBranches)}
          sub={
            isArabic
              ? `عبر ${stats.totalOrganizations} منظمة`
              : `across ${stats.totalOrganizations} organizations`
          }
          tone="blue"
        />
      </div>

      <div className="saasTierStatsRow">
        <h4>{isArabic ? "الباقات النشطة" : "Active packages"}</h4>
        <div className="saasTierStatsGrid">
          {subscriptionTierOrder.map((tierId) => {
            const tier = subscriptionTiers[tierId];
            const total = stats.tierCounts[tierId];
            const active = stats.activeTierCounts[tierId];
            return (
              <article key={tierId} className={`saasTierStatCard ${tierId}`}>
                <div className="saasTierStatTop">
                  <strong>{getSubscriptionTierLabel(tierId, isArabic)}</strong>
                  <span>{isArabic ? `${tier.maxBranches} فروع` : `${tier.maxBranches} branches`}</span>
                </div>
                <div className="saasTierStatCounts">
                  <div>
                    <span>{isArabic ? "نشطة" : "Active"}</span>
                    <strong>{active}</strong>
                  </div>
                  <div>
                    <span>{isArabic ? "الإجمالي" : "Total"}</span>
                    <strong>{total}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
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
                            isArabic ? "ar-EG" : "en-GB"
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
