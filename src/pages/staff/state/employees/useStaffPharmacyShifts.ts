import { useEffect, useState } from "react";
import * as pharmacyService from "../../../../services/pharmacyService";
import {
  DEFAULT_PHARMACY_SHIFTS,
  clonePharmacyShifts,
  type ShiftId,
} from "../../../../utils/workSchedule";

export function useStaffPharmacyShifts(pharmacyId: string | undefined) {
  const [pharmacyShifts, setPharmacyShifts] = useState(
    clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS),
  );
  const [pharmacyDefaultShiftId, setPharmacyDefaultShiftId] = useState<ShiftId>("A");

  useEffect(() => {
    if (!pharmacyId) return;
    void pharmacyService.loadPayrollSettings(pharmacyId).then((settings) => {
      setPharmacyShifts(clonePharmacyShifts(settings.workShifts));
      setPharmacyDefaultShiftId(settings.defaultShiftId);
    });
  }, [pharmacyId]);

  return { pharmacyShifts, pharmacyDefaultShiftId };
}
