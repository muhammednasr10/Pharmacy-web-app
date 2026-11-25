import { useEffect, useState } from "react";
import type { PaymentMethod } from "../../types";
import * as pharmacyService from "../../services/pharmacyService";
import { filterDeliveryEmployees } from "../../utils/deliveryEmployees";
import { isPosDeliverySale } from "../../utils/posDeliverySale";

type Params = {
  staffPageEnabled: boolean;
  paymentMethod: PaymentMethod;
  paymentOptionValue?: string;
  deliveryEmployeeId?: string;
  deliveryEmployeeName?: string;
  onDeliveryAssignmentAvailableChange?: (available: boolean) => void;
  onDeliveryEmployeeChange?: (employee: { id: string; name: string } | null) => void;
};

export function usePosDeliveryAssignment({
  staffPageEnabled,
  paymentMethod,
  paymentOptionValue,
  deliveryEmployeeId = "",
  deliveryEmployeeName = "",
  onDeliveryAssignmentAvailableChange,
  onDeliveryEmployeeChange,
}: Params) {
  const [deliveryPickerOpen, setDeliveryPickerOpen] = useState(false);
  const [hasDeliveryStaff, setHasDeliveryStaff] = useState(false);
  const isDeliverySale = isPosDeliverySale(paymentMethod, paymentOptionValue);
  const canAssignDeliveryEmployee = staffPageEnabled && hasDeliveryStaff && isDeliverySale;
  const hasDeliveryEmployee = Boolean(deliveryEmployeeId || deliveryEmployeeName);

  useEffect(() => {
    if (!staffPageEnabled) {
      setHasDeliveryStaff(false);
      return;
    }
    let cancelled = false;
    void pharmacyService
      .getEmployees()
      .then((rows) => {
        if (cancelled) return;
        setHasDeliveryStaff(filterDeliveryEmployees(rows).length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasDeliveryStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [staffPageEnabled]);

  useEffect(() => {
    onDeliveryAssignmentAvailableChange?.(staffPageEnabled && hasDeliveryStaff);
  }, [staffPageEnabled, hasDeliveryStaff, onDeliveryAssignmentAvailableChange]);

  useEffect(() => {
    if (canAssignDeliveryEmployee) return;
    if (!deliveryEmployeeId && !deliveryEmployeeName) return;
    onDeliveryEmployeeChange?.(null);
  }, [
    canAssignDeliveryEmployee,
    deliveryEmployeeId,
    deliveryEmployeeName,
    onDeliveryEmployeeChange,
  ]);

  return {
    deliveryPickerOpen,
    setDeliveryPickerOpen,
    canAssignDeliveryEmployee,
    hasDeliveryEmployee,
    hasDeliveryStaff,
  };
}
