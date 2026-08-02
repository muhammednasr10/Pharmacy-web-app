import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getExpiringSoonDays,
  getLowStockThreshold,
} from "./inventoryAlerts";
import type { PharmacySettings } from "../types";

export type SettingsFormState = {
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  invoiceFooter: string;
  subscriptionPlan: string;
  subscriptionEndDate: string;
  logoBase64: string;
  lowStockThreshold: number;
  expiringSoonDays: number;
  expiryNotifyEnabled: boolean;
  expiryNotifyPhone: string;
  expiryNotifyEmail: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
};

export function createEmptySettingsForm(): SettingsFormState {
  return {
    name: "",
    name_en: "",
    phone: "",
    address: "",
    currency: "ج.م",
    invoiceFooter: "",
    subscriptionPlan: "monthly",
    subscriptionEndDate: "",
    logoBase64: "",
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    expiringSoonDays: DEFAULT_EXPIRING_SOON_DAYS,
    expiryNotifyEnabled: true,
    expiryNotifyPhone: "",
    expiryNotifyEmail: "",
    latitude: "",
    longitude: "",
    geofenceRadiusM: "30",
  };
}

export function mapPharmacySettingsToForm(settings: PharmacySettings): SettingsFormState {
  return {
    name: settings.name || "",
    name_en: settings.name_en || "",
    phone: settings.phone || "",
    address: settings.address || "",
    currency: settings.currency || "ج.م",
    invoiceFooter: settings.invoiceFooter || "",
    subscriptionPlan: settings.subscriptionPlan || "monthly",
    subscriptionEndDate: settings.subscriptionEndDate || "",
    logoBase64: settings.logoBase64 || "",
    lowStockThreshold: getLowStockThreshold(settings),
    expiringSoonDays: getExpiringSoonDays(settings),
    expiryNotifyEnabled: settings.expiryNotifyEnabled !== false,
    expiryNotifyPhone: settings.expiryNotifyPhone || "",
    expiryNotifyEmail: settings.expiryNotifyEmail || "",
    latitude: settings.latitude != null ? String(settings.latitude) : "",
    longitude: settings.longitude != null ? String(settings.longitude) : "",
    geofenceRadiusM:
      settings.geofenceRadiusM != null ? String(settings.geofenceRadiusM) : "30",
  };
}

export function mergeExpiryNotifySnapshot(
  pharmacySettings: PharmacySettings,
  settingsForm: SettingsFormState,
): PharmacySettings {
  return {
    ...pharmacySettings,
    name: settingsForm.name || pharmacySettings.name,
    phone: settingsForm.phone || pharmacySettings.phone,
    expiringSoonDays: settingsForm.expiringSoonDays,
    expiryNotifyEnabled: settingsForm.expiryNotifyEnabled,
    expiryNotifyPhone: settingsForm.expiryNotifyPhone,
    expiryNotifyEmail: settingsForm.expiryNotifyEmail,
  };
}
