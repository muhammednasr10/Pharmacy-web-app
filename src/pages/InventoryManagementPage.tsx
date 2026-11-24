import { useCallback, useEffect, useState } from "react";
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
import InventoryPurchaseRequestsPanel from "../components/inventory/InventoryPurchaseRequestsPanel";
import InventoryBranchDataModal from "../components/inventory/InventoryBranchDataModal";
import BranchTransfersPanel from "./branches/BranchTransfersPanel";
import { useBranchesPageState } from "./branches/useBranchesPageState";
import type { BranchesPageProps } from "./branches/types";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
  canTransferStockWithTier,
} from "../utils/subscriptionFeatures";
import * as pharmacyService from "../services/pharmacyService";
import { subscribePurchaseRequestsChanged } from "../utils/purchaseRequests";

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
  medicineFormFeedback?: { type: "error" | "success"; text: string } | null;
  disabled: boolean;
  exportInventoryCSV: () => void;
  isSubscriptionExpired: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  canViewInventoryCostProfit: boolean;
  isTrialSubscription?: boolean;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  pharmacyId: string;
  onReloadMedicines?: () => void | Promise<void>;
  lowStockThreshold: number;
  expiringSoonDays: number;
  stockStatusFilter?: "all" | "in_stock" | "low" | "expiring" | "expired";
  stockFilterFocusKey?: number;
  branchAwareAlerts?: boolean;
  fallbackSettings?: PharmacySettings | null;
  stockMovementsCount?: number;
  stockCountLogCount?: number;
  dataRefreshKey?: number;
  branchWorkspace: BranchesPageProps;
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
  branchWorkspace,
  ...stockProps
}: InventoryManagementPageProps) {
  const [activeTab, setActiveTab] = useState<InventoryManagementTab>(initialTab);
  const [stockCountLaunchKey, setStockCountLaunchKey] = useState(0);
  const [showBranchData, setShowBranchData] = useState(false);
  const [purchaseRequestsCount, setPurchaseRequestsCount] = useState(0);

  const branchState = useBranchesPageState(branchWorkspace);

  const refreshPurchaseRequestCount = useCallback(async () => {
    if (!stockProps.pharmacyId) {
      setPurchaseRequestsCount(0);
      return;
    }
    try {
      setPurchaseRequestsCount(await pharmacyService.countPurchaseRequests(stockProps.pharmacyId));
    } catch {
      setPurchaseRequestsCount(0);
    }
  }, [stockProps.pharmacyId]);

  useEffect(() => {
    void refreshPurchaseRequestCount();
  }, [refreshPurchaseRequestCount, dataRefreshKey, activeTab]);

  useEffect(() => {
    return subscribePurchaseRequestsChanged((pharmacyId) => {
      if (pharmacyId === stockProps.pharmacyId) void refreshPurchaseRequestCount();
    });
  }, [refreshPurchaseRequestCount, stockProps.pharmacyId]);

  const showTransfersTab =
    stockProps.branches.length > 1 &&
    (canTransferStockWithTier(appUser, orgSubscriptionTier, stockProps.branches.length) ||
      canReviewBranchTransfersWithTier(appUser, orgSubscriptionTier, stockProps.branches.length));

  const canOpenBranchData = canManageOrgBranchesWithTier(appUser, orgSubscriptionTier);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "transfers" && !showTransfersTab) {
      setActiveTab("stock");
    }
  }, [activeTab, showTransfersTab]);

  useEffect(() => {
    if (!stockProps.stockFilterFocusKey) return;
    setActiveTab("stock");
  }, [stockProps.stockFilterFocusKey]);

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
              ? "المخزون الحالي، حركة الأصناف، الجرد، ونقل المخزون بين الفروع"
              : "Current stock, movements, counts, and inter-branch transfers"}
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
        onOpenBranchData={canOpenBranchData ? () => setShowBranchData(true) : undefined}
      />

      <InventoryManagementTabs
        isArabic={stockProps.isArabic}
        activeTab={activeTab}
        stockCount={undefined}
        movementsCount={stockMovementsCount}
        stockCountLogCount={stockCountLogCount}
        purchaseRequestsCount={purchaseRequestsCount}
        transfersCount={branchWorkspace.branchTransfers.length}
        showTransfersTab={showTransfersTab}
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
          className={activeTab === "purchaseRequests" ? "" : "invMgmtTabHidden"}
          aria-hidden={activeTab !== "purchaseRequests"}
        >
          <InventoryPurchaseRequestsPanel
            isArabic={stockProps.isArabic}
            pharmacyId={stockProps.pharmacyId}
            enabled={activeTab === "purchaseRequests"}
            canManageInventory={stockProps.canManageInventory}
            onOpenPurchases={stockProps.onOpenPurchasesWithReorder}
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

        {showTransfersTab ? (
          <div
            className={activeTab === "transfers" ? "" : "invMgmtTabHidden"}
            aria-hidden={activeTab !== "transfers"}
          >
            <div className="invMgmtTransfersPanel">
              <p className="hintText">
                {stockProps.isArabic
                  ? "إنشاء نقل جديد من زر «نقل بين الفروع» داخل المخزون الحالي. هنا تعتمد الطلبات وتشوف السجل."
                  : "Create a new transfer from the “Transfer between branches” button on Current stock. Approve requests and review history here."}
              </p>
              <BranchTransfersPanel state={branchState} />
            </div>
          </div>
        ) : null}
      </div>

      {showBranchData ? (
        <InventoryBranchDataModal state={branchState} onClose={() => setShowBranchData(false)} />
      ) : null}
    </section>
  );
}
