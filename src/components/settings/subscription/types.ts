import type { ActivityLog, SubscriptionRequest } from "../../../types";
import type { SubscriptionTier } from "../../../config/subscriptionTiers";
import type { SettingsForm } from "../../../pages/SettingsPage";

export type SubscriptionSettingsPanelProps = {
  isArabic: boolean;
  isOrgAdmin: boolean;
  t: Record<string, string>;
  settingsForm: Pick<SettingsForm, "subscriptionPlan" | "subscriptionEndDate">;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription?: boolean;
  getSubscriptionPlanLabel: (plan: string) => string;
  /** @deprecated Packages removed — limits summary used instead */
  subscriptionTierLabel?: string;
  subscriptionTier?: SubscriptionTier;
  maxBranches?: number;
  maxUsers?: number;
  staffAddonEnabled?: boolean;
  customersAddonEnabled?: boolean;
  investmentAddonEnabled?: boolean;
  submitSubscriptionRequest: (input: {
    plan: string;
    days: number;
    amount: number;
  }) => Promise<SubscriptionRequest | null>;
  submitTierUpgradeRequest?: (targetTier: SubscriptionTier) => Promise<SubscriptionRequest | null>;
  pharmacySubscriptionRequests: SubscriptionRequest[];
  subscriptionRenewLogs: ActivityLog[];
  subscriptionDaysLeft: number | string | null;
};

export type RequestPlan = "monthly" | "quarterly" | "yearly" | "custom";

export type BillingView = "monthly" | "yearly";

export type SubscriptionTone = "expired" | "warning" | "trial" | "active";
