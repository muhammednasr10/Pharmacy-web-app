import type {
  AppUser,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  PharmacySettings,
} from "../../types";

export type CustomersPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
  invoices: Invoice[];
  totalCustomerPayments: number;
  appUser: AppUser | null;
  user: { uid: string } | null;
  isSubscriptionExpired: boolean;
  canCollectPayments: boolean;
  canDeletePayments: boolean;
  getPaymentLabel: (method: string) => string;
  getPharmacyId: () => string;
  pharmacySettings: PharmacySettings | null;
  onActivityLog: (entry: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  onViewInvoice: (invoice: Invoice) => void;
  openPaymentModalRequest?: number;
  onOpenPaymentModalRequestConsumed?: () => void;
  initialCustomerSearch?: string;
  onInitialCustomerSearchConsumed?: () => void;
};
