import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSubscriptionTier,
  type SubscriptionTier,
  type SubscriptionTierConfig,
  type TierFeatureKey,
} from "../config/subscriptionTiers";
import { getTierPageLabel } from "../config/subscriptionTierPages";
import { getTierFeatureLabel } from "../config/subscriptionTierFeatures";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, Page } from "../types";
import { getAllowedPages, isSuperAdmin } from "../utils/roles";
import {
  filterPagesBySubscriptionTier,
  getNextSubscriptionTier,
  getTierFeatures,
} from "../utils/subscriptionFeatures";

export type UpgradeTarget =
  | { type: "page"; key: Page }
  | { type: "feature"; key: TierFeatureKey }
  | { type: "branch_limit" };

type SubscriptionContextValue = {
  tier: SubscriptionTier;
  tierConfig: SubscriptionTierConfig;
  rolePages: Page[];
  allowedRoutes: Page[];
  navPages: Page[];
  tierFeatures: ReturnType<typeof getTierFeatures>;
  isRouteAllowed: (page: Page) => boolean;
  isFeatureAllowed: (feature: TierFeatureKey) => boolean;
  isRouteLocked: (page: Page) => boolean;
  openUpgradeModal: (target: UpgradeTarget) => void;
  closeUpgradeModal: () => void;
  upgradeModalOpen: boolean;
  upgradeTarget: UpgradeTarget | null;
  onNavigateToSubscription?: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

type SubscriptionProviderProps = {
  appUser: AppUser;
  tier: SubscriptionTier;
  isArabic: boolean;
  onNavigateToSubscription?: () => void;
  children: ReactNode;
};

export function SubscriptionProvider({
  appUser,
  tier,
  isArabic,
  onNavigateToSubscription,
  children,
}: SubscriptionProviderProps) {
  const [configsVersion, setConfigsVersion] = useState(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradeTarget | null>(null);

  useEffect(() => {
    void pharmacyService.loadSubscriptionTierConfigs().catch((error) => {
      console.error("[SubscriptionTiers] load failed", error);
    });
    return pharmacyService.subscribeSubscriptionTierConfigs(() => {
      setConfigsVersion((value) => value + 1);
    });
  }, [appUser.uid]);

  const tierConfig = useMemo(() => getSubscriptionTier(tier), [tier, configsVersion]);
  const tierFeatures = useMemo(() => getTierFeatures(tier), [tier, configsVersion]);

  const rolePages = useMemo(() => getAllowedPages(appUser), [appUser]);
  const allowedRoutes = useMemo(
    () => filterPagesBySubscriptionTier(rolePages, appUser, tier),
    [rolePages, appUser, tier],
  );

  const navPages = useMemo(() => {
    if (isSuperAdmin(appUser)) return rolePages;
    return rolePages;
  }, [appUser, rolePages]);

  const isRouteAllowed = useCallback(
    (page: Page) => {
      if (isSuperAdmin(appUser)) return true;
      return allowedRoutes.includes(page);
    },
    [appUser, allowedRoutes],
  );

  const isFeatureAllowed = useCallback(
    (feature: TierFeatureKey) => {
      if (isSuperAdmin(appUser)) return true;
      return tierFeatures[feature];
    },
    [appUser, tierFeatures],
  );

  const isRouteLocked = useCallback(
    (page: Page) => {
      if (isSuperAdmin(appUser)) return false;
      return navPages.includes(page) && !allowedRoutes.includes(page);
    },
    [appUser, navPages, allowedRoutes],
  );

  const openUpgradeModal = useCallback((target: UpgradeTarget) => {
    setUpgradeTarget(target);
    setUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
    setUpgradeTarget(null);
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      tierConfig,
      rolePages,
      allowedRoutes,
      navPages,
      tierFeatures,
      isRouteAllowed,
      isFeatureAllowed,
      isRouteLocked,
      openUpgradeModal,
      closeUpgradeModal,
      upgradeModalOpen,
      upgradeTarget,
      onNavigateToSubscription,
    }),
    [
      tier,
      tierConfig,
      rolePages,
      allowedRoutes,
      navPages,
      tierFeatures,
      isRouteAllowed,
      isFeatureAllowed,
      isRouteLocked,
      openUpgradeModal,
      closeUpgradeModal,
      upgradeModalOpen,
      upgradeTarget,
      onNavigateToSubscription,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}

export function useSubscriptionOptional() {
  return useContext(SubscriptionContext);
}

export function getUpgradeTargetLabel(target: UpgradeTarget, isArabic: boolean): string {
  if (target.type === "branch_limit") {
    return isArabic ? "مخزن إضافي" : "Additional warehouse";
  }
  if (target.type === "page") {
    return getTierPageLabel(target.key, isArabic);
  }
  return getTierFeatureLabel(target.key, isArabic);
}

export function getUpgradeModalCopy(
  tier: SubscriptionTier,
  target: UpgradeTarget | null,
  isArabic: boolean,
) {
  const current = getSubscriptionTier(tier);
  const nextTier = getNextSubscriptionTier(tier);
  const targetLabel = target ? getUpgradeTargetLabel(target, isArabic) : "";

  const title = isArabic ? "ميزة غير متاحة في باقتك" : "Feature not in your plan";

  const message =
    target?.type === "branch_limit"
      ? isArabic
        ? `وصلت للحد الأقصى للمخازن المسموح بها في باقتك الحالية (${current.labelAr}). أنت بحاجة لترقية الباقة لإضافة مخزن جديد والاستفادة من الفروع المتعددة.`
        : `You reached the warehouse limit on your current plan (${current.labelEn}). Upgrade your package to add another warehouse and use multi-branch features.`
      : isArabic
        ? `عذراً، «${targetLabel || "هذه الميزة"}» غير متاحة في باقتك الحالية (${current.labelAr}). أنت بحاجة لترقية الباقة للاستخدام والاستفادة من هذه الميزة.`
        : `Sorry, "${targetLabel || "this feature"}" is not available on your current plan (${current.labelEn}). Upgrade your package to unlock and use it.`;

  const ctaLabel = isArabic ? "عرض الاشتراك والترقية" : "View subscription & upgrade";
  const dismissLabel = isArabic ? "ليس الآن" : "Not now";
  const nextHint =
    nextTier && isArabic
      ? `الباقة التالية: ${getSubscriptionTier(nextTier).labelAr}`
      : nextTier
        ? `Next plan: ${getSubscriptionTier(nextTier).labelEn}`
        : isArabic
          ? "أنت على أعلى باقة متاحة"
          : "You are on the highest available plan";

  return { title, message, ctaLabel, dismissLabel, nextHint, nextTier };
}
