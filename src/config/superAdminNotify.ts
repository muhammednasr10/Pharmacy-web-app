import { developerInfo } from "../branding";

/** Optional webhook (n8n / Zapier / Make) for email or WhatsApp automation. */
export const subscriptionNotifyWebhookUrl = (
  import.meta.env.VITE_SUBSCRIPTION_NOTIFY_WEBHOOK_URL || ""
).trim();

/** Open WhatsApp to super admin after pharmacy submits (optional — off by default). */
export const autoOpenAdminWhatsAppOnRequest =
  String(import.meta.env.VITE_AUTO_OPEN_ADMIN_WHATSAPP || "false").toLowerCase() === "true";

export const superAdminContact = {
  name: developerInfo.name,
  phone: developerInfo.phone,
  whatsappNumber: developerInfo.whatsappNumber,
  email: (import.meta.env.VITE_SUPER_ADMIN_EMAIL || "").trim(),
};
