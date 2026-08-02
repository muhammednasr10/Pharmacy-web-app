import { useEffect, useState } from "react";
import type { AppUser, BranchStockTransfer, Medicine, NewMedicineForm, PharmacySettings } from "../types";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import type { StockCountSession } from "../utils/stockCount";
import InventoryManagementTabs, {
  type InventoryManagementTab,
} from "../components/inventory/InventoryManagementTabs";
import InventoryWarehouseBar from "../components/inventory/InventoryWarehouseBar";
import InventoryStockPanel from "../components/inventory/InventoryStockPanel";
import InventoryMovementsPanel from "../components/inventory/InventoryMovementsPanel";
import InventoryStockCountLogPanel from "../components/inventory/InventoryStockCountLogPanel";

export type InventoryManagementPageProps = {
  initialTab?: InventoryManagementTab;
  appUser: AppUser | null;
  activeBranchId: string | null;
  orgSubscriptionTier: SubscriptionTier;
  onSwitchBranch: (branchId: string) => void;
  onBranchesUpdated?: () => void | Promise<void>;
  medicines: Medicine[];
  branches: PharmacySettings[];
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  canTransferStock?: boolean;
  transferUpgradeNotice?: string | null;
  onOpenSubscriptionSettings?: () => void;
  onTransferComplete?: () => void | Promise<void>;
  onPrintTransfer?: (records: BranchStockTransfer[]) => void;
  onApplyStockCount?: (session: StockCountSession) => Promise<void>;
  onOpenPurchasesWithReorder?: () => void;
  userId?: string;
  userName?: string;
  onFormChange: (value: NewMedicineForm) => void;
  onSave: () => boolean | Promise<boolean>;
  onCancel: () => void;
  onOpenAdd: () => void;
  disabled: boolean;
  exportInventoryCSV: () => void;
  isSubscriptionExpired: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  canViewInventoryCostProfit: boolean;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  pharmacyId: string;
  onReloadMedicines?: () => void | Promise<void>;
  lowStockThreshold: number;
  expiringSoonDays: number;
  branchAwareAlerts?: boolean;
  fallbackSettings?: PharmacySettings | null;
  stockMovementsCount?: number;
  stockCountLogCount?: number;
  dataRefreshKey?: number;
};

export default function InventoryManagementPage({
  initialTab = "stock",
  stockMovementsCount,
  stockCountLogCount,
  dataRefreshKey = 0,
  appUser,
  activeBranchId,
  orgSubscriptionTier,
  onSwitchBranch,
  onBranchesUpdated,
  ...stockProps
}: InventoryManagementPageProps) {
  const [activeTab, setActiveTab] = useState<InventoryManagementTab>(initialTab);
  const [stockCountLaunchKey, setStockCountLaunchKey] = useState(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  function startStockCountFromLog() {
    setActiveTab("stock");
    setStockCountLaunchKey((current) => current + 1);
  }

  return (
    <section className="card inventoryManagementPage">
      <div className="cardHeader invMgmtHeader">
        <div>
          <h2>{stockProps.isArabic ? "إدارة المخزن" : "Inventory Management"}</h2>
          <p className="mutedText">
            {stockProps.isArabic
              ? "المخزون الحالي، حركة الأصناف، وسجل الجرد — في مكان واحد"
              : "Current stock, movements, and count history in one place"}
          </p>
        </div>
      </div>

      <InventoryWarehouseBar
        isArabic={stockProps.isArabic}
        appUser={appUser}
        branches={stockProps.branches}
        activeBranchId={activeBranchId}
        pharmacyId={stockProps.pharmacyId}
        orgSubscriptionTier={orgSubscriptionTier}
        onSwitchBranch={onSwitchBranch}
        onBranchesUpdated={onBranchesUpdated}
      />

      <InventoryManagementTabs
        isArabic={stockProps.isArabic}
        activeTab={activeTab}
        stockCount={undefined}
        movementsCount={stockMovementsCount}
        stockCountLogCount={stockCountLogCount}
        onChange={setActiveTab}
      />

      <div className="invMgmtTabPanels">
        <div className={activeTab === "stock" ? "" : "invMgmtTabHidden"} aria-hidden={activeTab !== "stock"}>
          <InventoryStockPanel
            {...stockProps}
            enabled={activeTab === "stock"}
            refreshKey={dataRefreshKey}
            stockCountLaunchKey={stockCountLaunchKey}
          />
        </div>

        <div
          className={activeTab === "movements" ? "" : "invMgmtTabHidden"}
          aria-hidden={activeTab !== "movements"}
        >
          <InventoryMovementsPanel
            isArabic={stockProps.isArabic}
            t={stockProps.t}
            enabled={activeTab === "movements"}
            showBranchColumn={stockProps.showBranchColumn}
            getBranchLabel={stockProps.getBranchLabel}
            refreshKey={dataRefreshKey}
          />
        </div>

        <div
          className={activeTab === "stockCountLog" ? "" : "invMgmtTabHidden"}
          aria-hidden={activeTab !== "stockCountLog"}
        >
          <InventoryStockCountLogPanel
            isArabic={stockProps.isArabic}
            enabled={activeTab === "stockCountLog"}
            refreshKey={dataRefreshKey}
            canManageInventory={stockProps.canManageInventory}
            onStartStockCount={stockProps.onApplyStockCount ? startStockCountFromLog : undefined}
          />
        </div>
      </div>
    </section>
  );
}
