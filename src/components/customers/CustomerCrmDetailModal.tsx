import { useMemo, useState } from "react";
import type {
  CrmCustomerProfile,
  CustomerActivity,
  CustomerActivityType,
  CustomerPayment,
  Invoice,
} from "../../types";
import {
  CUSTOMER_ACTIVITY_TYPES,
  getCustomerActivityStatusLabel,
  getCustomerActivityTypeLabel,
  getCustomerSegmentLabel,
} from "../../utils/crmLabels";
import { getCustomerActivitiesForProfile, getCustomerInvoices } from "../../utils/crmProfiles";

type CustomerCrmDetailModalProps = {
  isArabic: boolean;
  currency: string;
  profile: CrmCustomerProfile;
  invoices: Invoice[];
  payments: CustomerPayment[];
  activities: CustomerActivity[];
  getPaymentLabel: (method: string) => string;
  onClose: () => void;
  onEdit: () => void;
  onAddActivity: (activity: CustomerActivity) => Promise<void>;
  onUpdateActivityStatus: (id: number, status: CustomerActivity["status"]) => Promise<void>;
  onViewInvoice: (invoice: Invoice) => void;
  appUserName?: string;
  appUserUid?: string;
};

export default function CustomerCrmDetailModal({
  isArabic,
  currency,
  profile,
  invoices,
  payments,
  activities,
  getPaymentLabel,
  onClose,
  onEdit,
  onAddActivity,
  onUpdateActivityStatus,
  onViewInvoice,
  appUserName,
  appUserUid,
}: CustomerCrmDetailModalProps) {
  const [activityType, setActivityType] = useState<CustomerActivityType>("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityBody, setActivityBody] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  const customerInvoices = useMemo(
    () => getCustomerInvoices(profile, invoices),
    [profile, invoices],
  );
  const customerActivities = useMemo(
    () => getCustomerActivitiesForProfile(profile, activities),
    [profile, activities],
  );
  const customerPayments = useMemo(
    () => payments.filter((payment) => payment.customerName === profile.name),
    [payments, profile.name],
  );

  async function submitActivity() {
    if (!activityBody.trim() && !activityTitle.trim()) {
      alert(isArabic ? "أدخل عنواناً أو ملاحظة" : "Enter a title or note");
      return;
    }
    setSavingActivity(true);
    try {
      await onAddActivity({
        id: Date.now(),
        customerId: profile.id > 0 ? profile.id : undefined,
        customerName: profile.name,
        activityType,
        title: activityTitle.trim(),
        body: activityBody.trim(),
        dueDate: activityDueDate || undefined,
        status: activityType === "follow_up" ? "open" : "done",
        createdByUid: appUserUid,
        createdByName: appUserName,
        createdAt: new Date().toISOString(),
      });
      setActivityTitle("");
      setActivityBody("");
      setActivityDueDate("");
      setActivityType("note");
    } finally {
      setSavingActivity(false);
    }
  }

  return (
    <div className="modalOverlay">
      <div className="invoiceModal crmDetailModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{profile.name}</h2>
            <p>
              {getCustomerSegmentLabel(profile.segment, isArabic)}
              {profile.phone ? ` · ${profile.phone}` : ""}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="crmDetailGrid">
          <div className="crmDetailStats">
            <div>
              <span>{isArabic ? "إجمالي المبيعات" : "Total sales"}</span>
              <strong>
                {profile.totalPurchases.toFixed(2)} {currency}
              </strong>
            </div>
            <div>
              <span>{isArabic ? "عدد الطلبات" : "Orders"}</span>
              <strong>{profile.purchaseCount}</strong>
            </div>
            <div>
              <span>{isArabic ? "متوسط الطلب" : "Avg. order"}</span>
              <strong>
                {profile.averageOrderValue.toFixed(2)} {currency}
              </strong>
            </div>
            <div>
              <span>{isArabic ? "المديونية المتبقية" : "Remaining debt"}</span>
              <strong>
                {profile.remainingDebt.toFixed(2)} {currency}
              </strong>
            </div>
          </div>

          <div className="crmDetailSection">
            <div className="crmDetailSectionHead">
              <h3>{isArabic ? "بيانات التواصل" : "Contact info"}</h3>
              <button type="button" className="smallBtn" onClick={onEdit}>
                {isArabic ? "تعديل" : "Edit"}
              </button>
            </div>
            <div className="crmDetailInfoList">
              <p>
                <span>{isArabic ? "البريد" : "Email"}</span>
                <strong dir="ltr">{profile.email || "—"}</strong>
              </p>
              <p>
                <span>{isArabic ? "العنوان" : "Address"}</span>
                <strong>{profile.address || "—"}</strong>
              </p>
              <p>
                <span>{isArabic ? "ملاحظات" : "Notes"}</span>
                <strong>{profile.notes || "—"}</strong>
              </p>
              {profile.tags?.length ? (
                <div className="crmTagList">
                  {profile.tags.map((tag) => (
                    <span key={tag} className="crmTag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="crmDetailSection">
            <h3>{isArabic ? "إضافة نشاط" : "Add activity"}</h3>
            <div className="formGrid crmActivityForm">
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as CustomerActivityType)}>
                {CUSTOMER_ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getCustomerActivityTypeLabel(type, isArabic)}
                  </option>
                ))}
              </select>
              <input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder={isArabic ? "العنوان" : "Title"}
              />
              {activityType === "follow_up" ? (
                <input
                  type="date"
                  value={activityDueDate}
                  onChange={(e) => setActivityDueDate(e.target.value)}
                />
              ) : null}
              <textarea
                className="fullWidth"
                rows={3}
                value={activityBody}
                onChange={(e) => setActivityBody(e.target.value)}
                placeholder={isArabic ? "التفاصيل" : "Details"}
              />
              <button
                type="button"
                className="smallBtn"
                disabled={savingActivity}
                onClick={() => void submitActivity()}
              >
                {savingActivity ? "…" : isArabic ? "حفظ النشاط" : "Save activity"}
              </button>
            </div>
          </div>

          <div className="crmDetailSection">
            <h3>{isArabic ? "سجل النشاط" : "Activity timeline"}</h3>
            {customerActivities.length === 0 ? (
              <p className="empty">{isArabic ? "لا يوجد نشاط بعد" : "No activity yet"}</p>
            ) : (
              <div className="crmTimeline">
                {customerActivities.map((activity) => (
                  <article key={activity.id} className="crmTimelineItem">
                    <div className="crmTimelineHead">
                      <strong>{getCustomerActivityTypeLabel(activity.activityType, isArabic)}</strong>
                      <span>{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : "—"}</span>
                    </div>
                    {activity.title ? <p className="crmTimelineTitle">{activity.title}</p> : null}
                    {activity.body ? <p>{activity.body}</p> : null}
                    {activity.dueDate ? (
                      <small>
                        {isArabic ? "موعد المتابعة:" : "Due:"} {activity.dueDate}
                      </small>
                    ) : null}
                    {activity.activityType === "follow_up" && activity.status === "open" ? (
                      <button
                        type="button"
                        className="smallBtn"
                        onClick={() => void onUpdateActivityStatus(activity.id, "done")}
                      >
                        {isArabic ? "تمت المتابعة" : "Mark done"}
                      </button>
                    ) : (
                      <small>{getCustomerActivityStatusLabel(activity.status, isArabic)}</small>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="crmDetailSection">
            <h3>{isArabic ? "سجل المبيعات" : "Purchase history"}</h3>
            {customerInvoices.length === 0 ? (
              <p className="empty">{isArabic ? "لا توجد فواتير" : "No invoices"}</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{isArabic ? "الفاتورة" : "Invoice"}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                      <th>{isArabic ? "الإجمالي" : "Total"}</th>
                      <th>{isArabic ? "الدفع" : "Payment"}</th>
                      <th>{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.slice(0, 20).map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{invoice.date}</td>
                        <td>
                          {Number(invoice.total || 0).toFixed(2)} {currency}
                        </td>
                        <td>{getPaymentLabel(invoice.paymentMethod)}</td>
                        <td>
                          <button type="button" className="smallBtn" onClick={() => onViewInvoice(invoice)}>
                            {isArabic ? "عرض" : "View"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="crmDetailSection">
            <h3>{isArabic ? "التحصيلات" : "Payments"}</h3>
            {customerPayments.length === 0 ? (
              <p className="empty">{isArabic ? "لا توجد تحصيلات" : "No payments"}</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{isArabic ? "رقم التحصيل" : "Payment #"}</th>
                      <th>{isArabic ? "المبلغ" : "Amount"}</th>
                      <th>{isArabic ? "الطريقة" : "Method"}</th>
                      <th>{isArabic ? "التاريخ" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.paymentNumber}</td>
                        <td>
                          {Number(payment.amount || 0).toFixed(2)} {currency}
                        </td>
                        <td>{getPaymentLabel(payment.paymentMethod || "cash")}</td>
                        <td>{payment.date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
