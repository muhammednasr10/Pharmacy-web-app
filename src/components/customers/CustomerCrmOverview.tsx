import type { CrmCustomerProfile, CustomerActivity } from "../../types";
import { getCustomerSegmentLabel } from "../../utils/crmLabels";

type CustomerCrmOverviewProps = {
  isArabic: boolean;
  currency: string;
  profiles: CrmCustomerProfile[];
  activities: CustomerActivity[];
  totalRemainingDebt: number;
  totalCustomerPayments: number;
};

export default function CustomerCrmOverview({
  isArabic,
  currency,
  profiles,
  activities,
  totalRemainingDebt,
  totalCustomerPayments,
}: CustomerCrmOverviewProps) {
  const registeredCount = profiles.filter((profile) => profile.source === "registered").length;
  const vipCount = profiles.filter((profile) => profile.segment === "vip").length;
  const chronicCount = profiles.filter((profile) => profile.segment === "chronic").length;
  const debtorsCount = profiles.filter((profile) => profile.remainingDebt > 0).length;
  const totalSales = profiles.reduce((sum, profile) => sum + profile.totalPurchases, 0);
  const openFollowUps = activities.filter(
    (activity) => activity.status === "open" && activity.activityType === "follow_up",
  ).length;
  const topCustomers = [...profiles]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  return (
    <div className="crmOverview">
      <div className="summaryGrid reportSummary crmOverviewGrid">
        <div>
          <span>{isArabic ? "إجمالي العملاء" : "Total customers"}</span>
          <strong>{profiles.length}</strong>
        </div>
        <div>
          <span>{isArabic ? "عملاء مسجلون" : "Registered profiles"}</span>
          <strong>{registeredCount}</strong>
        </div>
        <div>
          <span>{isArabic ? "إجمالي المبيعات" : "Total sales"}</span>
          <strong>
            {totalSales.toFixed(2)} {currency}
          </strong>
        </div>
        <div>
          <span>{isArabic ? "مديونيات مفتوحة" : "Open debts"}</span>
          <strong>
            {totalRemainingDebt.toFixed(2)} {currency}
          </strong>
        </div>
        <div>
          <span>{isArabic ? "إجمالي المحصل" : "Collected"}</span>
          <strong>
            {totalCustomerPayments.toFixed(2)} {currency}
          </strong>
        </div>
        <div>
          <span>{isArabic ? "متابعات مفتوحة" : "Open follow-ups"}</span>
          <strong>{openFollowUps}</strong>
        </div>
        <div>
          <span>{isArabic ? "عملاء VIP" : "VIP customers"}</span>
          <strong>{vipCount}</strong>
        </div>
        <div>
          <span>{isArabic ? "عملاء مزمنون" : "Chronic patients"}</span>
          <strong>{chronicCount}</strong>
        </div>
        <div>
          <span>{isArabic ? "عليهم مديونية" : "With debt"}</span>
          <strong>{debtorsCount}</strong>
        </div>
      </div>

      <div className="crmOverviewSection">
        <h3>{isArabic ? "أفضل العملاء" : "Top customers"}</h3>
        {topCustomers.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد بيانات بعد" : "No data yet"}</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "العميل" : "Customer"}</th>
                  <th>{isArabic ? "الشريحة" : "Segment"}</th>
                  <th>{isArabic ? "المبيعات" : "Sales"}</th>
                  <th>{isArabic ? "الطلبات" : "Orders"}</th>
                  <th>{isArabic ? "المتبقي" : "Remaining"}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((profile) => (
                  <tr key={`${profile.id}-${profile.name}`}>
                    <td>{profile.name}</td>
                    <td>{getCustomerSegmentLabel(profile.segment, isArabic)}</td>
                    <td>
                      {profile.totalPurchases.toFixed(2)} {currency}
                    </td>
                    <td>{profile.purchaseCount}</td>
                    <td>
                      {profile.remainingDebt > 0 ? (
                        <span className="badge danger">
                          {profile.remainingDebt.toFixed(2)} {currency}
                        </span>
                      ) : (
                        <span className="badge ok">{isArabic ? "مسدد" : "Clear"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
