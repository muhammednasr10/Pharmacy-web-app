import type { CrmCustomerProfile } from "../../types";
import { getCustomerSegmentLabel } from "../../utils/crmLabels";
import CustomerCrmListRow from "./CustomerCrmListRow";

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
  onEditCustomer: (profile: CrmCustomerProfile) => void;
  onDeleteCustomer: (profile: CrmCustomerProfile) => void;
  onRegisterInferred: (profile: CrmCustomerProfile) => void;
  getPaymentLabel: (method: string) => string;
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
  onEditCustomer,
  onDeleteCustomer,
  onRegisterInferred,
  getPaymentLabel,
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
                <th>{isArabic ? "اسم العميل" : "Customer name"}</th>
                <th>{isArabic ? "العنوان" : "Address"}</th>
                <th>{isArabic ? "رقم التليفون" : "Phone"}</th>
                <th>{isArabic ? "قيمة الشراء" : "Purchase value"}</th>
                <th>{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th>{isArabic ? "نوع العميل" : "Customer type"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <CustomerCrmListRow
                  key={`${profile.id}-${profile.name}`}
                  isArabic={isArabic}
                  currency={currency}
                  profile={profile}
                  onOpenProfile={onOpenProfile}
                  onEditCustomer={onEditCustomer}
                  onDeleteCustomer={onDeleteCustomer}
                  onRegisterInferred={onRegisterInferred}
                  getPaymentLabel={getPaymentLabel}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
