import { whatsappLink } from "../branding";
import {
  autoOpenAdminWhatsAppOnRequest,
  subscriptionNotifyWebhookUrl,
  superAdminContact,
} from "../config/superAdminNotify";
import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import type { SubscriptionRequest } from "../types";
import { isTierUpgradePlan, parseTierUpgradePlan } from "./subscriptionFeatures";

function formatRequestType(request: SubscriptionRequest, isArabic: boolean) {
  if (isTierUpgradePlan(request.plan)) {
    const tier = parseTierUpgradePlan(request.plan);
    if (tier) {
      return isArabic
        ? `ترقية باقة → ${getSubscriptionTierLabel(tier, true)}`
        : `Package upgrade → ${getSubscriptionTierLabel(tier, false)}`;
    }
  }
  return isArabic ? "تجديد اشتراك" : "Subscription renewal";
}

export function formatSuperAdminSubscriptionMessage(
  request: SubscriptionRequest,
  isArabic: boolean,
) {
  const typeLabel = formatRequestType(request, isArabic);
  const pharmacy = request.pharmacyName || request.pharmacyId;
  const requester = request.requestedByName || request.requestedBy || "—";
  const amount = `${request.amount} ${request.currency || "EGP"}`;

  if (isArabic) {
    const daysLine = isTierUpgradePlan(request.plan) ? "" : `\nالمدة: ${request.days} يوم`;
    return (
      `🔔 طلب اشتراك جديد\n` +
      `النوع: ${typeLabel}\n` +
      `رقم الطلب: ${request.requestNumber}\n` +
      `الصيدلية: ${pharmacy}\n` +
      `المبلغ: ${amount}${daysLine}\n` +
      `مقدم الطلب: ${requester}\n` +
      `الحالة: قيد المراجعة`
    );
  }

  const daysLine = isTierUpgradePlan(request.plan) ? "" : `\nDays: ${request.days}`;
  return (
    `🔔 New subscription request\n` +
    `Type: ${typeLabel}\n` +
    `Request: ${request.requestNumber}\n` +
    `Pharmacy: ${pharmacy}\n` +
    `Amount: ${amount}${daysLine}\n` +
    `Requested by: ${requester}\n` +
    `Status: pending review`
  );
}

export function formatSuperAdminSubscriptionEmailSubject(request: SubscriptionRequest) {
  return `[Focus Pharmacy] New request ${request.requestNumber} — ${request.pharmacyName || request.pharmacyId}`;
}

export function getSuperAdminSubscriptionMailtoUrl(request: SubscriptionRequest) {
  if (!superAdminContact.email) return "";
  const subject = encodeURIComponent(formatSuperAdminSubscriptionEmailSubject(request));
  const body = encodeURIComponent(formatSuperAdminSubscriptionMessage(request, false));
  return `mailto:${superAdminContact.email}?subject=${subject}&body=${body}`;
}

export function getSuperAdminSubscriptionWhatsappUrl(request: SubscriptionRequest) {
  return whatsappLink(formatSuperAdminSubscriptionMessage(request, true));
}

export async function notifySuperAdminOfSubscriptionRequest(
  request: SubscriptionRequest,
): Promise<void> {
  const payload = {
    event: "subscription_request_created",
    request: {
      id: request.id,
      requestNumber: request.requestNumber,
      pharmacyId: request.pharmacyId,
      pharmacyName: request.pharmacyName,
      plan: request.plan,
      days: request.days,
      amount: request.amount,
      currency: request.currency,
      status: request.status,
      requestedBy: request.requestedBy,
      requestedByName: request.requestedByName,
      createdAt: request.createdAt,
      isTierUpgrade: isTierUpgradePlan(request.plan),
      targetTier: parseTierUpgradePlan(request.plan),
    },
    admin: {
      whatsappUrl: getSuperAdminSubscriptionWhatsappUrl(request),
      mailtoUrl: getSuperAdminSubscriptionMailtoUrl(request) || undefined,
      email: superAdminContact.email || undefined,
      phone: superAdminContact.phone,
    },
    messageAr: formatSuperAdminSubscriptionMessage(request, true),
    messageEn: formatSuperAdminSubscriptionMessage(request, false),
  };

  if (subscriptionNotifyWebhookUrl) {
    try {
      await fetch(subscriptionNotifyWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.error("Subscription notify webhook failed:", error);
    }
  }

  if (autoOpenAdminWhatsAppOnRequest) {
    try {
      window.open(getSuperAdminSubscriptionWhatsappUrl(request), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Admin WhatsApp notify failed:", error);
    }
  }
}

export async function requestSuperAdminNotificationPermission() {
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

export function playAdminAlertSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const playTone = (frequency: number, start: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + duration);
    };

    playTone(880, 0, 0.12);
    playTone(1175, 0.14, 0.14);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    // Optional audio feedback.
  }
}

export function showSuperAdminBrowserNotification(
  request: SubscriptionRequest,
  isArabic: boolean,
  onOpen?: () => void,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const title = isArabic ? "طلب اشتراك جديد" : "New subscription request";
  const body = formatSuperAdminSubscriptionMessage(request, isArabic).replace(/\n/g, " · ");

  try {
    const notification = new Notification(title, {
      body,
      tag: `subscription-request-${request.id}`,
      requireInteraction: true,
    });
    notification.onclick = () => {
      window.focus();
      onOpen?.();
      window.dispatchEvent(new CustomEvent("focus-admin-requests"));
      notification.close();
    };
  } catch (error) {
    console.error("Browser notification failed:", error);
  }
}
