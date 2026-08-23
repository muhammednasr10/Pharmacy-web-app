import type { PharmacySettings } from "../types";

export type CustomerExportContext = {
  isArabic: boolean;
  currency: string;
  pharmacySettings: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
};
