import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActivityLog, AppUser, SubscriptionRequest } from "../types";
import DeveloperCredit from "../components/DeveloperCredit";
import CustomerSupportPanel from "../components/CustomerSupportPanel";
import PayrollSettingsPanel from "../components/PayrollSettingsPanel";
import EmployeeSettingsPanel from "../components/EmployeeSettingsPanel";
import SubscriptionSettingsPanel from "../components/settings/SubscriptionSettingsPanel";
import { type SubscriptionTier } from "../config/subscriptionTiers";
import DisplayPreferencesPanel from "../components/DisplayPreferencesPanel";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";

export type SettingsTab =
  | "pharmacy"
  | "invoice"
  | "inventory"
  | "employees"
  | "payroll"
  | "subscription"
  | "display"
  | "support";

export type SettingsForm = {
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  invoiceFooter: string;
  subscriptionPlan: string;
  subscriptionEndDate: string;
  logoBase64: string;
  lowStockThreshold: number;
  expiringSoonDays: number;
  expiryNotifyEnabled: boolean;
  expiryNotifyPhone: string;
  expiryNotifyEmail: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
};

type SettingsPageProps = {
  isArabic: boolean;
  pharmacyId: string;
  appUser: AppUser | null;
  initialTab?: SettingsTab;
  t: Record<string, string>;
  settingsForm: SettingsForm;
  setSettingsForm: Dispatch<SetStateAction<SettingsForm>>;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription?: boolean;
  getSubscriptionPlanLabel: (plan: string) => string;
  subscriptionTierLabel?: string;
  subscriptionTier?: SubscriptionTier;
  submitSubscriptionRequest: (input: {
    plan: string;
    days: number;
    amount: number;
  }) => Promise<SubscriptionRequest | null>;
  submitTierUpgradeRequest?: (targetTier: SubscriptionTier) => Promise<SubscriptionRequest | null>;
  pharmacySubscriptionRequests: SubscriptionRequest[];
  hasRole: (roles: AppUser["role"][]) => boolean;
  subscriptionRenewLogs: ActivityLog[];
  subscriptionDaysLeft: number | string | null;
  handleLogoUpload: (file: File | null) => void;
  savePharmacySettings: () => Promise<void>;
  exportBackupCSV: () => void;
  onRequestExpiryNotificationPermission?: () => Promise<boolean>;
  onSendExpiryNotifyNow?: () => Promise<void>;
  onOpenExpiryWhatsappDigest?: () => void;
  onOpenExpiryEmailDigest?: () => void;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  onThemeModeChange: (mode: ThemeMode) => void;
  onFontScaleChange: (scale: FontScale) => void;
};

export default function SettingsPage({
  isArabic,
  pharmacyId,
  appUser,
  initialTab,
  t,
  settingsForm,
  setSettingsForm,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription = false,
  getSubscriptionPlanLabel,
  subscriptionTierLabel,
  subscriptionTier = "basic",
  submitSubscriptionRequest,
  submitTierUpgradeRequest,
  pharmacySubscriptionRequests,
  hasRole,
  subscriptionRenewLogs,
  subscriptionDaysLeft,
  handleLogoUpload,
  savePharmacySettings,
  exportBackupCSV,
  onRequestExpiryNotificationPermission,
  onSendExpiryNotifyNow,
  onOpenExpiryWhatsappDigest,
  onOpenExpiryEmailDigest,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("pharmacy");
  const isOrgAdmin = hasRole(["pharmacy_admin", "super_admin"]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const allTabs: { id: SettingsTab; ar: string; en: string }[] = [
    { id: "pharmacy", ar: "بيانات الصيدلية", en: "Pharmacy" },
    { id: "invoice", ar: "بيانات الفاتورة", en: "Invoice" },
    { id: "inventory", ar: "انتهاء المخزون", en: "Inventory Alerts" },
    { id: "employees", ar: "إعدادات الموظفين", en: "Employee Settings" },
    { id: "payroll", ar: "إعدادات المرتبات", en: "Payroll" },
    { id: "subscription", ar: "الاشتراك والترخيص", en: "Subscription" },
    { id: "display", ar: "المظهر والخط", en: "Display" },
    { id: "support", ar: "خدمة العملاء", en: "Customer Support" },
  ];

  const tabs = isOrgAdmin
    ? allTabs
    : allTabs.filter(
        (tab) =>
          tab.id === "pharmacy" ||
          tab.id === "invoice" ||
          tab.id === "display" ||
          tab.id === "support",
      );

  function renderSaveActions(showBackup = false) {
    return (
      <div className="settingsActions">
        <button type="button" className="completeBtn" onClick={() => void savePharmacySettings()}>
          {isArabic ? "حفظ الإعدادات" : "Save Settings"}
        </button>
        {showBackup && isOrgAdmin && (
          <button type="button" className="printBtn" onClick={exportBackupCSV}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير نسخة احتياطية" : "Export Backup"}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="card settingsPage">
      <div className="cardHeader">
        <div>
          <h2>{isArabic ? "إعدادات الصيدلية" : "Pharmacy Settings"}</h2>
          <p className="returnsSectionHint">
            {!isOrgAdmin
              ? isArabic
                ? "مدير الفرع: يمكنك تعديل بيانات الفرع والفاتورة فقط"
                : "Branch manager: you can edit branch contact and invoice settings only"
              : isArabic
                ? "اختر القسم الذي تريد تعديله"
                : "Choose the section you want to edit"}
          </p>
        </div>
      </div>

      <nav
        className="settingsTabsNav"
        aria-label={isArabic ? "أقسام الإعدادات" : "Settings sections"}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settingsTabBtn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {isArabic ? tab.ar : tab.en}
          </button>
        ))}
      </nav>

      {activeTab === "pharmacy" && (
        <div className="settingsForm settingsTabPanel">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "بيانات الصيدلية" : "Pharmacy Information"}</h3>
            <p>
              {isArabic
                ? "الاسم، الهاتف، العنوان، العملة ولوجو الصيدلية"
                : "Name, phone, address, currency and pharmacy logo"}
            </p>
          </div>

          <div className="settingsLogoBlock">
            <label>{isArabic ? "لوجو الصيدلية" : "Pharmacy Logo"}</label>
            <div className="settingsLogoRow">
              <div className="settingsLogoPreview">
                {settingsForm.logoBase64 ? (
                  <img
                    src={settingsForm.logoBase64}
                    alt={isArabic ? "لوجو الصيدلية" : "Pharmacy logo"}
                  />
                ) : (
                  <span className="settingsLogoPlaceholder">
                    {isArabic ? "لا يوجد لوجو" : "No logo"}
                  </span>
                )}
              </div>
              <div className="settingsLogoActions">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  id="pharmacy-logo-upload"
                  className="settingsLogoInput"
                  onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                />
                <label htmlFor="pharmacy-logo-upload" className="printBtn settingsLogoUploadBtn">
                  {isArabic ? "رفع لوجو" : "Upload Logo"}
                </label>
                {settingsForm.logoBase64 && (
                  <button
                    type="button"
                    className="deleteSmallBtn"
                    onClick={() => setSettingsForm({ ...settingsForm, logoBase64: "" })}
                  >
                    {isArabic ? "حذف اللوجو" : "Remove Logo"}
                  </button>
                )}
              </div>
            </div>
            <p className="settingsFieldHint">
              {isArabic
                ? "PNG أو JPG — حتى 2 ميجابايت. يُحفظ في Supabase عند الضغط على «حفظ الإعدادات»"
                : "PNG or JPG — up to 2 MB. Saved to Supabase when you click Save Settings"}
            </p>
          </div>

          <div className="settingsFieldsGrid">
            <div className="settingsField">
              <label>{isArabic ? "اسم الصيدلية" : "Pharmacy Name"}</label>
              <input
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                placeholder={isArabic ? "اسم الصيدلية" : "Pharmacy name"}
              />
            </div>

            <div className="settingsField">
              <label>{isArabic ? "اسم الصيدلية بالإنجليزي" : "English Name"}</label>
              <input
                value={settingsForm.name_en}
                onChange={(e) => setSettingsForm({ ...settingsForm, name_en: e.target.value })}
                placeholder={isArabic ? "الاسم بالإنجليزي" : "English name"}
              />
            </div>

            <div className="settingsField">
              <label>{isArabic ? "رقم الهاتف" : "Phone"}</label>
              <input
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                placeholder={isArabic ? "رقم الهاتف" : "Phone"}
              />
            </div>

            <div className="settingsField">
              <label>{isArabic ? "العنوان" : "Address"}</label>
              <input
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                placeholder={isArabic ? "العنوان" : "Address"}
              />
            </div>

            <div className="settingsField">
              <label>{isArabic ? "العملة" : "Currency"}</label>
              <input
                value={settingsForm.currency}
                onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                placeholder={isArabic ? "ج.م" : "EGP"}
              />
            </div>
          </div>

          {renderSaveActions(true)}

          <div className="settingsSectionTitle">
            <h3>{isArabic ? "عن المطوّر" : "About the Developer"}</h3>
            <p>{isArabic ? "الدعم الفني والتطوير" : "Technical support & development"}</p>
          </div>
          <div className="settingsFieldFull">
            <DeveloperCredit isArabic={isArabic} variant="inline" />
          </div>
        </div>
      )}

      {activeTab === "invoice" && (
        <div className="settingsForm settingsTabPanel">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "بيانات الفاتورة" : "Invoice Settings"}</h3>
            <p>
              {isArabic
                ? "النص الذي يظهر أسفل الفواتير والتقارير"
                : "Footer text shown on invoices and reports"}
            </p>
          </div>

          <div className="settingsField settingsFieldFull">
            <label>{isArabic ? "نص أسفل الفاتورة" : "Invoice Footer"}</label>
            <textarea
              value={settingsForm.invoiceFooter}
              onChange={(e) => setSettingsForm({ ...settingsForm, invoiceFooter: e.target.value })}
              placeholder={isArabic ? "شكراً لزيارتكم" : "Thank you"}
            />
          </div>

          {renderSaveActions()}
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="settingsForm settingsTabPanel">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "تنبيهات انتهاء المخزون" : "Inventory Alert Rules"}</h3>
            <p>
              {isArabic
                ? "تحكم في ظهور كروت «أدوية ناقصة» و«قرب انتهاء الصلاحية» في لوحة التحكم والمخزون"
                : "Control low stock and expiring soon cards on dashboard and inventory"}
            </p>
          </div>

          {isOrgAdmin ? (
            <div className="settingsFieldsGrid">
              <div className="settingsField">
                <label>{isArabic ? "حد الكمية الناقصة" : "Low Stock Threshold"}</label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.lowStockThreshold}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      lowStockThreshold: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  placeholder={isArabic ? "مثال: 20" : "e.g. 20"}
                />
                <p className="settingsFieldHint">
                  {isArabic
                    ? "أي دواء كميته أقل من أو تساوي هذا الرقم يظهر في كارت «أدوية ناقصة»"
                    : "Medicines with qty at or below this value appear in the low stock card"}
                </p>
              </div>

              <div className="settingsField">
                <label>{isArabic ? "أيام قرب انتهاء الصلاحية" : "Expiring Soon (Days)"}</label>
                <input
                  type="number"
                  min="1"
                  value={settingsForm.expiringSoonDays}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      expiringSoonDays: e.target.value === "" ? 1 : Number(e.target.value),
                    })
                  }
                  placeholder={isArabic ? "مثال: 30" : "e.g. 30"}
                />
                <p className="settingsFieldHint">
                  {isArabic
                    ? "الأدوية التي تنتهي صلاحيتها خلال هذا العدد من الأيام تظهر في كارت «قرب انتهاء الصلاحية»"
                    : "Medicines expiring within this many days appear in the expiring soon card"}
                </p>
              </div>

              <div className="settingsField settingsFieldFull">
                <div className="settingsSectionTitle settingsSectionTitle--compact">
                  <h3>{isArabic ? "إشعارات انتهاء الصلاحية" : "Expiry Notifications"}</h3>
                  <p>
                    {isArabic
                      ? "تنبيه يومي عند فتح النظام + إرسال يدوي عبر واتساب أو بريد"
                      : "Daily alert on login plus manual WhatsApp or email digest"}
                  </p>
                </div>
              </div>

              <div className="settingsField">
                <label className="settingsCheckboxLabel">
                  <input
                    type="checkbox"
                    checked={settingsForm.expiryNotifyEnabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        expiryNotifyEnabled: e.target.checked,
                      })
                    }
                  />
                  <span>{isArabic ? "تفعيل التنبيهات اليومية" : "Enable daily alerts"}</span>
                </label>
                <p className="settingsFieldHint">
                  {isArabic
                    ? "مرة واحدة يومياً عند دخول المدير — إشعار المتصفح + webhook إن وُجد"
                    : "Once per day when a manager logs in — browser notification + optional webhook"}
                </p>
              </div>

              <div className="settingsField">
                <label>
                  {isArabic ? "واتساب للتنبيهات (اختياري)" : "WhatsApp number (optional)"}
                </label>
                <input
                  type="text"
                  value={settingsForm.expiryNotifyPhone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, expiryNotifyPhone: e.target.value })
                  }
                  placeholder={
                    isArabic
                      ? "اتركه فارغاً لاستخدام هاتف الصيدلية"
                      : "Leave empty to use pharmacy phone"
                  }
                />
              </div>

              <div className="settingsField">
                <label>{isArabic ? "بريد للتنبيهات (اختياري)" : "Alert email (optional)"}</label>
                <input
                  type="email"
                  value={settingsForm.expiryNotifyEmail}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, expiryNotifyEmail: e.target.value })
                  }
                  placeholder={isArabic ? "example@mail.com" : "example@mail.com"}
                />
              </div>

              <div className="settingsField settingsFieldFull expiryNotifyActions">
                {onRequestExpiryNotificationPermission && (
                  <button
                    type="button"
                    className="alertFooterBtn"
                    onClick={() => void onRequestExpiryNotificationPermission()}
                  >
                    {isArabic ? "تفعيل إشعارات المتصفح" : "Enable browser notifications"}
                  </button>
                )}
                {onSendExpiryNotifyNow && (
                  <button
                    type="button"
                    className="alertFooterBtn"
                    onClick={() => void onSendExpiryNotifyNow()}
                  >
                    {isArabic ? "إرسال تنبيه الآن" : "Send alert now"}
                  </button>
                )}
                {onOpenExpiryWhatsappDigest && (
                  <button
                    type="button"
                    className="alertFooterBtn"
                    onClick={onOpenExpiryWhatsappDigest}
                  >
                    {isArabic ? "ملخص واتساب" : "WhatsApp digest"}
                  </button>
                )}
                {onOpenExpiryEmailDigest && settingsForm.expiryNotifyEmail.trim() && (
                  <button
                    type="button"
                    className="alertFooterBtn"
                    onClick={onOpenExpiryEmailDigest}
                  >
                    {isArabic ? "ملخص بريد" : "Email digest"}
                  </button>
                )}
              </div>

              {renderSaveActions()}
            </div>
          ) : (
            <p className="empty">
              {isArabic
                ? "تعديل تنبيهات المخزون متاح للأدمن فقط"
                : "Only admin can edit inventory alerts"}
            </p>
          )}
        </div>
      )}

      {activeTab === "employees" && (
        <EmployeeSettingsPanel
          isArabic={isArabic}
          pharmacyId={pharmacyId}
          appUser={appUser}
          canEdit={isOrgAdmin}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          savePharmacySettings={savePharmacySettings}
        />
      )}

      {activeTab === "payroll" && (
        <PayrollSettingsPanel isArabic={isArabic} pharmacyId={pharmacyId} canEdit={isOrgAdmin} />
      )}

      {activeTab === "subscription" && (
        <SubscriptionSettingsPanel
          isArabic={isArabic}
          isOrgAdmin={isOrgAdmin}
          t={t}
          settingsForm={{
            subscriptionPlan: settingsForm.subscriptionPlan,
            subscriptionEndDate: settingsForm.subscriptionEndDate,
          }}
          isSubscriptionExpired={isSubscriptionExpired}
          isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
          isTrialSubscription={isTrialSubscription}
          getSubscriptionPlanLabel={getSubscriptionPlanLabel}
          subscriptionTierLabel={subscriptionTierLabel}
          subscriptionTier={subscriptionTier}
          submitSubscriptionRequest={submitSubscriptionRequest}
          submitTierUpgradeRequest={submitTierUpgradeRequest}
          pharmacySubscriptionRequests={pharmacySubscriptionRequests}
          subscriptionRenewLogs={subscriptionRenewLogs}
          subscriptionDaysLeft={subscriptionDaysLeft}
        />
      )}

      {activeTab === "display" && (
        <div className="settingsTabPanel">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "المظهر وحجم الخط" : "Appearance & font size"}</h3>
            <p>
              {isArabic
                ? "خصّص الوضع الداكن وحجم النص لراحة العين أثناء العمل"
                : "Customize dark mode and text size for comfortable daily use"}
            </p>
          </div>
          <DisplayPreferencesPanel
            isArabic={isArabic}
            themeMode={themeMode}
            fontScale={fontScale}
            resolvedTheme={resolvedTheme}
            onThemeModeChange={onThemeModeChange}
            onFontScaleChange={onFontScaleChange}
          />
        </div>
      )}

      {activeTab === "support" && (
        <div className="settingsForm settingsTabPanel">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "خدمة العملاء" : "Customer Support"}</h3>
            <p>
              {isArabic
                ? "تواصل مع فريق الدعم الفني عبر واتساب لأي استفسار أو مشكلة في النظام"
                : "Reach our support team on WhatsApp for any question or system issue"}
            </p>
          </div>
          <CustomerSupportPanel
            isArabic={isArabic}
            variant="settings"
            pharmacyName={isArabic ? settingsForm.name : settingsForm.name_en || settingsForm.name}
            userName={appUser?.name || appUser?.email || undefined}
            userEmail={appUser?.email}
            userRole={appUser?.role}
          />
          <div className="settingsSectionTitle settingsSectionTitleSpaced">
            <h3>{isArabic ? "عن المطوّر" : "About the Developer"}</h3>
            <p>{isArabic ? "الدعم الفني والتطوير" : "Technical support & development"}</p>
          </div>
          <div className="settingsFieldFull">
            <DeveloperCredit isArabic={isArabic} variant="inline" />
          </div>
        </div>
      )}
    </section>
  );
}
