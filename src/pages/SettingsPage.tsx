import type { Dispatch, SetStateAction } from "react";
import type { ActivityLog, PharmacySettings, AppUser } from "../types";

type SettingsForm = {
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  invoiceFooter: string;
  subscriptionPlan: string;
  subscriptionEndDate: string;
  logoBase64: string;
};

type SettingsPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  settingsForm: SettingsForm;
  setSettingsForm: Dispatch<SetStateAction<SettingsForm>>;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  getSubscriptionPlanLabel: (plan: string) => string;
  renewSubscription: (days: number) => Promise<void>;
  hasRole: (roles: AppUser["role"][]) => boolean;
  subscriptionRenewLogs: ActivityLog[];
  handleLogoUpload: (file: File | null) => void;
  savePharmacySettings: () => Promise<void>;
  exportBackupCSV: () => void;
};

export default function SettingsPage({
  isArabic,
  t,
  settingsForm,
  setSettingsForm,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  getSubscriptionPlanLabel,
  renewSubscription,
  hasRole,
  subscriptionRenewLogs,
  handleLogoUpload,
  savePharmacySettings,
  exportBackupCSV,
}: SettingsPageProps) {
  return (
    <section className="card settingsPage">
      <div className="cardHeader">
        <h2>{isArabic ? "إعدادات الصيدلية" : "Pharmacy Settings"}</h2>
      </div>

      <div
        className={
          isSubscriptionExpired
            ? "subscriptionStatusCard expired"
            : isSubscriptionExpiringSoon
            ? "subscriptionStatusCard warning"
            : "subscriptionStatusCard active"
        }
      >
        <div>
          <span>{isArabic ? "حالة الاشتراك" : "Subscription Status"}</span>
          <strong>
            {isSubscriptionExpired
              ? isArabic
                ? "منتهي"
                : "Expired"
              : isSubscriptionExpiringSoon
              ? isArabic
                ? "قرب الانتهاء"
                : "Expiring Soon"
              : isArabic
              ? "نشط"
              : "Active"}
          </strong>
        </div>

        <div>
          <span>{isArabic ? "الخطة" : "Plan"}</span>
          <strong>{getSubscriptionPlanLabel(settingsForm.subscriptionPlan)}</strong>
        </div>

        <div>
          <span>{isArabic ? "تاريخ الانتهاء" : "End Date"}</span>
          <strong>{settingsForm.subscriptionEndDate || "-"}</strong>
        </div>

        <div>
          <span>{isArabic ? "الأيام المتبقية" : "Days Left"}</span>
          <strong>
            {settingsForm.subscriptionEndDate === ""
              ? "-"
              : isSubscriptionExpired
              ? isArabic
                ? "منتهي"
                : "Expired"
              : isSubscriptionExpiringSoon
              ? isArabic
                ? "قرب الانتهاء"
                : "Expiring Soon"
              : isArabic
              ? "نشط"
              : "Active"}
          </strong>
        </div>

        {hasRole(["admin"]) && (
          <div className="renewActions">
            <button className="renewBtn" onClick={() => renewSubscription(30)}>
              {isArabic ? "30 يوم" : "30 Days"}
            </button>

            <button className="renewBtn" onClick={() => renewSubscription(90)}>
              {isArabic ? "3 شهور" : "3 Months"}
            </button>

            <button className="renewBtn" onClick={() => renewSubscription(365)}>
              {isArabic ? "سنة" : "1 Year"}
            </button>
          </div>
        )}
      </div>

      <div className="settingsSectionTitle">
        <h3>{isArabic ? "سجل تجديدات الاشتراك" : "Subscription Renewal History"}</h3>
        <p>
          {isArabic
            ? "آخر عمليات تجديد الاشتراك"
            : "Latest subscription renewal actions"}
        </p>
      </div>

      {subscriptionRenewLogs.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد تجديدات حتى الآن" : "No renewals yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "الوصف" : "Description"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionRenewLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.description}</td>
                  <td>{log.userName || "-"}</td>
                  <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="settingsForm">
        <div className="settingsSectionTitle">
          <h3>{isArabic ? "بيانات الصيدلية" : "Pharmacy Information"}</h3>
          <p>{isArabic ? "الاسم، الهاتف، العنوان والعملة" : "Name, phone, address and currency"}</p>
        </div>

        <label>{isArabic ? "اسم الصيدلية" : "Pharmacy Name"}</label>
        <input
          value={settingsForm.name}
          onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
          placeholder={isArabic ? "اسم الصيدلية" : "Pharmacy name"}
        />

        <label>{isArabic ? "اسم الصيدلية بالإنجليزي" : "English Name"}</label>
        <input
          value={settingsForm.name_en}
          onChange={(e) => setSettingsForm({ ...settingsForm, name_en: e.target.value })}
          placeholder={isArabic ? "الاسم بالإنجليزي" : "English name"}
        />

        <label>{isArabic ? "رقم الهاتف" : "Phone"}</label>
        <input
          value={settingsForm.phone}
          onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
          placeholder={isArabic ? "رقم الهاتف" : "Phone"}
        />

        <label>{isArabic ? "العنوان" : "Address"}</label>
        <input
          value={settingsForm.address}
          onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
          placeholder={isArabic ? "العنوان" : "Address"}
        />

        <label>{isArabic ? "العملة" : "Currency"}</label>
        <input
          value={settingsForm.currency}
          onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
          placeholder={isArabic ? "ج.م" : "EGP"}
        />

        <div className="settingsSectionTitle">
          <h3>{isArabic ? "بيانات الفاتورة" : "Invoice Settings"}</h3>
          <p>{isArabic ? "النص الذي يظهر أسفل الفواتير والتقارير" : "Footer text shown on invoices and reports"}</p>
        </div>

        <label>{isArabic ? "نص أسفل الفاتورة" : "Invoice Footer"}</label>
        <textarea
          value={settingsForm.invoiceFooter}
          onChange={(e) => setSettingsForm({ ...settingsForm, invoiceFooter: e.target.value })}
          placeholder={isArabic ? "شكراً لزيارتكم" : "Thank you"}
        />

        <div className="settingsSectionTitle">
          <h3>{isArabic ? "اللوجو" : "Logo"}</h3>
          <p>{isArabic ? "يظهر في التطبيق والفواتير والتقارير" : "Shown in the app, invoices and reports"}</p>
        </div>

        <label>{isArabic ? "لوجو الصيدلية" : "Pharmacy Logo"}</label>
        <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)} />

        {settingsForm.logoBase64 && (
          <>
            <div className="settingsLogoPreview">
              <img src={settingsForm.logoBase64} alt="Pharmacy logo" />
            </div>

            <button
              type="button"
              className="deleteSmallBtn"
              onClick={() => setSettingsForm({ ...settingsForm, logoBase64: "" })}
            >
              {isArabic ? "حذف اللوجو" : "Remove Logo"}
            </button>
          </>
        )}

        <div className="settingsSectionTitle">
          <h3>{isArabic ? "الاشتراك والترخيص" : "Subscription & License"}</h3>
          <p>{isArabic ? "إدارة خطة الاشتراك وتاريخ الانتهاء" : "Manage plan and expiry date"}</p>
        </div>

        <label>{isArabic ? "خطة الاشتراك" : "Subscription Plan"}</label>
        <select
          value={settingsForm.subscriptionPlan}
          onChange={(e) => setSettingsForm({ ...settingsForm, subscriptionPlan: e.target.value })}
        >
          <option value="monthly">{isArabic ? "شهري" : "Monthly"}</option>
          <option value="quarterly">{isArabic ? "ربع سنوي" : "Quarterly"}</option>
          <option value="yearly">{isArabic ? "سنوي" : "Yearly"}</option>
          <option value="lifetime">{isArabic ? "مدى الحياة" : "Lifetime"}</option>
        </select>

        <label>{isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription End Date"}</label>
        <input
          type="date"
          value={settingsForm.subscriptionEndDate}
          onChange={(e) => setSettingsForm({ ...settingsForm, subscriptionEndDate: e.target.value })}
        />

        <div className="settingsSectionTitle">
          <h3>{isArabic ? "أدوات النظام" : "System Tools"}</h3>
          <p>{isArabic ? "حفظ الإعدادات وتصدير النسخة الاحتياطية" : "Save settings and export backup"}</p>
        </div>

        <button className="completeBtn" onClick={savePharmacySettings}>
          {isArabic ? "حفظ الإعدادات" : "Save Settings"}
        </button>
        {hasRole(["admin"]) && (
          <button className="printBtn" onClick={exportBackupCSV}>
            {isArabic ? "تصدير نسخة احتياطية" : "Export Backup"}
          </button>
        )}
      </div>
    </section>
  );
}
