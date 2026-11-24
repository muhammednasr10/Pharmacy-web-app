import { useEffect, useMemo, useState } from "react";
import type { SubscriptionTier } from "../../../config/subscriptionTiers";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  computePricingQuote,
  getQuoteBillingAmount,
  getYearlyDiscountPercent,
  type PricingBillingCycle,
  type PricingCalculatorConfig,
} from "../../../config/pricingCalculator";
import { subscriptionPaymentInfo } from "../../../config/subscription";
import * as pharmacyService from "../../../services/pharmacyService";
import { buildSubscriptionPageAccessRows } from "../../../utils/subscriptionLimitChange";

type Input = {
  isArabic: boolean;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
  staffAddon: boolean;
  customersAddon: boolean;
  investmentAddon: boolean;
};

export function useSubscriptionCalculatorState({
  isArabic,
  subscriptionTier,
  maxBranches,
  maxUsers,
  staffAddon,
  customersAddon,
  investmentAddon,
}: Input) {
  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CALCULATOR_CONFIG);
  const [billingCycle, setBillingCycle] = useState<PricingBillingCycle>("monthly");
  const [editingPackage, setEditingPackage] = useState(false);
  const [draftBranches, setDraftBranches] = useState(maxBranches);
  const [draftUsers, setDraftUsers] = useState(maxUsers);
  const [draftStaffAddon, setDraftStaffAddon] = useState(staffAddon);
  const [draftCustomersAddon, setDraftCustomersAddon] = useState(customersAddon);
  const [draftInvestmentAddon, setDraftInvestmentAddon] = useState(investmentAddon);

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .loadPricingCalculatorConfig()
      .then((row) => {
        if (!cancelled) setConfig(row);
      })
      .catch(() => {
        if (!cancelled) setConfig(DEFAULT_PRICING_CALCULATOR_CONFIG);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (editingPackage) return;
    setDraftBranches(maxBranches);
    setDraftUsers(maxUsers);
    setDraftStaffAddon(staffAddon);
    setDraftCustomersAddon(customersAddon);
    setDraftInvestmentAddon(investmentAddon);
  }, [editingPackage, maxBranches, maxUsers, staffAddon, customersAddon, investmentAddon]);

  const activeBranches = editingPackage ? draftBranches : maxBranches;
  const activeUsers = editingPackage ? draftUsers : maxUsers;
  const activeStaffAddon = editingPackage ? draftStaffAddon : staffAddon;
  const activeCustomersAddon = editingPackage ? draftCustomersAddon : customersAddon;
  const activeInvestmentAddon = editingPackage ? draftInvestmentAddon : investmentAddon;

  const quote = useMemo(
    () =>
      computePricingQuote(config, {
        branches: activeBranches,
        users: activeUsers,
        staffAddon: Boolean(config.staffAddonEnabled && activeStaffAddon),
        customersAddon: Boolean(config.customersAddonEnabled && activeCustomersAddon),
        investmentAddon: Boolean(config.investmentAddonEnabled && activeInvestmentAddon),
        billingCycle,
      }),
    [
      config,
      activeBranches,
      activeUsers,
      activeStaffAddon,
      activeCustomersAddon,
      activeInvestmentAddon,
      billingCycle,
    ],
  );

  const billedAmount = getQuoteBillingAmount(quote.monthlyPrice, billingCycle);
  const yearlyDiscountPct = getYearlyDiscountPercent();
  const yearlyMonthlyEquivalent =
    billingCycle === "yearly" ? Math.round(billedAmount / 12) : quote.monthlyPrice;
  const currency = subscriptionPaymentInfo.currency;

  const pageRows = useMemo(
    () =>
      buildSubscriptionPageAccessRows({
        isArabic,
        tier: subscriptionTier,
        staffAddon: activeStaffAddon,
        customersAddon: activeCustomersAddon,
        investmentAddon: activeInvestmentAddon,
      }),
    [isArabic, subscriptionTier, activeStaffAddon, activeCustomersAddon, activeInvestmentAddon],
  );

  const packageChanged =
    draftBranches !== maxBranches ||
    draftUsers !== maxUsers ||
    draftStaffAddon !== staffAddon ||
    draftCustomersAddon !== customersAddon ||
    draftInvestmentAddon !== investmentAddon;

  function startEditingPackage() {
    setDraftBranches(maxBranches);
    setDraftUsers(maxUsers);
    setDraftStaffAddon(staffAddon);
    setDraftCustomersAddon(customersAddon);
    setDraftInvestmentAddon(investmentAddon);
    setEditingPackage(true);
  }

  function cancelEditingPackage() {
    setEditingPackage(false);
    setDraftBranches(maxBranches);
    setDraftUsers(maxUsers);
    setDraftStaffAddon(staffAddon);
    setDraftCustomersAddon(customersAddon);
    setDraftInvestmentAddon(investmentAddon);
  }

  return {
    config,
    billingCycle,
    setBillingCycle,
    editingPackage,
    draftBranches,
    setDraftBranches,
    draftUsers,
    setDraftUsers,
    draftStaffAddon,
    setDraftStaffAddon,
    draftCustomersAddon,
    setDraftCustomersAddon,
    draftInvestmentAddon,
    setDraftInvestmentAddon,
    quote,
    billedAmount,
    yearlyDiscountPct,
    yearlyMonthlyEquivalent,
    currency,
    pageRows,
    packageChanged,
    startEditingPackage,
    cancelEditingPackage,
  };
}
