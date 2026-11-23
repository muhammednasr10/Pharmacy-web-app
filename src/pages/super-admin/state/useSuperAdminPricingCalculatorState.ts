import { useEffect, useState } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  type PricingCalculatorConfig,
} from "../../../config/pricingCalculator";
import type { SaasTab } from "../types";

type Params = {
  isArabic: boolean;
  operatorUid?: string;
  activeTab: SaasTab;
};

export function useSuperAdminPricingCalculatorState({
  isArabic,
  operatorUid,
  activeTab,
}: Params) {
  const [pricingCalculatorForm, setPricingCalculatorForm] = useState<PricingCalculatorConfig>(
    DEFAULT_PRICING_CALCULATOR_CONFIG,
  );
  const [savingPricingCalculator, setSavingPricingCalculator] = useState(false);

  useEffect(() => {
    if (activeTab !== "pricing") return;
    void pharmacyService.loadPricingCalculatorConfig().then((config) => {
      setPricingCalculatorForm(config);
    });
  }, [activeTab]);

  async function savePricingCalculatorConfig() {
    if (savingPricingCalculator) return;
    setSavingPricingCalculator(true);
    try {
      const saved = await pharmacyService.savePricingCalculatorConfig(
        pricingCalculatorForm,
        operatorUid,
      );
      setPricingCalculatorForm(saved);
      alert(isArabic ? "تم حفظ أسعار الحاسبة" : "Calculator prices saved");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setSavingPricingCalculator(false);
    }
  }

  return {
    pricingCalculatorForm,
    setPricingCalculatorForm,
    savingPricingCalculator,
    savePricingCalculatorConfig,
  };
}
