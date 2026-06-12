import { useEffect, useRef } from "react";
import type { AppUser, Medicine, PharmacySettings } from "../types";
import { isOrgPharmacyAdmin, isPharmacyManager } from "../utils/roles";
import { notifyExpiryAlerts } from "../utils/expiryNotify";

type UseExpiryNotifyParams = {
  userLoading: boolean;
  appUser: AppUser | null;
  pharmacySettings: PharmacySettings | null;
  medicines: Medicine[];
  branches: PharmacySettings[];
  isArabic: boolean;
  isSubscriptionExpired: boolean;
  getPharmacyId: () => string;
  onOpenInventoryExpiryView: () => void;
};

export function useExpiryNotify({
  userLoading,
  appUser,
  pharmacySettings,
  medicines,
  branches,
  isArabic,
  isSubscriptionExpired,
  getPharmacyId,
  onOpenInventoryExpiryView,
}: UseExpiryNotifyParams) {
  const expiryNotifyRanRef = useRef(false);

  useEffect(() => {
    expiryNotifyRanRef.current = false;
  }, [pharmacySettings?.id]);

  useEffect(() => {
    if (expiryNotifyRanRef.current || userLoading || !appUser || !pharmacySettings) return;
    if (!isPharmacyManager(appUser) && !isOrgPharmacyAdmin(appUser)) return;
    if (isSubscriptionExpired) return;

    expiryNotifyRanRef.current = true;
    void notifyExpiryAlerts({
      pharmacyId: getPharmacyId(),
      pharmacyName: pharmacySettings.name || getPharmacyId(),
      medicines,
      branches,
      settings: pharmacySettings,
      isArabic,
      onOpenInventory: onOpenInventoryExpiryView,
    });
  }, [
    userLoading,
    appUser,
    pharmacySettings,
    medicines,
    branches,
    isArabic,
    isSubscriptionExpired,
    getPharmacyId,
    onOpenInventoryExpiryView,
  ]);
}
