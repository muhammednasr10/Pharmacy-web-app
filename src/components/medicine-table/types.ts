import type { Medicine, PharmacySettings } from "../../types";

export type MedicineTableProps = {
  medicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  showManagementActions: boolean;
  showColumnFilters?: boolean;
  showSplitNameColumns?: boolean;
  showCostProfitColumns?: boolean;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart?: (medicine: Medicine) => void;
  addToCartLabel?: string;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  onViewStockDetail?: (medicine: Medicine) => void;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  branchAwareAlerts?: boolean;
  branches?: PharmacySettings[];
  fallbackSettings?: PharmacySettings | null;
  emptyMessage?: string;
  externalPagination?: {
    page: number;
    pageSize: number;
    total: number;
    loading?: boolean;
  };
};

export type StockFilter = "all" | "low" | "expiring" | "expired";

export const stockFilterOptions: { value: StockFilter; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "low", ar: "ناقص", en: "Low stock" },
  { value: "expiring", ar: "قرب الانتهاء", en: "Expiring" },
  { value: "expired", ar: "منتهي", en: "Expired" },
];
