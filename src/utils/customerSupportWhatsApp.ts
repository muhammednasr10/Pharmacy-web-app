import { whatsappLink } from "../branding";

export type CustomerSupportContext = {
  isArabic: boolean;
  pharmacyName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  issue?: string;
};

export function buildCustomerSupportWhatsAppMessage(ctx: CustomerSupportContext): string {
  const { isArabic, pharmacyName, userName, userEmail, userRole, issue } = ctx;

  if (isArabic) {
    const lines = ["السلام عليكم، أحتاج مساعدة في نظام إدارة الصيدلية.", ""];
    if (pharmacyName?.trim()) lines.push(`الصيدلية: ${pharmacyName.trim()}`);
    if (userName?.trim()) lines.push(`المستخدم: ${userName.trim()}`);
    if (userEmail?.trim()) lines.push(`الإيميل: ${userEmail.trim()}`);
    if (userRole?.trim()) lines.push(`الدور: ${userRole.trim()}`);
    if (issue?.trim()) {
      lines.push("", "التفاصيل:", issue.trim());
    }
    return lines.join("\n");
  }

  const lines = ["Hello, I need help with the pharmacy management system.", ""];
  if (pharmacyName?.trim()) lines.push(`Pharmacy: ${pharmacyName.trim()}`);
  if (userName?.trim()) lines.push(`User: ${userName.trim()}`);
  if (userEmail?.trim()) lines.push(`Email: ${userEmail.trim()}`);
  if (userRole?.trim()) lines.push(`Role: ${userRole.trim()}`);
  if (issue?.trim()) {
    lines.push("", "Details:", issue.trim());
  }
  return lines.join("\n");
}

export function getCustomerSupportWhatsAppUrl(ctx: CustomerSupportContext): string {
  return whatsappLink(buildCustomerSupportWhatsAppMessage(ctx));
}
