import type { AppUser, BranchStockTransfer, PharmacySettings } from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";

export type BranchesPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  branches: PharmacySettings[];
  setBranches: (rows: PharmacySettings[]) => void;
  activeBranchId: string | null;
  pharmacySettings: PharmacySettings | null;
  appLogo: string;
  orgSubscriptionTier: SubscriptionTier;
  branchTransfers: BranchStockTransfer[];
  onRefreshBranchTransfers: () => Promise<void>;
  onTransferComplete: () => Promise<void>;
  onSwitchBranch: (branchId: string) => void;
  getPharmacyId: () => string;
  resolveBranchLabel: (branchId: string | undefined) => string;
  onActivityLog: (entry: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
};

export type BranchFormState = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  isActive: boolean;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
};

export type BranchTransferGroup = {
  transferNumber: string;
  items: BranchStockTransfer[];
  fromPharmacyId: string | undefined;
  toPharmacyId: string | undefined;
  createdAt: string | undefined;
  status: string;
  totalQty: number;
};
