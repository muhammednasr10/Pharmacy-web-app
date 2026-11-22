import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  computePricingQuote,
  savePricingQuote,
  type PricingCalculatorConfig,
  type PricingCalculatorQuote,
} from "../../config/pricingCalculator";
import * as pharmacyService from "../../services/pharmacyService";

export function usePricingCalculatorState() {
  const [config, setConfig] = useState<PricingCalculatorConfig>(DEFAULT_PRICING_CALCULATOR_CONFIG);
  const [branches, setBranches] = useState(1);
  const [users, setUsers] = useState(3);
  const [staffAddon, setStaffAddon] = useState(false);

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
    () => computePricingQuote(config, { branches, users, staffAddon }),
    [config, branches, users, staffAddon],
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
    quote,
    persistQuote,
  };
}
