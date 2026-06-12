import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ActivityLog, AppUser, SubscriptionRequest } from "../types";
import DeveloperCredit from "../components/DeveloperCredit";
import PayrollSettingsPanel from "../components/PayrollSettingsPanel";
import SubscriptionPaymentInstructions from "../components/SubscriptionPaymentInstructions";
import {
  getPlanAmount,
  getPlanDays,
  getSubscriptionAmountForDays,
  getTierUpgradeAmount,
  subscriptionPlanPricing,
  TRIAL_SUBSCRIPTION_DAYS,
} from "../config/subscription";
import { getSubscriptionTier, type SubscriptionTier } from "../config/subscriptionTiers";
import {
  getNextSubscriptionTier,
  isTierUpgradePlan,
  parseTierUpgradePlan,
} from "../utils/subscriptionFeatures";
import DisplayPreferencesPanel from "../components/DisplayPreferencesPanel";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";

export type SettingsTab =
  | "pharmacy"
  | "invoice"
  | "inventory"
  | "payroll"
  | "subscription"
  | "display";

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
  lowStockThreshold: number;
  expiringSoonDays: number;
  expiryNotifyEnabled: boolean;
  expiryNotifyPhone: string;
  expiryNotifyEmail: string;
};

type SettingsPageProps = {
  isArabic: boolean;
  pharmacyId: string;
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
  subscriptionDaysLeft: number | null;
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
  const [requestPlan, setRequestPlan] = useState<"monthly" | "quarterly" | "yearly" | "custom">(
    "monthly",
  );
  const [customDays, setCustomDays] = useState(30);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submittingTierUpgrade, setSubmittingTierUpgrade] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<SubscriptionRequest | null>(null);
  const isOrgAdmin = hasRole(["pharmacy_admin", "super_admin"]);
  const canEditSettings = hasRole(["pharmacy_admin", "branch_manager", "super_admin"]);
  const tierConfig = useMemo(() => getSubscriptionTier(subscriptionTier), [subscriptionTier]);
  const tierFeatures = isArabic ? tierConfig.featuresAr : tierConfig.featuresEn;
  const tierUpgradeTarget = getNextSubscriptionTier(subscriptionTier);
  const tierUpgradeConfig = tierUpgradeTarget ? getSubscriptionTier(tierUpgradeTarget) : null;
  const tierUpgradeAmount = tierUpgradeTarget ? getTierUpgradeAmount(tierUpgradeTarget) : 0;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const pendingRequest = pharmacySubscriptionRequests.find((r) => r.status === "pending");
  const pendingTierUpgrade = pharmacySubscriptionRequests.find(
    (r) => r.status === "pending" && isTierUpgradePlan(r.plan),
  );
  const requestDays =
    requestPlan === "custom" ? Math.max(7, Math.floor(customDays) || 7) : getPlanDays(requestPlan);
  const requestAmount =
    requestPlan === "custom"
      ? getSubscriptionAmountForDays(requestDays)
      : getPlanAmount(requestPlan);

  const requestPlanOptions = useMemo(
    () => [
      {
        value: "monthly" as const,
        label: isArabic
          ? subscriptionPlanPricing.monthly.labelAr
          : subscriptionPlanPricing.monthly.labelEn,
        hint: isArabic
          ? `${subscriptionPlanPricing.monthly.days} يوم — ${subscriptionPlanPricing.monthly.amount} ج.م`
          : `${subscriptionPlanPricing.monthly.days} days — ${subscriptionPlanPricing.monthly.amount} EGP`,
      },
      {
        value: "quarterly" as const,
        label: isArabic
          ? subscriptionPlanPricing.quarterly.labelAr
          : subscriptionPlanPricing.quarterly.labelEn,
        hint: isArabic
          ? `${subscriptionPlanPricing.quarterly.days} يوم — ${subscriptionPlanPricing.quarterly.amount} ج.م`
          : `${subscriptionPlanPricing.quarterly.days} days — ${subscriptionPlanPricing.quarterly.amount} EGP`,
      },
      {
        value: "yearly" as const,
        label: isArabic
          ? subscriptionPlanPricing.yearly.labelAr
          : subscriptionPlanPricing.yearly.labelEn,
        hint: isArabic
          ? `${subscriptionPlanPricing.yearly.days} يوم — ${subscriptionPlanPricing.yearly.amount} ج.م`
          : `${subscriptionPlanPricing.yearly.days} days — ${subscriptionPlanPricing.yearly.amount} EGP`,
      },
      {
        value: "custom" as const,
        label: isArabic ? "مدة مخصصة" : "Custom period",
        hint: isArabic ? "حدد عدد الأيام بنفسك" : "Choose your own number of days",
      },
    ],
    [isArabic],
  );

  async function handleSubmitTierUpgradeRequest() {
    if (!tierUpgradeTarget || !submitTierUpgradeRequest) return;
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة. انتظر الاعتماد قبل إرسال طلب جديد."
          : "You already have a pending subscription request.",
      );
      return;
    }

    setSubmittingTierUpgrade(true);
    try {
      const created = await submitTierUpgradeRequest(tierUpgradeTarget);
      if (created) {
        setPaymentRequest(created);
      }
    } finally {
      setSubmittingTierUpgrade(false);
    }
  }

  async function handleSubmitSubscriptionRequest() {
    if (pendingRequest) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة. أكمل الدفع أو انتظر الاعتماد."
          : "You already have a pending subscription request.",
      );
      if (!isTierUpgradePlan(pendingRequest.plan)) {
        setPaymentRequest(pendingRequest);
      }
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await submitSubscriptionRequest({
        plan: requestPlan,
        days: requestDays,
        amount: requestAmount,
      });
      if (created) {
        setPaymentRequest(created);
      }
    } finally {
      setSubmittingRequest(false);
    }
  }

  function getRequestStatusLabel(status: string) {
    if (status === "approved") return isArabic ? "معتمد" : "Approved";
    if (status === "rejected") return isArabic ? "مرفوض" : "Rejected";
    return isArabic ? "قيد المراجعة" : "Pending";
  }

  function getRequestTypeLabel(plan: string) {
    const targetTier = parseTierUpgradePlan(plan);
    if (targetTier) {
      const target = getSubscriptionTier(targetTier);
      return isArabic ? `ترقية إلى ${target.labelAr}` : `Upgrade to ${target.labelEn}`;
    }
    return isArabic ? "تجديد اشتراك" : "Renewal";
  }

  const subscriptionTone = isSubscriptionExpired
    ? "expired"
    : isSubscriptionExpiringSoon
      ? "warning"
      : isTrialSubscription
        ? "trial"
        : "active";

  const subscriptionStatusLabel = isSubscriptionExpired
    ? isArabic
      ? "منتهي"
      : "Expired"
    : isSubscriptionExpiringSoon
      ? isArabic
        ? "قرب الانتهاء"
        : "Expiring Soon"
      : isTrialSubscription
        ? isArabic
          ? "تجريبي"
          : "Trial"
        : isArabic
          ? "نشط"
          : "Active";

  const daysLeftLabel =
    subscriptionDaysLeft === null
      ? isArabic
        ? "غير محدد"
        : "Not set"
      : subscriptionDaysLeft < 0
        ? isArabic
          ? "منتهي"
          : "Expired"
        : String(subscriptionDaysLeft);

  const subscriptionMessage = isSubscriptionExpired
    ? isArabic
      ? isTrialSubscription
        ? `انتهت الفترة التجريبية (${TRIAL_SUBSCRIPTION_DAYS} يوم). اشترك للاستمرار.`
        : "انتهى الاشتراك. يرجى التجديد لاستمرار استخدام النظام."
      : isTrialSubscription
        ? `Your ${TRIAL_SUBSCRIPTION_DAYS}-day trial has ended. Subscribe to continue.`
        : "Subscription expired. Renew to continue using the system."
    : isTrialSubscription
      ? isArabic
        ? `أنت على باقة تجريبية مجانية ${TRIAL_SUBSCRIPTION_DAYS} يوماً. متبقي ${subscriptionDaysLeft ?? "?"} يوم.`
        : `You are on a free ${TRIAL_SUBSCRIPTION_DAYS}-day trial. ${subscriptionDaysLeft ?? "?"} days left.`
      : isSubscriptionExpiringSoon
        ? isArabic
          ? `متبقي ${subscriptionDaysLeft} يوم على انتهاء الاشتراك.`
          : `${subscriptionDaysLeft} days left until subscription ends.`
        : settingsForm.subscriptionPlan === "lifetime"
          ? isArabic
            ? "اشتراك مدى الحياة — النظام متاح بدون قيود زمنية."
            : "Lifetime license — full access without expiry."
          : isArabic
            ? "الاشتراك نشط ويعمل بشكل طبيعي."
            : "Subscription is active and running normally.";

  const progressCap =
    settingsForm.subscriptionPlan === "trial" || isTrialSubscription
      ? TRIAL_SUBSCRIPTION_DAYS
      : settingsForm.subscriptionPlan === "yearly"
        ? 365
        : settingsForm.subscriptionPlan === "quarterly"
          ? 90
          : settingsForm.subscriptionPlan === "lifetime"
            ? null
            : 30;

  const progressPercent =
    progressCap && subscriptionDaysLeft !== null && subscriptionDaysLeft >= 0
      ? Math.min(100, Math.max(8, (subscriptionDaysLeft / progressCap) * 100))
      : settingsForm.subscriptionPlan === "lifetime"
        ? 100
        : 0;

  const formattedEndDate = settingsForm.subscriptionEndDate
    ? new Date(`${settingsForm.subscriptionEndDate}T12:00:00`).toLocaleDateString(
        isArabic ? "ar-EG" : "en-GB",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "-";

  const allTabs: { id: SettingsTab; ar: string; en: string }[] = [
    { id: "pharmacy", ar: "بيانات الصيدلية", en: "Pharmacy" },
    { id: "invoice", ar: "بيانات الفاتورة", en: "Invoice" },
    { id: "inventory", ar: "انتهاء المخزون", en: "Inventory Alerts" },
    { id: "payroll", ar: "إعدادات المرتبات", en: "Payroll" },
    { id: "subscription", ar: "الاشتراك والترخيص", en: "Subscription" },
    { id: "display", ar: "المظهر والخط", en: "Display" },
  ];

  const tabs = isOrgAdmin
    ? allTabs
    : allTabs.filter(
        (tab) => tab.id === "pharmacy" || tab.id === "invoice" || tab.id === "display",
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

      {activeTab === "payroll" && (
        <PayrollSettingsPanel isArabic={isArabic} pharmacyId={pharmacyId} canEdit={isOrgAdmin} />
      )}

      {activeTab === "subscription" && (
        <div className="settingsTabPanel subscriptionTab">
          <section className={`subscriptionHero ${subscriptionTone}`}>
            <div className="subscriptionHeroMain">
              <span className={`subscriptionStatusPill ${subscriptionTone}`}>
                {subscriptionStatusLabel}
              </span>
              <h3>{isArabic ? "الاشتراك والترخيص" : "Subscription & License"}</h3>
              <p>{subscriptionMessage}</p>
            </div>

            <div className="subscriptionHeroDays">
              <span>{isArabic ? "الأيام المتبقية" : "Days Left"}</span>
              <strong>{daysLeftLabel}</strong>
              <small>{isArabic ? "يوم" : "days"}</small>
            </div>
          </section>

          <div className="subscriptionStatsGrid">
            {subscriptionTierLabel && (
              <div className={`subscriptionStatCard ${subscriptionTone}`}>
                <span>{isArabic ? "باقة الاشتراك" : "Package"}</span>
                <strong>{subscriptionTierLabel}</strong>
              </div>
            )}
            <div className={`subscriptionStatCard ${subscriptionTone}`}>
              <span>{isArabic ? "مدة التجديد" : "Billing period"}</span>
              <strong>{getSubscriptionPlanLabel(settingsForm.subscriptionPlan)}</strong>
            </div>
            <div className={`subscriptionStatCard ${subscriptionTone}`}>
              <span>{isArabic ? "تاريخ الانتهاء" : "End Date"}</span>
              <strong>{formattedEndDate}</strong>
            </div>
            <div className={`subscriptionStatCard ${subscriptionTone}`}>
              <span>{isArabic ? "حالة النظام" : "System Access"}</span>
              <strong>{subscriptionStatusLabel}</strong>
            </div>
            <div className={`subscriptionStatCard ${subscriptionTone}`}>
              <span>{isArabic ? "عدد التجديدات" : "Renewals Logged"}</span>
              <strong>{subscriptionRenewLogs.length}</strong>
            </div>
          </div>

          <section className="subscriptionEditCard subscriptionTierFeaturesCard">
            <div className="subscriptionEditHeader">
              <span className="subscriptionEditHeaderIcon" aria-hidden="true">
                ✨
              </span>
              <div>
                <h3>{isArabic ? "مميزات باقتك" : "Your package features"}</h3>
                <p>{isArabic ? tierConfig.summaryAr : tierConfig.summaryEn}</p>
              </div>
            </div>
            <ul className="subscriptionTierFeatureList">
              {tierFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p className="returnsSectionHint">
              {isArabic
                ? `الحد الأقصى للفروع في باقتك: ${tierConfig.maxBranches}`
                : `Branch limit on your plan: ${tierConfig.maxBranches}`}
            </p>
          </section>

          {isOrgAdmin && tierUpgradeTarget && tierUpgradeConfig && submitTierUpgradeRequest && (
            <section className="subscriptionEditCard subscriptionTierUpgradeCard">
              <div className="subscriptionEditHeader">
                <span className="subscriptionEditHeaderIcon" aria-hidden="true">
                  ⬆️
                </span>
                <div>
                  <h3>
                    {isArabic
                      ? `ترقية إلى باقة ${tierUpgradeConfig.labelAr}`
                      : `Upgrade to ${tierUpgradeConfig.labelEn}`}
                  </h3>
                  <p>
                    {isArabic
                      ? "أرسل طلب ترقية — سيراجعه المشرف ويفعّل الباقة الجديدة بعد الموافقة"
                      : "Submit an upgrade request — an admin will review and activate the new package"}
                  </p>
                </div>
              </div>
              <ul className="subscriptionTierFeatureList">
                {(isArabic ? tierUpgradeConfig.featuresAr : tierUpgradeConfig.featuresEn).map(
                  (feature) => (
                    <li key={feature}>{feature}</li>
                  ),
                )}
              </ul>
              <div className="subscriptionRequestSummary">
                <div>
                  <span>{isArabic ? "رسوم الترقية (مرة واحدة)" : "Upgrade fee (one-time)"}</span>
                  <strong>
                    {tierUpgradeAmount} {isArabic ? "ج.م" : "EGP"}
                  </strong>
                </div>
              </div>
              {pendingTierUpgrade ? (
                <div className="subscriptionSaveBar">
                  <p className="returnsSectionHint">
                    {isArabic
                      ? `لديك طلب ترقية قيد المراجعة (${getRequestTypeLabel(pendingTierUpgrade.plan)}).`
                      : `You have a pending upgrade request (${getRequestTypeLabel(pendingTierUpgrade.plan)}).`}
                  </p>
                  <button
                    type="button"
                    className="smallBtn"
                    onClick={() => setPaymentRequest(pendingTierUpgrade)}
                  >
                    {isArabic ? "تعليمات الدفع" : "Payment info"}
                  </button>
                </div>
              ) : (
                <div className="subscriptionSaveBar">
                  <button
                    type="button"
                    className="completeBtn subscriptionSaveBtn"
                    disabled={submittingTierUpgrade || Boolean(pendingRequest)}
                    onClick={() => void handleSubmitTierUpgradeRequest()}
                  >
                    {submittingTierUpgrade
                      ? isArabic
                        ? "جاري إرسال الطلب..."
                        : "Submitting..."
                      : isArabic
                        ? "إرسال طلب ترقية الباقة"
                        : "Submit package upgrade request"}
                  </button>
                </div>
              )}
            </section>
          )}

          {settingsForm.subscriptionPlan !== "lifetime" && (
            <div className="subscriptionProgressCard">
              <div className="subscriptionProgressHeader">
                <span>{isArabic ? "مدة الاشتراك المتبقية" : "Remaining subscription period"}</span>
                <strong>
                  {subscriptionDaysLeft !== null && subscriptionDaysLeft >= 0
                    ? `${subscriptionDaysLeft} ${isArabic ? "يوم" : "days"}`
                    : isArabic
                      ? "منتهي"
                      : "Expired"}
                </strong>
              </div>
              <div className="subscriptionProgressTrack">
                <div
                  className={`subscriptionProgressFill ${subscriptionTone}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {isOrgAdmin && (
            <section className="subscriptionEditCard">
              <div className="subscriptionEditHeader">
                <span className="subscriptionEditHeaderIcon" aria-hidden="true">
                  📝
                </span>
                <div>
                  <h3>{isArabic ? "طلب تجديد اشتراك" : "Request Subscription Renewal"}</h3>
                  <p>
                    {isArabic
                      ? "اختر الخطة أو عدد الأيام، ثم أرسل الطلب واتبع تعليمات InstaPay"
                      : "Choose a plan or number of days, submit the request, then follow InstaPay instructions"}
                  </p>
                </div>
              </div>

              <div className="subscriptionEditBody">
                <div className="subscriptionEditField">
                  <label>{isArabic ? "خطة الاشتراك المطلوبة" : "Requested plan"}</label>
                  <div
                    className="subscriptionPlanGrid"
                    role="radiogroup"
                    aria-label={isArabic ? "خطة الاشتراك" : "Subscription plan"}
                  >
                    {requestPlanOptions.map((plan) => {
                      const selected = requestPlan === plan.value;
                      return (
                        <button
                          key={plan.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`subscriptionPlanOption${selected ? " selected" : ""}`}
                          onClick={() => setRequestPlan(plan.value)}
                        >
                          <span className="subscriptionPlanCheck" aria-hidden="true">
                            {selected ? "✓" : ""}
                          </span>
                          <strong>{plan.label}</strong>
                          <small>{plan.hint}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {requestPlan === "custom" && (
                  <div className="subscriptionEditField">
                    <label>{isArabic ? "عدد أيام التجديد" : "Renewal days"}</label>
                    <div className="subscriptionDateInputWrap">
                      <span className="subscriptionFieldIcon" aria-hidden="true">
                        #
                      </span>
                      <input
                        type="number"
                        min={7}
                        max={730}
                        value={customDays}
                        onChange={(e) => setCustomDays(Number(e.target.value) || 7)}
                      />
                    </div>
                    <p className="settingsFieldHint">
                      {isArabic
                        ? "حدد عدد الأيام التي تريد تمديد الاشتراك بها (7 إلى 730 يوم)"
                        : "Set how many days to extend the subscription (7 to 730 days)"}
                    </p>
                  </div>
                )}

                <div className="subscriptionRequestSummary">
                  <div>
                    <span>{isArabic ? "مدة التجديد" : "Period"}</span>
                    <strong>
                      {requestDays} {isArabic ? "يوم" : "days"}
                    </strong>
                  </div>
                  <div>
                    <span>{isArabic ? "المبلغ المطلوب" : "Amount"}</span>
                    <strong>
                      {requestAmount} {isArabic ? "ج.م" : "EGP"}
                    </strong>
                  </div>
                </div>

                <div className="subscriptionSaveBar">
                  <button
                    type="button"
                    className="completeBtn subscriptionSaveBtn"
                    disabled={submittingRequest}
                    onClick={() => void handleSubmitSubscriptionRequest()}
                  >
                    {submittingRequest
                      ? isArabic
                        ? "جاري إرسال الطلب..."
                        : "Submitting..."
                      : isArabic
                        ? "إرسال طلب التجديد"
                        : "Submit renewal request"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="subscriptionHistoryCard">
            <div className="subscriptionPanelHeader">
              <h3>{isArabic ? "طلبات الاشتراك" : "Subscription Requests"}</h3>
              <p>
                {isArabic
                  ? "سجل طلبات التجديد وترقية الباقة وحالة كل طلب"
                  : "Renewal and package upgrade requests and their status"}
              </p>
            </div>

            {pharmacySubscriptionRequests.length === 0 ? (
              <div className="subscriptionEmptyState">
                <span aria-hidden="true">📋</span>
                <p>{isArabic ? "لا توجد طلبات حتى الآن" : "No requests yet"}</p>
              </div>
            ) : (
              <div className="tableWrap">
                <table className="subscriptionHistoryTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                      <th>{isArabic ? "النوع" : "Type"}</th>
                      <th>{isArabic ? "التفاصيل" : "Details"}</th>
                      <th>{isArabic ? "الحالة" : "Status"}</th>
                      <th>{t.date}</th>
                      <th>{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacySubscriptionRequests.map((request) => (
                      <tr key={request.id}>
                        <td dir="ltr">{request.requestNumber}</td>
                        <td>{getRequestTypeLabel(request.plan)}</td>
                        <td>
                          {isTierUpgradePlan(request.plan)
                            ? `${request.amount} ${request.currency || "EGP"}`
                            : `${request.days} ${isArabic ? "يوم" : "days"} · ${request.amount} ${request.currency || "EGP"}`}
                        </td>
                        <td>
                          <span className={`subscriptionRequestBadge ${request.status}`}>
                            {getRequestStatusLabel(request.status)}
                          </span>
                        </td>
                        <td>
                          {request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}
                        </td>
                        <td>
                          {request.status === "pending" ? (
                            <button
                              type="button"
                              className="smallBtn"
                              onClick={() => setPaymentRequest(request)}
                            >
                              {isArabic ? "تعليمات الدفع" : "Payment info"}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="subscriptionHistoryCard">
            <div className="subscriptionPanelHeader">
              <h3>{isArabic ? "سجل تفعيلات الاشتراك" : "Activation History"}</h3>
              <p>
                {isArabic
                  ? "آخر عمليات تفعيل الاشتراك بعد الاعتماد"
                  : "Latest subscription activations after approval"}
              </p>
            </div>

            {subscriptionRenewLogs.length === 0 ? (
              <div className="subscriptionEmptyState">
                <span aria-hidden="true">📋</span>
                <p>{isArabic ? "لا توجد تجديدات مسجلة حتى الآن" : "No renewals recorded yet"}</p>
              </div>
            ) : (
              <div className="tableWrap">
                <table className="subscriptionHistoryTable">
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
                        <td>
                          <span className="subscriptionUserBadge">{log.userName || "-"}</span>
                        </td>
                        <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
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

      {paymentRequest && (
        <div className="modalOverlay" onClick={() => setPaymentRequest(null)}>
          <div
            className="invoiceModal subscriptionPaymentModal"
            onClick={(e) => e.stopPropagation()}
          >
            <SubscriptionPaymentInstructions
              isArabic={isArabic}
              request={paymentRequest}
              onClose={() => setPaymentRequest(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
