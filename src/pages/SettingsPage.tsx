import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActivityLog, AppUser, SubscriptionRequest } from "../types";
import DeveloperCredit from "../components/DeveloperCredit";
import CustomerSupportPanel from "../components/CustomerSupportPanel";
import EmployeeSettingsPanel from "../components/EmployeeSettingsPanel";
import WorkHoursSettingsPanel from "../components/WorkHoursSettingsPanel";
import SubscriptionSettingsPanel from "../components/settings/SubscriptionSettingsPanel";
import { type SubscriptionTier } from "../config/subscriptionTiers";
import DisplayPreferencesPanel from "../components/DisplayPreferencesPanel";
import SystemHealthPanel from "../components/SystemHealthPanel";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";

export type SettingsTab =
  | "pharmacy"
  | "invoice"
  | "store"
  | "employees"
  /** @deprecated Use "store" — kept for deep-link compatibility */
  | "inventory"
  /** @deprecated Use "employees" — kept for deep-link compatibility */
  | "payroll"
  | "workHours"
  | "subscription"
  | "display"
  | "support"
  | "health";

function normalizeSettingsTab(tab: SettingsTab): SettingsTab {
  if (tab === "inventory") return "store";
  if (tab === "payroll") return "employees";
  return tab;
}

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
  maxBranches?: number;
  maxUsers?: number;
  staffAddonEnabled?: boolean;
  customersAddonEnabled?: boolean;
  investmentAddonEnabled?: boolean;
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
  maxBranches = 1,
  maxUsers = 1,
  staffAddonEnabled = false,
  customersAddonEnabled = false,
  investmentAddonEnabled = false,
  submitSubscriptionRequest,
  submitTierUpgradeRequest,
  pharmacySubscriptionRequests,
  hasRole,
  subscriptionRenewLogs,
  subscriptionDaysLeft,
  handleLogoUpload,
  savePharmacySettings,
  exportBackupCSV,
  themeMode,
  fontScale,
  resolvedTheme,
  onThemeModeChange,
  onFontScaleChange,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("pharmacy");
  const isOrgAdmin = hasRole(["pharmacy_admin", "super_admin"]);
  const isStoreSettingsTab = activeTab === "store";
  const isEmployeeSettingsTab = activeTab === "employees";

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeSettingsTab(initialTab));
    }
  }, [initialTab]);

  const allTabs: { id: SettingsTab; ar: string; en: string }[] = [
    { id: "pharmacy", ar: "بيانات الصيدلية", en: "Pharmacy" },
    { id: "invoice", ar: "بيانات الفاتورة", en: "Invoice" },
    { id: "store", ar: "إعدادات المخزن", en: "Store Settings" },
    { id: "employees", ar: "إعدادات الموظفين", en: "Employee Settings" },
    { id: "workHours", ar: "مواعيد العمل", en: "Work Hours" },
    { id: "subscription", ar: "الاشتراك والترخيص", en: "Subscription" },
    { id: "display", ar: "المظهر والخط", en: "Display" },
    { id: "health", ar: "صحة النظام", en: "System Health" },
    { id: "support", ar: "خدمة العملاء", en: "Customer Support" },
  ];

  const tabs = isOrgAdmin
    ? allTabs
    : allTabs.filter(
        (tab) =>
          tab.id === "pharmacy" ||
          tab.id === "invoice" ||
          tab.id === "display" ||
          tab.id === "health" ||
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
            <div className="settingsField settingsField--lg">
              <label>{isArabic ? "اسم الصيدلية" : "Pharmacy Name"}</label>
              <input
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                placeholder={isArabic ? "اسم الصيدلية" : "Pharmacy name"}
              />
            </div>

            <div className="settingsField settingsField--lg">
              <label>{isArabic ? "اسم الصيدلية بالإنجليزي" : "English Name"}</label>
              <input
                value={settingsForm.name_en}
                onChange={(e) => setSettingsForm({ ...settingsForm, name_en: e.target.value })}
                placeholder={isArabic ? "الاسم بالإنجليزي" : "English name"}
              />
            </div>

            <div className="settingsField settingsField--md">
              <label>{isArabic ? "رقم الهاتف" : "Phone"}</label>
              <input
                type="tel"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                placeholder={isArabic ? "رقم الهاتف" : "Phone"}
              />
            </div>

            <div className="settingsField settingsField--lg">
              <label>{isArabic ? "العنوان" : "Address"}</label>
              <input
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                placeholder={isArabic ? "العنوان" : "Address"}
              />
            </div>

            <div className="settingsField settingsField--xs">
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

      {isStoreSettingsTab && (
        <div className="settingsForm settingsTabPanel storeAlertsSettings">
          <div className="settingsSectionTitle">
            <h3>{isArabic ? "تنبيهات المخزون" : "Inventory alerts"}</h3>
            <p>
              {isArabic
                ? "تحدد متى يظهر الدواء في كروت الناقص وقرب الانتهاء (لوحة التحكم وجرس الإشعارات)"
                : "When medicines appear in low-stock and expiring cards (dashboard and notification bell)"}
            </p>
          </div>

          {isOrgAdmin ? (
            <>
              <section className="storeAlertsCard">
                <div className="settingsFieldsGrid storeAlertsThresholds">
                  <div className="settingsField storeAlertsField">
                    <label>{isArabic ? "حد الكمية الناقصة" : "Low stock threshold"}</label>
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
                    <p className="storeAlertsFieldHint">
                      {isArabic ? (
                        <>
                          أي دواء كميته <strong>أقل من أو تساوي</strong> الرقم ده يظهر في كارت
                          «أدوية ناقصة» وجرس الإشعارات.
                        </>
                      ) : (
                        <>
                          Any medicine with qty <strong>at or below</strong> this number shows in
                          the low-stock card and notification bell.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="settingsField storeAlertsField">
                    <label>{isArabic ? "أيام قرب انتهاء الصلاحية" : "Expiring soon (days)"}</label>
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
                    <p className="storeAlertsFieldHint">
                      {isArabic ? (
                        <>
                          الأدوية اللي صلاحيتها تنتهي خلال <strong>عدد الأيام ده</strong> تظهر في
                          كارت «قرب انتهاء الصلاحية» وجرس الإشعارات.
                        </>
                      ) : (
                        <>
                          Medicines expiring within <strong>this many days</strong> show in the
                          expiring-soon card and notification bell.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {renderSaveActions()}
            </>
          ) : (
            <p className="empty">
              {isArabic
                ? "تعديل تنبيهات المخزون متاح للأدمن فقط"
                : "Only admin can edit inventory alerts"}
            </p>
          )}
        </div>
      )}

      {isEmployeeSettingsTab && (
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

      {activeTab === "workHours" && (
        <WorkHoursSettingsPanel
          isArabic={isArabic}
          pharmacyId={pharmacyId}
          canEdit={isOrgAdmin}
        />
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
          maxBranches={maxBranches}
          maxUsers={maxUsers}
          staffAddonEnabled={staffAddonEnabled}
          customersAddonEnabled={customersAddonEnabled}
          investmentAddonEnabled={investmentAddonEnabled}
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

      {activeTab === "health" && (
        <div className="settingsTabPanel">
          <SystemHealthPanel isArabic={isArabic} pharmacyId={pharmacyId} />
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
