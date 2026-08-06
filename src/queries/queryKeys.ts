export const pharmacyQueryKeys = {
  all: ["pharmacy"] as const,
  medicines: (scopeKey: string) => [...pharmacyQueryKeys.all, "medicines", scopeKey] as const,
  invoices: (scopeKey: string) => [...pharmacyQueryKeys.all, "invoices", scopeKey] as const,
  attendance: (month: string, scopeKey: string) =>
    [...pharmacyQueryKeys.all, "attendance", month, scopeKey] as const,
  medicinesPage: (filters: Record<string, unknown>) =>
    [...pharmacyQueryKeys.all, "medicines-page", filters] as const,
};

export function invalidateMedicinesQueries(
  queryClient: import("@tanstack/react-query").QueryClient,
  scopeKey?: string,
) {
  if (scopeKey) {
    return queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.medicines(scopeKey) });
  }
  return queryClient.invalidateQueries({ queryKey: [...pharmacyQueryKeys.all, "medicines"] });
}

export function invalidateInvoicesQueries(
  queryClient: import("@tanstack/react-query").QueryClient,
  scopeKey?: string,
) {
  if (scopeKey) {
    return queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.invoices(scopeKey) });
  }
  return queryClient.invalidateQueries({ queryKey: [...pharmacyQueryKeys.all, "invoices"] });
}

export function invalidateAttendanceQueries(
  queryClient: import("@tanstack/react-query").QueryClient,
  month?: string,
  scopeKey?: string,
) {
  if (month && scopeKey) {
    return queryClient.invalidateQueries({ queryKey: pharmacyQueryKeys.attendance(month, scopeKey) });
  }
  return queryClient.invalidateQueries({ queryKey: [...pharmacyQueryKeys.all, "attendance"] });
}
