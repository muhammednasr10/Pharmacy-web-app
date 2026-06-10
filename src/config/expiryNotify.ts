/** Optional webhook (n8n / Zapier / Make) for email or WhatsApp automation. */
export const expiryNotifyWebhookUrl = (import.meta.env.VITE_EXPIRY_NOTIFY_WEBHOOK_URL || "").trim();

/** Open WhatsApp digest after daily expiry check (optional — off by default). */
export const autoOpenExpiryWhatsAppOnAlert =
  String(import.meta.env.VITE_AUTO_OPEN_EXPIRY_WHATSAPP || "false").toLowerCase() === "true";
