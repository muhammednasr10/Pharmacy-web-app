import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { CrmCustomer } from "../../types";
import {
  matchesCrmCustomerName,
  matchesCrmCustomerPhone,
} from "../../utils/crmCustomerSuggestMatch";

export type PosCustomerSuggestField = "phone" | "name" | null;

type Params = {
  customers: CrmCustomer[];
  customerName: string;
  customerPhone: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  onCustomerAddressChange?: (value: string) => void;
};

export function usePosCustomerFieldSuggestions({
  customers,
  customerName,
  customerPhone,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
}: Params) {
  const [activeField, setActiveField] = useState<PosCustomerSuggestField>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const blurTimerRef = useRef<number | null>(null);

  const suggestions = useMemo(() => {
    if (activeField === "phone") {
      return customers.filter((customer) => matchesCrmCustomerPhone(customer, customerPhone)).slice(0, 8);
    }
    if (activeField === "name") {
      return customers.filter((customer) => matchesCrmCustomerName(customer, customerName)).slice(0, 8);
    }
    return [];
  }, [activeField, customerName, customerPhone, customers]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions.length, activeField, customerName, customerPhone]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  function clearBlurTimer() {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }

  function scheduleCloseSuggestions() {
    clearBlurTimer();
    blurTimerRef.current = window.setTimeout(() => setActiveField(null), 120);
  }

  function applyCustomer(customer: CrmCustomer) {
    onCustomerNameChange(customer.name || "");
    onCustomerPhoneChange?.(customer.phone || "");
    onCustomerAddressChange?.(customer.address || "");
    setActiveField(null);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    field: Exclude<PosCustomerSuggestField, null>,
  ) {
    if (activeField !== field || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const picked = suggestions[highlightIndex];
      if (picked) applyCustomer(picked);
      return;
    }
    if (event.key === "Escape") {
      setActiveField(null);
    }
  }

  return {
    activeField,
    setActiveField,
    highlightIndex,
    suggestions,
    clearBlurTimer,
    scheduleCloseSuggestions,
    applyCustomer,
    handleKeyDown,
  };
}
