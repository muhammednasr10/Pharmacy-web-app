export function formatLoginAccountSyncError(message: string, isArabic: boolean) {
  if (message === "auth_user_not_found") {
    return isArabic
      ? "لا يوجد حساب بهذا الإيميل في Supabase Auth. أنشئه أولاً من Authentication → Users."
      : "No Auth user with this email. Create it in Supabase Authentication → Users first.";
  }
  if (message === "not_authorized") {
    return isArabic ? "ليس لديك صلاحية الربط" : "You are not allowed to sync users";
  }
  if (message.includes("users_role_check") || message === "invalid_role") {
    return isArabic
      ? "الدور غير مسموح أو غير مُعرَّف في Supabase.\n\nللأدوار المدمجة: شغّل supabase/fix-branch-manager-sync.sql\nللأدوار المخصصة (مثل دليفرى): أنشئ الدور من البرنامج ثم شغّل supabase/pharmacy-custom-roles.sql و supabase/fix-login-account-role-sync.sql\nثم اضغط «ربط» على الحساب."
      : "Role is not allowed or not defined in Supabase.\n\nBuilt-in roles: run supabase/fix-branch-manager-sync.sql\nCustom roles: create the role in the app, then run supabase/pharmacy-custom-roles.sql and supabase/fix-login-account-role-sync.sql\nThen click Link on the account.";
  }
  if (message === "edit_pending") {
    return isArabic
      ? "يوجد تعديل قيد الاعتماد على هذا الحساب. انتظر حتى يُعتمد أو يُرفض."
      : "An edit is pending on this account. Wait until it is approved or rejected.";
  }
  if (message === "link_request_already_pending") {
    return isArabic ? "طلب الربط مُرسل بالفعل" : "Link request already sent";
  }
  if (message === "revoke_rpc_not_configured") {
    return isArabic
      ? "شغّل supabase/user-session-revocation.sql في Supabase أولاً"
      : "Run supabase/user-session-revocation.sql in Supabase first";
  }
  return message;
}
