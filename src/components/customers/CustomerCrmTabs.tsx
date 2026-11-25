export type CustomerCrmTab = "suppliers" | "credit" | "pharmacy";
export type CreditSubTab = "debts" | "payments";
export type PharmacySubTab = "list" | "overview" | "followups";

type CustomerCrmTabsProps = {
  isArabic: boolean;
  activeTab: CustomerCrmTab;
  suppliersCount: number;
  creditCount: number;
  pharmacyCount: number;
  onChange: (tab: CustomerCrmTab) => void;
};

export default function CustomerCrmTabs({
  isArabic,
  activeTab,
  suppliersCount,
  creditCount,
  pharmacyCount,
  onChange,
}: CustomerCrmTabsProps) {
  const tabs: {
    id: CustomerCrmTab;
    label: string;
    hint: string;
    count: number;
  }[] = [
    {
      id: "suppliers",
      label: isArabic ? "موردين" : "Suppliers",
      hint: isArabic ? "موردين الصيدلية" : "Pharmacy suppliers",
      count: suppliersCount,
    },
    {
      id: "credit",
      label: isArabic ? "عملاء آجل" : "Credit customers",
      hint: isArabic ? "مديونيات وتحصيل" : "Debts & collections",
      count: creditCount,
    },
    {
      id: "pharmacy",
      label: isArabic ? "عملاء الصيدلية" : "Pharmacy customers",
      hint: isArabic ? "سجل العملاء" : "Customer registry",
      count: pharmacyCount,
    },
  ];

  return (
    <div className="crmTabs" role="tablist" aria-label={isArabic ? "تبويبات العملاء" : "Customers tabs"}>
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
            <span className="crmTabCount">{tab.count.toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}
