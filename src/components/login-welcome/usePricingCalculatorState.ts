import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  computePricingQuote,
  savePricingQuote,
  type PricingBillingCycle,
  type PricingCalculatorConfig,
  type PricingCalculatorQuote,
} from "../../config/pricingCalculator";
import * as pharmacyService from "../../services/pharmacyService";

export function usePricingCalculatorState() {
  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CALCULATOR_CONFIG);
  const [branches, setBranches] = useState(1);
  const [users, setUsers] = useState(3);
  const [staffAddon, setStaffAddon] = useState(false);
  const [customersAddon, setCustomersAddon] = useState(false);
  const [investmentAddon, setInvestmentAddon] = useState(false);
  const [billingCycle, setBillingCycle] = useState<PricingBillingCycle>("monthly");

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

  const quote = useMemo(
    () =>
      computePricingQuote(config, {
        branches,
        users,
        staffAddon,
        customersAddon,
        investmentAddon,
        billingCycle,
      }),
    [config, branches, users, staffAddon, customersAddon, investmentAddon, billingCycle],
  );

  useEffect(() => {
    savePricingQuote(quote);
  }, [quote]);

  function persistQuote(nextQuote?: PricingCalculatorQuote) {
    savePricingQuote(nextQuote || quote);
  }

  return {
    config,
    branches,
    setBranches,
    users,
    setUsers,
    staffAddon,
    setStaffAddon,
    customersAddon,
    setCustomersAddon,
    investmentAddon,
    setInvestmentAddon,
    billingCycle,
    setBillingCycle,
    quote,
    persistQuote,
  };
}
