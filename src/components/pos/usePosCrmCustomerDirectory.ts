import { useEffect, useState } from "react";
import type { CrmCustomer } from "../../types";
import * as pharmacyService from "../../services/pharmacyService";

function activeOnly(rows: CrmCustomer[]) {
  return rows.filter((row) => row.isActive !== false);
}

export function usePosCrmCustomerDirectory() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .getCrmCustomers()
      .then((rows) => {
        if (!cancelled) setCustomers(activeOnly(rows));
      })
      .catch((error) => {
        console.warn("POS customer suggestions load skipped:", error);
      });
    const unsubscribe = pharmacyService.subscribeCrmCustomers((rows) => {
      setCustomers(activeOnly(rows));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return customers;
}
