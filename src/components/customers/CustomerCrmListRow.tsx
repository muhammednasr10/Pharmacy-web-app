import type { CrmCustomerProfile } from "../../types";
import { getCustomerSegmentLabel } from "../../utils/crmLabels";
import { paymentBreakdownEntries } from "../../utils/crmPaymentBreakdown";

type Props = {
  isArabic: boolean;
  currency: string;
  profile: CrmCustomerProfile;
  onOpenProfile: (profile: CrmCustomerProfile) => void;
  onEditCustomer: (profile: CrmCustomerProfile) => void;
  onDeleteCustomer: (profile: CrmCustomerProfile) => void;
  onRegisterInferred: (profile: CrmCustomerProfile) => void;
  getPaymentLabel: (method: string) => string;
};

export default function CustomerCrmListRow({
  isArabic,
  currency,
  profile,
  onOpenProfile,
  onEditCustomer,
  onDeleteCustomer,
  onRegisterInferred,
  getPaymentLabel,
}: Props) {
  const breakdown = paymentBreakdownEntries(profile);

  return (
    <tr>
      <td>
        <strong>{profile.name}</strong>
        {profile.source === "inferred" ? (
          <small className="crmInferredBadge">
            {isArabic ? "من الفواتير" : "From invoices"}
          </small>
        ) : null}
      </td>
      <td>{profile.address?.trim() || "—"}</td>
      <td dir="ltr">{profile.phone?.trim() || "—"}</td>
      <td>
        {profile.totalPurchases.toFixed(2)} {currency}
      </td>
      <td>
        <span className="crmInvoiceCountHint">
          {profile.purchaseCount}
          {breakdown.length > 0 ? (
            <span className="crmInvoiceBreakdown" role="tooltip">
              {breakdown.map((entry) => (
                <span key={entry.method} className="crmInvoiceBreakdownRow">
                  <span>{getPaymentLabel(entry.method)}</span>
                  <strong>{entry.count}</strong>
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </td>
      <td>{getCustomerSegmentLabel(profile.segment, isArabic)}</td>
      <td>
        <div className="crmRowActions">
          {profile.source === "inferred" ? (
            <button
              type="button"
              className="printBtn tableIconBtn"
              title={isArabic ? "تسجيل" : "Register"}
              aria-label={isArabic ? "تسجيل العميل" : "Register customer"}
              onClick={() => onRegisterInferred(profile)}
            >
              <span aria-hidden="true">➕</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="printBtn tableIconBtn"
                title={isArabic ? "الملف" : "Profile"}
                aria-label={isArabic ? "الملف" : "Profile"}
                onClick={() => onOpenProfile(profile)}
              >
                <span aria-hidden="true">👤</span>
              </button>
              <button
                type="button"
                className="printBtn tableIconBtn"
                title={isArabic ? "تعديل" : "Edit"}
                aria-label={isArabic ? "تعديل العميل" : "Edit customer"}
                onClick={() => onEditCustomer(profile)}
              >
                <span aria-hidden="true">✏️</span>
              </button>
              <button
                type="button"
                className="deleteSmallBtn tableIconBtn"
                title={isArabic ? "حذف" : "Delete"}
                aria-label={isArabic ? "حذف العميل" : "Delete customer"}
                onClick={() => onDeleteCustomer(profile)}
              >
                <span aria-hidden="true">🗑️</span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
