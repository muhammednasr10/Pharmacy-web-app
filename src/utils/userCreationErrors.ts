export function formatUserCreationError(message: string, isArabic: boolean): string {
  if (message === "name_required") {
    return isArabic ? "أدخل الاسم الكامل" : "Enter your full name";
  }
  if (message === "pharmacy_name_required") {
    return isArabic
      ? "أدخل اسم الصيدلية (حرفان على الأقل)"
      : "Enter pharmacy name (at least 2 characters)";
  }
  if (message === "trial_already_provisioned") {
    return isArabic ? "تم إنشاء صيدليتك مسبقاً" : "Your pharmacy was already created";
  }
  if (message === "password_too_short") {
    return isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters";
  }
  if (message === "email_address_invalid_format") {
    return isArabic ? "صيغة الإيميل غير صحيحة" : "Invalid email format";
  }
  if (message === "email_domain_rejected" || message === "email_address_invalid") {
    return isArabic
      ? "Supabase يرفض هذا الدومين. استخدم بريداً حقيقياً (Gmail، Outlook، Yahoo...) وليس دومين وهمي مثل pharmacy.com"
      : "This email domain was rejected. Use a real mailbox (Gmail, Outlook, Yahoo...) not a fake domain like pharmacy.com";
  }
  if (message === "email_not_authorized" || message === "email_address_not_authorized") {
    return isArabic
      ? "لا يمكن إرسال بريد لهذا العنوان. فعّل SMTP مخصص في Supabase → Authentication → SMTP Settings"
      : "Email cannot be sent to this address. Set up custom SMTP in Supabase → Authentication → SMTP Settings";
  }
  if (message === "over_email_send_rate_limit") {
    return isArabic
      ? "تم إرسال عدد كبير من الطلبات. انتظر دقائق ثم حاول مرة أخرى."
      : "Too many requests. Please wait a few minutes and try again.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return isArabic ? "هذا الإيميل مسجل بالفعل" : "This email is already registered";
  }
  if (message === "user_limit_reached") {
    return isArabic
      ? "تم الوصول للحد الأقصى لمستخدمي الصيدلية. تواصل مع الدعم لزيادة الباقة."
      : "Pharmacy user limit reached. Contact support to upgrade the plan.";
  }
  if (message === "auth_pending_confirmation") {
    return isArabic
      ? "تم إنشاء الحساب. قد يحتاج المستخدم لتأكيد البريد قبل أول تسجيل دخول."
      : "Account created. The user may need to confirm their email before signing in.";
  }
  return message;
}
