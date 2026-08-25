export function formatUserCreationError(message: string, isArabic: boolean): string {
  if (message === "name_required") {
    return isArabic ? "أدخل الاسم الكامل" : "Enter your full name";
  }
  if (message === "pharmacy_name_required") {
    return isArabic
      ? "أدخل اسم الصيدلية (حرفان على الأقل)"
      : "Enter pharmacy name (at least 2 characters)";
  }
  if (message === "phone_required") {
    return isArabic
      ? "أدخل رقم التليفون (8 أرقام على الأقل)"
      : "Enter a phone number (at least 8 digits)";
  }
  if (message === "address_required") {
    return isArabic ? "أدخل عنوان الصيدلية" : "Enter the pharmacy address";
  }
  if (message === "trial_already_provisioned") {
    return isArabic ? "تم إنشاء صيدليتك مسبقاً" : "Your pharmacy was already created";
  }
  if (message === "password_too_short") {
    return isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters";
  }
  if (message === "password_required") {
    return isArabic ? "أدخل كلمة المرور" : "Enter a password";
  }
  if (message === "trial_registration_not_configured") {
    return isArabic
      ? "تسجيل التجربة غير مفعّل على الخادم. نفّذ fix-trial-registration.sql في Supabase ثم أعد المحاولة."
      : "Trial signup is not configured on the server. Run fix-trial-registration.sql in Supabase, then try again.";
  }
  if (message === "not_authorized" || message === "forbidden") {
    return isArabic ? "غير مصرح بهذا الإجراء" : "Not authorized for this action";
  }
  if (message === "cannot_delete_super_admin") {
    return isArabic ? "لا يمكن حذف مالك النظام" : "Cannot delete the system owner";
  }
  if (message === "email_address_invalid_format") {
    return isArabic ? "صيغة الإيميل غير صحيحة" : "Invalid email format";
  }
  if (message === "email_domain_rejected" || message === "email_address_invalid") {
    return isArabic
      ? "البريد الإلكتروني غير مقبول. تأكد من صحة العنوان أو جرّب بريداً آخر."
      : "This email address was rejected. Check the format or try another address.";
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
  if (message === "email_already_registered") {
    return isArabic ? "هذا الإيميل مسجل بالفعل" : "This email is already registered";
  }
  if (message === "signup_request_already_pending") {
    return isArabic
      ? "طلب تسجيل بهذا الإيميل قيد المراجعة بالفعل. انتظر الاعتماد من مالك النظام."
      : "A signup request for this email is already pending. Wait for the system owner to approve it.";
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
