export function formatCreatePharmacyError(message: string, isArabic: boolean): string {
  const normalized = message.trim().toLowerCase();

  const map: Record<string, [string, string]> = {
    pharmacy_id_exists: [
      "المعرف مستخدم بالفعل — اختر معرفاً آخر",
      "This pharmacy ID is already in use — choose another ID",
    ],
    pharmacy_id_required: ["أدخل معرف الصيدلية", "Enter a pharmacy ID"],
    pharmacy_name_required: ["أدخل اسم الصيدلية", "Enter a pharmacy name"],
    forbidden: ["ليس لديك صلاحية إنشاء صيدلية", "You are not allowed to create pharmacies"],
  };

  for (const [key, [ar, en]] of Object.entries(map)) {
    if (normalized.includes(key)) {
      return isArabic ? ar : en;
    }
  }

  if (normalized.includes("duplicate key") || normalized.includes("23505")) {
    return isArabic
      ? "المعرف مستخدم بالفعل — اختر معرفاً آخر"
      : "This pharmacy ID is already in use — choose another ID";
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("new row violates") ||
    normalized.includes("violates row-level security")
  ) {
    return isArabic
      ? "صلاحيات قاعدة البيانات تمنع الإنشاء. شغّل ملف supabase/create-saas-pharmacy.sql في Supabase"
      : "Database permissions blocked creation. Run supabase/create-saas-pharmacy.sql in Supabase";
  }

  if (normalized.includes("foreign key") || normalized.includes("23503")) {
    return isArabic
      ? "تعذر ربط المجموعة. شغّل supabase/create-saas-pharmacy.sql في Supabase ثم أعد المحاولة"
      : "Could not link organization. Run supabase/create-saas-pharmacy.sql in Supabase, then retry";
  }

  if (normalized.includes("create_saas_pharmacy") || normalized.includes("pgrst202")) {
    return isArabic
      ? "دالة إنشاء الصيدلية غير مثبتة. شغّل supabase/create-saas-pharmacy.sql في Supabase"
      : "Create-pharmacy function is missing. Run supabase/create-saas-pharmacy.sql in Supabase";
  }

  return message;
}
