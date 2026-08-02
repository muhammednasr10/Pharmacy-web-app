export type CustomerCrmTab = "overview" | "customers" | "debts" | "payments" | "followups";

type CustomerCrmTabsProps = {
  isArabic: boolean;
  activeTab: CustomerCrmTab;
  customersCount: number;
  debtsCount: number;
  paymentsCount: number;
  openFollowUpsCount: number;
  onChange: (tab: CustomerCrmTab) => void;
};

export default function CustomerCrmTabs({
  isArabic,
  activeTab,
  customersCount,
  debtsCount,
  paymentsCount,
  openFollowUpsCount,
  onChange,
}: CustomerCrmTabsProps) {
  const tabs: {
    id: CustomerCrmTab;
    label: string;
    hint: string;
    count?: number;
  }[] = [
    {
      id: "overview",
      label: isArabic ? "نظرة عامة" : "Overview",
      hint: isArabic ? "مؤشرات CRM" : "CRM metrics",
    },
    {
      id: "customers",
      label: isArabic ? "العملاء" : "Customers",
      hint: isArabic ? "ملفات العملاء" : "Customer profiles",
      count: customersCount,
    },
    {
      id: "debts",
      label: isArabic ? "المديونيات" : "Debts",
      hint: isArabic ? "الآجل والتحصيل" : "Credit balances",
      count: debtsCount,
    },
    {
      id: "payments",
      label: isArabic ? "التحصيلات" : "Payments",
      hint: isArabic ? "سجل التحصيل" : "Payment history",
      count: paymentsCount,
    },
    {
      id: "followups",
      label: isArabic ? "المتابعات" : "Follow-ups",
      hint: isArabic ? "مهام ومكالمات" : "Tasks & calls",
      count: openFollowUpsCount,
    },
  ];

  return (
    <div className="crmTabs" role="tablist" aria-label={isArabic ? "تبويبات CRM" : "CRM tabs"}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`crmTab ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span className="crmTabLabel">{tab.label}</span>
            <span className="crmTabHint">{tab.hint}</span>
            {typeof tab.count === "number" ? (
              <span className="crmTabCount">{tab.count.toLocaleString()}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
