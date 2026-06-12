import { whatsappLink } from "../branding";
import { autoOpenExpiryWhatsAppOnAlert, expiryNotifyWebhookUrl } from "../config/expiryNotify";
import { formatDateInput } from "./date";
import { getBranchLabel } from "./branchLabel";
import {
  filterExpiredMedicines,
  filterExpiringSoonMedicines,
  getExpiringSoonDays,
} from "./inventoryAlerts";
import type { Medicine, PharmacySettings } from "../types";

const STORAGE_PREFIX = "focus-expiry-notify";

export type ExpiryAlertItem = {
  id: number;
  name: string;
  expiry: string;
  qty: number;
  pharmacyId?: string;
  branchLabel: string;
  kind: "expired" | "expiring";
};

export type ExpiryAlertSummary = {
  expiredCount: number;
  expiringCount: number;
  items: ExpiryAlertItem[];
  hasAlerts: boolean;
};

function notifyStorageKey(pharmacyId: string) {
  return `${STORAGE_PREFIX}-${pharmacyId}-${formatDateInput(new Date())}`;
}

export function wasExpiryNotifySentToday(pharmacyId: string) {
  try {
    return localStorage.getItem(notifyStorageKey(pharmacyId)) === "1";
  } catch {
    return false;
  }
}

export function markExpiryNotifySentToday(pharmacyId: string) {
  try {
    localStorage.setItem(notifyStorageKey(pharmacyId), "1");
  } catch {
    // Ignore storage errors.
  }
}

export function isExpiryNotifyEnabled(settings?: PharmacySettings | null) {
  return settings?.expiryNotifyEnabled !== false;
}

export function resolveExpiryNotifyPhone(settings?: PharmacySettings | null) {
  return (settings?.expiryNotifyPhone || settings?.phone || "").trim();
}

export function resolveExpiryNotifyEmail(settings?: PharmacySettings | null) {
  return (settings?.expiryNotifyEmail || "").trim();
}

export function buildExpiryAlertSummary(params: {
  medicines: Medicine[];
  branches: PharmacySettings[];
  fallbackSettings?: PharmacySettings | null;
  isArabic: boolean;
  maxItems?: number;
}): ExpiryAlertSummary {
  const todayValue = formatDateInput(new Date());
  const maxItems = params.maxItems ?? 12;
  const expired = filterExpiredMedicines(params.medicines, todayValue);
  const expiring = filterExpiringSoonMedicines(
    params.medicines,
    params.branches,
    params.fallbackSettings,
    todayValue,
  );

  const items: ExpiryAlertItem[] = [
    ...expired.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      expiry: medicine.expiry,
      qty: medicine.qty,
      pharmacyId: medicine.pharmacyId,
      branchLabel: getBranchLabel(medicine.pharmacyId, params.branches, params.isArabic),
      kind: "expired" as const,
    })),
    ...expiring.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      expiry: medicine.expiry,
      qty: medicine.qty,
      pharmacyId: medicine.pharmacyId,
      branchLabel: getBranchLabel(medicine.pharmacyId, params.branches, params.isArabic),
      kind: "expiring" as const,
    })),
  ]
    .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.name.localeCompare(b.name))
    .slice(0, maxItems);

  return {
    expiredCount: expired.length,
    expiringCount: expiring.length,
    items,
    hasAlerts: expired.length + expiring.length > 0,
  };
}

export function formatExpiryAlertMessage(
  summary: ExpiryAlertSummary,
  params: {
    pharmacyName: string;
    expiringSoonDays: number;
    isArabic: boolean;
  },
) {
  const { pharmacyName, expiringSoonDays, isArabic } = params;

  if (!summary.hasAlerts) {
    return isArabic
      ? `✅ ${pharmacyName}\nلا توجد أدوية منتهية أو قرب انتهاء الصلاحية اليوم.`
      : `✅ ${pharmacyName}\nNo expired or expiring medicines today.`;
  }

  const header = isArabic
    ? `⚠️ تنبيه صلاحية مخزون — ${pharmacyName}\nمنتهي: ${summary.expiredCount} · قرب الانتهاء (${expiringSoonDays} يوم): ${summary.expiringCount}`
    : `⚠️ Stock expiry alert — ${pharmacyName}\nExpired: ${summary.expiredCount} · Expiring within ${expiringSoonDays} days: ${summary.expiringCount}`;

  const lines = summary.items.map((item) => {
    const kind = isArabic
      ? item.kind === "expired"
        ? "منتهي"
        : "قرب الانتهاء"
      : item.kind === "expired"
        ? "Expired"
        : "Expiring";
    const branch = item.branchLabel ? ` · ${item.branchLabel}` : "";
    return `• ${item.name} (${kind}) — ${item.expiry} · ${item.qty}${branch}`;
  });

  const footer = isArabic
    ? "\nافتح نظام Focus Pharmacy → المخزون للتفاصيل."
    : "\nOpen Focus Pharmacy → Inventory for details.";

  return [header, ...lines, footer].join("\n");
}

export function getExpiryWhatsappUrl(message: string, phone?: string) {
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits) {
      return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    }
  }
  return whatsappLink(message);
}

export function getExpiryMailtoUrl(
  summary: ExpiryAlertSummary,
  params: {
    pharmacyName: string;
    expiringSoonDays: number;
    email: string;
    isArabic: boolean;
  },
) {
  if (!params.email) return "";
  const subject = params.isArabic
    ? `[Focus Pharmacy] تنبيه صلاحية — ${params.pharmacyName}`
    : `[Focus Pharmacy] Expiry alert — ${params.pharmacyName}`;
  const body = formatExpiryAlertMessage(summary, params);
  return `mailto:${params.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function requestExpiryNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function showExpiryBrowserNotification(
  summary: ExpiryAlertSummary,
  params: { pharmacyName: string; isArabic: boolean; onOpen?: () => void },
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const title = params.isArabic ? "تنبيه صلاحية المخزون" : "Stock expiry alert";
  const body = params.isArabic
    ? `${params.pharmacyName}: ${summary.expiredCount} منتهي، ${summary.expiringCount} قرب الانتهاء`
    : `${params.pharmacyName}: ${summary.expiredCount} expired, ${summary.expiringCount} expiring soon`;

  try {
    const notification = new Notification(title, {
      body,
      tag: `expiry-alert-${params.pharmacyName}-${formatDateInput(new Date())}`,
    });
    notification.onclick = () => {
      window.focus();
      params.onOpen?.();
      notification.close();
    };
  } catch (error) {
    console.error("Expiry browser notification failed:", error);
  }
}

export async function notifyExpiryAlerts(params: {
  pharmacyId: string;
  pharmacyName: string;
  medicines: Medicine[];
  branches: PharmacySettings[];
  settings?: PharmacySettings | null;
  isArabic: boolean;
  force?: boolean;
  onOpenInventory?: () => void;
}): Promise<ExpiryAlertSummary | null> {
  const settings = params.settings;
  if (!isExpiryNotifyEnabled(settings)) return null;

  const summary = buildExpiryAlertSummary({
    medicines: params.medicines,
    branches: params.branches,
    fallbackSettings: settings,
    isArabic: params.isArabic,
  });

  if (!summary.hasAlerts) return summary;
  if (!params.force && wasExpiryNotifySentToday(params.pharmacyId)) return summary;

  const expiringSoonDays = getExpiringSoonDays(settings);
  const messageAr = formatExpiryAlertMessage(summary, {
    pharmacyName: params.pharmacyName,
    expiringSoonDays,
    isArabic: true,
  });
  const messageEn = formatExpiryAlertMessage(summary, {
    pharmacyName: params.pharmacyName,
    expiringSoonDays,
    isArabic: false,
  });
  const notifyPhone = resolveExpiryNotifyPhone(settings);
  const notifyEmail = resolveExpiryNotifyEmail(settings);

  showExpiryBrowserNotification(summary, {
    pharmacyName: params.pharmacyName,
    isArabic: params.isArabic,
    onOpen: params.onOpenInventory,
  });

  if (expiryNotifyWebhookUrl) {
    try {
      await fetch(expiryNotifyWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "medicine_expiry_alert",
          pharmacyId: params.pharmacyId,
          pharmacyName: params.pharmacyName,
          expiredCount: summary.expiredCount,
          expiringCount: summary.expiringCount,
          expiringSoonDays,
          items: summary.items,
          notifyPhone: notifyPhone || undefined,
          notifyEmail: notifyEmail || undefined,
          whatsappUrl: getExpiryWhatsappUrl(params.isArabic ? messageAr : messageEn, notifyPhone),
          mailtoUrl:
            getExpiryMailtoUrl(summary, {
              pharmacyName: params.pharmacyName,
              expiringSoonDays,
              email: notifyEmail,
              isArabic: params.isArabic,
            }) || undefined,
          messageAr,
          messageEn,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error("Expiry notify webhook failed:", error);
    }
  }

  if (autoOpenExpiryWhatsAppOnAlert && notifyPhone) {
    try {
      window.open(
        getExpiryWhatsappUrl(params.isArabic ? messageAr : messageEn, notifyPhone),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      console.error("Expiry WhatsApp notify failed:", error);
    }
  }

  markExpiryNotifySentToday(params.pharmacyId);
  return summary;
}
