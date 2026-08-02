import type { Medicine, PharmacySettings, PurchaseRecord } from "../../types";

export type PurchaseLineDraft = {
  key: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

export type PurchaseGroup = {
  purchaseNumber: string;
  pharmacyId: string;
  supplierName: string;
  userName: string;
  date: string;
  createdAt: string;
  notes: string;
  items: PurchaseRecord[];
  totalCost: number;
  totalQuantity: number;
};

export type PurchasesPageProps = {
  purchases: PurchaseRecord[];
  branches: PharmacySettings[];
  defaultBranchId: string;
  showBranchColumn?: boolean;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  canUsePurchases: boolean;
  canDeletePurchase?: boolean;
  isSubscriptionExpired: boolean;
  userId?: string;
  userName?: string;
  onActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  onRefreshMedicines: () => Promise<void>;
  onRefreshPurchases: () => Promise<void>;
  medicines?: Medicine[];
  fallbackSettings?: PharmacySettings | null;
  safeNumber: (value: unknown) => number;
  barcodeCSV: (value: unknown) => string;
  downloadCSV: (filename: string, rows: string[][]) => void;
};
