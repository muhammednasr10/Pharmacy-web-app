export type InventoryManagementTab = "stock" | "movements" | "stockCountLog";

type InventoryManagementTabsProps = {
  isArabic: boolean;
  activeTab: InventoryManagementTab;
  stockCount?: number;
  movementsCount?: number;
  stockCountLogCount?: number;
  onChange: (tab: InventoryManagementTab) => void;
};

export default function InventoryManagementTabs({
  isArabic,
  activeTab,
  stockCount,
  movementsCount,
  stockCountLogCount,
  onChange,
}: InventoryManagementTabsProps) {
  const tabs: {
    id: InventoryManagementTab;
    label: string;
    hint: string;
    count?: number;
  }[] = [
    {
      id: "stock",
      label: isArabic ? "المخزون الحالي" : "Current stock",
      hint: isArabic ? "الأصناف والكميات" : "Items & quantities",
      count: stockCount,
    },
    {
      id: "movements",
      label: isArabic ? "حركة المخزون" : "Stock movements",
      hint: isArabic ? "المبيعات والتوريد والتعديلات" : "Sales, purchases & adjustments",
      count: movementsCount,
    },
    {
      id: "stockCountLog",
      label: isArabic ? "سجل الجرد" : "Stock count log",
      hint: isArabic ? "جلسات الجرد والتسويات" : "Count sessions & adjustments",
      count: stockCountLogCount,
    },
  ];

  return (
    <div className="invMgmtTabs" role="tablist" aria-label={isArabic ? "تبويبات المخزن" : "Inventory tabs"}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`invMgmtTab ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span className="invMgmtTabLabel">{tab.label}</span>
            <span className="invMgmtTabHint">{tab.hint}</span>
            {typeof tab.count === "number" ? (
              <span className="invMgmtTabCount">{tab.count.toLocaleString()}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
