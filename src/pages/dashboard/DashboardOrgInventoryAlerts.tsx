import type { BranchInventoryAlertRow } from "../../utils/inventoryAlerts";

type DashboardOrgInventoryAlertsProps = {
  isArabic: boolean;
  branchInventoryAlertRows: BranchInventoryAlertRow[];
  onOpenBranchInventory?: (branchId: string) => void;
};

export default function DashboardOrgInventoryAlerts({
  isArabic,
  branchInventoryAlertRows,
  onOpenBranchInventory,
}: DashboardOrgInventoryAlertsProps) {
  if (branchInventoryAlertRows.length === 0) return null;

  return (
    <section className="card branchReportBreakdown branchInventoryAlertBreakdown">
      <div className="cardHeader">
        <div>
          <h3>{isArabic ? "تنبيهات المخزون حسب الفرع" : "Inventory alerts by branch"}</h3>
          <p className="returnsSectionHint">
            {isArabic
              ? "ملخص النواقص والصلاحيات لكل فرع — اضغط على الفرع لعرض التفاصيل"
              : "Low stock and expiry summary per branch — click a branch for details"}
          </p>
        </div>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{isArabic ? "الفرع" : "Branch"}</th>
              <th>{isArabic ? "نواقص" : "Low stock"}</th>
              <th>{isArabic ? "نفدت" : "Out of stock"}</th>
              <th>{isArabic ? "قرب الانتهاء" : "Expiring"}</th>
              <th>{isArabic ? "منتهية" : "Expired"}</th>
              <th>{isArabic ? "إجمالي" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {branchInventoryAlertRows.map((row) => (
              <tr
                key={row.branchId}
                className={row.totalAlertCount > 0 ? "branchInventoryAlertRow--active" : ""}
              >
                <td>
                  {onOpenBranchInventory ? (
                    <button
                      type="button"
                      className="branchInventoryAlertLink"
                      onClick={() => onOpenBranchInventory(row.branchId)}
                    >
                      {row.branchLabel}
                    </button>
                  ) : (
                    row.branchLabel
                  )}
                </td>
                <td>
                  <span className={row.lowStockCount > 0 ? "alertCountTag warn" : "mutedCell"}>
                    {row.lowStockCount}
                  </span>
                </td>
                <td>
                  <span className={row.outOfStockCount > 0 ? "alertCountTag danger" : "mutedCell"}>
                    {row.outOfStockCount}
                  </span>
                </td>
                <td>
                  <span className={row.expiringCount > 0 ? "alertCountTag warn" : "mutedCell"}>
                    {row.expiringCount}
                  </span>
                </td>
                <td>
                  <span className={row.expiredCount > 0 ? "alertCountTag danger" : "mutedCell"}>
                    {row.expiredCount}
                  </span>
                </td>
                <td>
                  <strong>{row.totalAlertCount}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
