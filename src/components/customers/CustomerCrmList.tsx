import type { CrmCustomerProfile } from "../../types";
import { getCustomerSegmentLabel } from "../../utils/crmLabels";

type CustomerCrmListProps = {
  isArabic: boolean;
  currency: string;
  profiles: CrmCustomerProfile[];
  search: string;
  segmentFilter: string;
  onSearchChange: (value: string) => void;
  onSegmentFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onAddCustomer: () => void;
  onOpenProfile: (profile: CrmCustomerProfile) => void;
  onRegisterInferred: (profile: CrmCustomerProfile) => void;
};

export default function CustomerCrmList({
  isArabic,
  currency,
  profiles,
  search,
  segmentFilter,
  onSearchChange,
  onSegmentFilterChange,
  onClearFilters,
  onAddCustomer,
  onOpenProfile,
  onRegisterInferred,
}: CustomerCrmListProps) {
  return (
    <div className="crmCustomersPanel">
      <div className="crmPanelToolbar">
        <button type="button" className="printFullBtn" onClick={onAddCustomer}>
          + {isArabic ? "إضافة عميل" : "Add customer"}
        </button>
      </div>

      <div className="filtersBar">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isArabic ? "بحث بالاسم أو الهاتف" : "Search name or phone"}
        />
        <select value={segmentFilter} onChange={(e) => onSegmentFilterChange(e.target.value)}>
          <option value="all">{isArabic ? "كل الشرائح" : "All segments"}</option>
          <option value="regular">{getCustomerSegmentLabel("regular", isArabic)}</option>
          <option value="vip">{getCustomerSegmentLabel("vip", isArabic)}</option>
          <option value="chronic">{getCustomerSegmentLabel("chronic", isArabic)}</option>
          <option value="wholesale">{getCustomerSegmentLabel("wholesale", isArabic)}</option>
        </select>
        <button type="button" className="clearCartBtn" onClick={onClearFilters}>
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {profiles.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد عملاء مطابقون" : "No matching customers"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "العميل" : "Customer"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "الشريحة" : "Segment"}</th>
                <th>{isArabic ? "المبيعات" : "Sales"}</th>
                <th>{isArabic ? "الطلبات" : "Orders"}</th>
                <th>{isArabic ? "المتبقي" : "Debt"}</th>
                <th>{isArabic ? "آخر شراء" : "Last purchase"}</th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={`${profile.id}-${profile.name}`}>
                  <td>
                    <strong>{profile.name}</strong>
                    {profile.source === "inferred" ? (
                      <small className="crmInferredBadge">
                        {isArabic ? "من الفواتير" : "From invoices"}
                      </small>
                    ) : null}
                  </td>
                  <td dir="ltr">{profile.phone || "—"}</td>
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
                      <span className="badge ok">0</span>
                    )}
                  </td>
                  <td>{profile.lastPurchaseDate || "—"}</td>
                  <td>
                    {profile.openFollowUps > 0 ? (
                      <span className="badge warn">
                        {profile.openFollowUps} {isArabic ? "متابعة" : "follow-up"}
                      </span>
                    ) : (
                      <span className="badge ok">{isArabic ? "نشط" : "Active"}</span>
                    )}
                  </td>
                  <td>
                    <div className="actionButtons">
                      <button type="button" className="smallBtn" onClick={() => onOpenProfile(profile)}>
                        {isArabic ? "الملف" : "Profile"}
                      </button>
                      {profile.source === "inferred" ? (
                        <button
                          type="button"
                          className="printBtn"
                          onClick={() => onRegisterInferred(profile)}
                        >
                          {isArabic ? "تسجيل" : "Register"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
