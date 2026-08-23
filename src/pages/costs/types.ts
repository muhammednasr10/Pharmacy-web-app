import type { Invoice, PharmacyCost } from "../../types";

export type CostsPageProps = {
  embedded?: boolean;
  costs: PharmacyCost[];
  invoices: Invoice[];
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  pharmacyId: string;
  canManageCosts: boolean;
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
  safeNumber: (value: unknown) => number;
  downloadCSV: (filename: string, rows: string[][]) => void;
  onRefreshCosts: () => Promise<void>;
};

export type CostPlanFormState = {
  title: string;
  category: string;
  plannedAmount: number;
  notes: string;
};

export const emptyPlanForm: CostPlanFormState = {
  title: "",
  category: "other",
  plannedAmount: 0,
  notes: "",
};
