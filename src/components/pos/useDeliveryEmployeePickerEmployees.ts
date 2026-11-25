import { useEffect, useMemo, useState } from "react";
import type { Employee } from "../../types";
import * as pharmacyService from "../../services/pharmacyService";
import {
  filterDeliveryEmployees,
  filterDeliveryEmployeesBySearch,
} from "../../utils/deliveryEmployees";

export function useDeliveryEmployeePickerEmployees(open: boolean, isArabic: boolean) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void pharmacyService
      .getEmployees()
      .then((rows) => {
        if (cancelled) return;
        setEmployees(filterDeliveryEmployees(rows));
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error(loadError);
        setError(isArabic ? "تعذر تحميل الموظفين" : "Could not load employees");
        setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isArabic]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = useMemo(
    () => filterDeliveryEmployeesBySearch(employees, search),
    [employees, search],
  );

  return { employees, filtered, loading, search, setSearch, error };
}
