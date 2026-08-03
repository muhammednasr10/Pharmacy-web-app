import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, Medicine, PharmacySettings } from "../types";
import {
  buildExpiryAlertSummary,
  formatExpiryAlertMessage,
  getExpiryMailtoUrl,
  getExpiryWhatsappUrl,
  notifyExpiryAlerts,
  requestExpiryNotificationPermission,
  resolveExpiryNotifyEmail,
  resolveExpiryNotifyPhone,
} from "../utils/expiryNotify";
import { getExpiringSoonDays } from "../utils/inventoryAlerts";
import { parseBranchGeoField } from "../utils/branchGeo";
import {
  createEmptySettingsForm,
  mergeExpiryNotifySnapshot,
  type SettingsFormState,
} from "../utils/pharmacySettingsForm";

type ActivityLogInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
};

type UsePharmacySettingsOptions = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacySettings: PharmacySettings | null;
  setPharmacySettings: Dispatch<SetStateAction<PharmacySettings | null>>;
  medicines: Medicine[];
  branches: PharmacySettings[];
  getPharmacyId: () => string;
  addActivityLog: (data: ActivityLogInput) => Promise<void>;
  onOpenInventoryExpiryView: () => void;
};

export function usePharmacySettings({
  isArabic,
  appUser,
  pharmacySettings,
  setPharmacySettings,
  medicines,
  branches,
  getPharmacyId,
  addActivityLog,
  onOpenInventoryExpiryView,
}: UsePharmacySettingsOptions) {
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(createEmptySettingsForm);

  const getExpiryNotifySettingsSnapshot = useCallback((): PharmacySettings | null => {
    if (!pharmacySettings) return null;
    return mergeExpiryNotifySnapshot(pharmacySettings, settingsForm);
  }, [pharmacySettings, settingsForm]);

  const buildCurrentExpirySummary = useCallback(() => {
    const notifySettings = getExpiryNotifySettingsSnapshot();
    return buildExpiryAlertSummary({
      medicines,
      branches,
      fallbackSettings: notifySettings,
      isArabic,
    });
  }, [branches, getExpiryNotifySettingsSnapshot, isArabic, medicines]);

  const handleLogoUpload = useCallback(
    (file: File | null) => {
      if (!file) return;

      const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert(
          isArabic
            ? "يرجى اختيار صورة PNG أو JPG أو WebP"
            : "Please choose a PNG, JPG, or WebP image",
        );
        return;
      }

      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(
          isArabic
            ? "حجم الصورة كبير. الحد الأقصى 2 ميجابايت"
            : "Image is too large. Maximum size is 2 MB",
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        setSettingsForm((current) => ({
          ...current,
          logoBase64: String(reader.result || ""),
        }));
      };

      reader.onerror = () => {
        alert(isArabic ? "تعذر قراءة الصورة" : "Could not read the image");
      };

      reader.readAsDataURL(file);
    },
    [isArabic],
  );

  const savePharmacySettings = useCallback(async () => {
    if (!canEditOrgWideSettings(appUser) && !isBranchManager(appUser)) {
      alert(
        isArabic
          ? "ليس لديك صلاحية لتعديل الإعدادات"
          : "You do not have permission to edit settings",
      );
      return;
    }

    if (!settingsForm.name || !settingsForm.phone) {
      alert(isArabic ? "اسم الصيدلية ورقم الهاتف مطلوبان" : "Pharmacy name and phone are required");
      return;
    }

    const latitude = parseBranchGeoField(settingsForm.latitude);
    const longitude = parseBranchGeoField(settingsForm.longitude);
    const geofenceRadiusM = parseBranchGeoField(settingsForm.geofenceRadiusM) ?? 30;

    if ((latitude != null) !== (longitude != null)) {
      alert(
        isArabic
          ? "أدخل خط العرض وخط الطول معاً لموقع الفرع"
          : "Enter both latitude and longitude for branch location",
      );
      return;
    }

    if (geofenceRadiusM < 10 || geofenceRadiusM > 500) {
      alert(
        isArabic
          ? "نطاق الحضور يجب أن يكون بين 10 و 500 متر"
          : "Geofence radius must be between 10 and 500 meters",
      );
      return;
    }

    const settingsUpdates: Partial<PharmacySettings> & { id: string } = {
      id: getPharmacyId(),
      name: settingsForm.name,
      name_en: settingsForm.name_en,
      phone: settingsForm.phone,
      address: settingsForm.address,
      isActive: true,
      latitude,
      longitude,
      geofenceRadiusM,
    };

    if (isBranchManager(appUser) && !canEditOrgWideSettings(appUser)) {
      settingsUpdates.invoiceFooter = settingsForm.invoiceFooter;
      settingsUpdates.logoBase64 = settingsForm.logoBase64;
    } else {
      const lowStockThresholdValue = Number(settingsForm.lowStockThreshold);
      const expiringSoonDaysValue = Number(settingsForm.expiringSoonDays);

      if (!Number.isFinite(lowStockThresholdValue) || lowStockThresholdValue < 0) {
        alert(isArabic ? "حد الكمية الناقصة غير صالح" : "Invalid low stock threshold");
        return;
      }

      if (!Number.isFinite(expiringSoonDaysValue) || expiringSoonDaysValue <= 0) {
        alert(isArabic ? "عدد أيام قرب انتهاء الصلاحية غير صالح" : "Invalid expiring soon days");
        return;
      }

      Object.assign(settingsUpdates, {
        currency: settingsForm.currency,
        invoiceFooter: settingsForm.invoiceFooter,
        logoBase64: settingsForm.logoBase64,
        lowStockThreshold: lowStockThresholdValue,
        expiringSoonDays: expiringSoonDaysValue,
        expiryNotifyEnabled: settingsForm.expiryNotifyEnabled,
        expiryNotifyPhone: settingsForm.expiryNotifyPhone.trim(),
        expiryNotifyEmail: settingsForm.expiryNotifyEmail.trim(),
      });
    }

    if (isSuperAdmin(appUser)) {
      settingsUpdates.subscriptionPlan = settingsForm.subscriptionPlan;
      settingsUpdates.subscriptionEndDate = settingsForm.subscriptionEndDate;
    }

    await pharmacyService.upsertPharmacySettings(getPharmacyId(), settingsUpdates);

    const refreshedSettings = await pharmacyService.getPharmacySettings(getPharmacyId());
    if (refreshedSettings) {
      setPharmacySettings(refreshedSettings);
    }

    await addActivityLog({
      type: "settings_update",
      title: isArabic ? "تعديل الإعدادات" : "Settings Updated",
      description: isArabic
        ? `تم تعديل بيانات الصيدلية ${settingsForm.name}`
        : `Pharmacy settings were updated: ${settingsForm.name}`,
      referenceType: "pharmacy",
      referenceId: getPharmacyId(),
    });

    alert(isArabic ? "تم حفظ الإعدادات" : "Settings saved");
  }, [addActivityLog, appUser, getPharmacyId, isArabic, setPharmacySettings, settingsForm]);

  const handleRequestExpiryNotificationPermission = useCallback(async () => {
    const granted = await requestExpiryNotificationPermission();
    alert(
      granted
        ? isArabic
          ? "تم تفعيل إشعارات المتصفح"
          : "Browser notifications enabled"
        : isArabic
          ? "لم يتم منح إذن الإشعارات"
          : "Notification permission was not granted",
    );
    return granted;
  }, [isArabic]);

  const handleSendExpiryNotifyNow = useCallback(async () => {
    const notifySettings = getExpiryNotifySettingsSnapshot();
    if (!notifySettings) return;

    const summary = await notifyExpiryAlerts({
      pharmacyId: getPharmacyId(),
      pharmacyName: notifySettings.name || getPharmacyId(),
      medicines,
      branches,
      settings: notifySettings,
      isArabic,
      force: true,
      onOpenInventory: onOpenInventoryExpiryView,
    });

    if (!summary?.hasAlerts) {
      alert(
        isArabic
          ? "لا توجد أدوية منتهية أو قرب انتهاء الصلاحية حالياً"
          : "No expired or expiring medicines right now",
      );
      return;
    }

    alert(
      isArabic
        ? `تم إرسال التنبيه: ${summary.expiredCount} منتهي، ${summary.expiringCount} قرب الانتهاء`
        : `Alert sent: ${summary.expiredCount} expired, ${summary.expiringCount} expiring soon`,
    );
  }, [
    branches,
    getExpiryNotifySettingsSnapshot,
    getPharmacyId,
    isArabic,
    medicines,
    onOpenInventoryExpiryView,
  ]);

  const handleOpenExpiryWhatsappDigest = useCallback(() => {
    const notifySettings = getExpiryNotifySettingsSnapshot();
    if (!notifySettings) return;

    const summary = buildCurrentExpirySummary();
    const message = formatExpiryAlertMessage(summary, {
      pharmacyName: notifySettings.name || getPharmacyId(),
      expiringSoonDays: getExpiringSoonDays(notifySettings),
      isArabic,
    });
    const phone = resolveExpiryNotifyPhone(notifySettings);
    window.open(getExpiryWhatsappUrl(message, phone), "_blank", "noopener,noreferrer");
  }, [buildCurrentExpirySummary, getExpiryNotifySettingsSnapshot, getPharmacyId, isArabic]);

  const handleOpenExpiryEmailDigest = useCallback(() => {
    const notifySettings = getExpiryNotifySettingsSnapshot();
    if (!notifySettings) return;

    const email = resolveExpiryNotifyEmail(notifySettings);
    if (!email) {
      alert(isArabic ? "أدخل بريد التنبيهات أولاً" : "Enter an alert email first");
      return;
    }

    const summary = buildCurrentExpirySummary();
    const url = getExpiryMailtoUrl(summary, {
      pharmacyName: notifySettings.name || getPharmacyId(),
      expiringSoonDays: getExpiringSoonDays(notifySettings),
      email,
      isArabic,
    });
    if (url) window.location.href = url;
  }, [buildCurrentExpirySummary, getExpiryNotifySettingsSnapshot, getPharmacyId, isArabic]);

  return {
    settingsForm,
    setSettingsForm,
    handleLogoUpload,
    savePharmacySettings,
    handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest,
  };
}
