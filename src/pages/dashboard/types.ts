import type { BranchInventoryAlertRow } from "../../utils/inventoryAlerts";
import type { BranchReportRow } from "../../utils/branchReports";
import type { BranchStockTransfer, Medicine, Page } from "../../types";

export type PendingBranchTransferGroup = {
  transferNumber: string;
  items?: BranchStockTransfer[];
  fromPharmacyId?: string;
  toPharmacyId?: string;
  createdAt?: string;
  status: string;
  totalQty: number;
};

export type DashboardPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  allowedPages: Page[];
  lowStockCount: number;
  expiredCount: number;
  expiringCount: number;
  totalCustomerRemainingDebt: number;
  totalCustomerPayments: number;
  dashboardSalesTotal: number;
  dashboardInvoicesCount: number;
  dashboardProfitTotal: number;
  totalInvoicesCount: number;
  totalMedicinesCount: number;
  totalPurchasesCount: number;
  totalReturnsCount: number;
  branchesCount: number;
  lowStockMedicines: Medicine[];
  expiringSoonMedicines: Medicine[];
  expiredMedicines: Medicine[];
  subscriptionDaysLeft: number | string | null;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription?: boolean;
  hasAdminRole: boolean;
  showBranchBreakdown?: boolean;
  dashboardBranchRows?: BranchReportRow[];
  showOrgInventoryAlerts?: boolean;
  branchInventoryAlertRows?: BranchInventoryAlertRow[];
  showBranchInAlertLists?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  onOpenBranchInventory?: (branchId: string) => void;
  onOpenSubscriptionSettings: () => void;
  onOpenPOS: () => void;
  onOpenPurchases: () => void;
  onOpenReorderSuggestions?: () => void;
  onOpenInventory: (filter: "all" | "low" | "expiring" | "expired") => void;
  onOpenCustomerPayments: () => void;
  onNavigate: (page: Page) => void;
  pendingBranchTransferGroups?: PendingBranchTransferGroup[];
  onApproveBranchTransfer?: (transferNumber: string) => void | Promise<void>;
  onRejectBranchTransfer?: (transferNumber: string) => void | Promise<void>;
};

export type ModuleCard = {
  key: string;
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone: string;
  onClick: () => void;
};

export type QuickAction = {
  key: string;
  title: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
};
