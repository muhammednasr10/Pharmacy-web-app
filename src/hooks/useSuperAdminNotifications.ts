import { useEffect, useRef } from "react";
import type { AppUser, SubscriptionRequest } from "../types";
import { isSuperAdmin } from "../utils/roles";
import {
  playAdminAlertSound,
  requestSuperAdminNotificationPermission,
  showSuperAdminBrowserNotification,
} from "../utils/superAdminNotify";

type UseSuperAdminNotificationsParams = {
  appUser: AppUser | null;
  subscriptionRequests: SubscriptionRequest[];
  isArabic: boolean;
  onOpenTenants: () => void;
};

export function useSuperAdminNotifications({
  appUser,
  subscriptionRequests,
  isArabic,
  onOpenTenants,
}: UseSuperAdminNotificationsParams) {
  const knownPendingSubscriptionIdsRef = useRef<Set<number>>(new Set());
  const superAdminNotifyReadyRef = useRef(false);

  useEffect(() => {
    superAdminNotifyReadyRef.current = false;
    knownPendingSubscriptionIdsRef.current = new Set();
  }, [appUser?.uid]);

  useEffect(() => {
    if (!isSuperAdmin(appUser)) return;

    const pending = subscriptionRequests.filter((request) => request.status === "pending");
    const currentIds = new Set(pending.map((request) => request.id));

    if (!superAdminNotifyReadyRef.current) {
      knownPendingSubscriptionIdsRef.current = currentIds;
      superAdminNotifyReadyRef.current = true;
      void requestSuperAdminNotificationPermission();
      return;
    }

    const newRequests = pending.filter(
      (request) => !knownPendingSubscriptionIdsRef.current.has(request.id),
    );
    knownPendingSubscriptionIdsRef.current = currentIds;

    newRequests.forEach((request) => {
      playAdminAlertSound();
      showSuperAdminBrowserNotification(request, isArabic, onOpenTenants);
    });
  }, [subscriptionRequests, appUser, isArabic, onOpenTenants]);

  useEffect(() => {
    if (!isSuperAdmin(appUser)) return;
    const onFocusAdminRequests = () => onOpenTenants();
    window.addEventListener("focus-admin-requests", onFocusAdminRequests);
    return () => window.removeEventListener("focus-admin-requests", onFocusAdminRequests);
  }, [appUser, onOpenTenants]);
}
