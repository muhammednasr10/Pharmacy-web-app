import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { Invoice } from "../types";
import { pharmacyQueryKeys } from "./queryKeys";

export function useInvoicesCatalogQuery(scopeKey: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = pharmacyQueryKeys.invoices(scopeKey);

  const query = useQuery({
    queryKey,
    queryFn: () => pharmacyService.getInvoices(),
    enabled: enabled && Boolean(scopeKey),
    placeholderData: [] as Invoice[],
  });

  const setInvoices = useCallback(
    (updater: SetStateAction<Invoice[]>) => {
      queryClient.setQueryData<Invoice[]>(queryKey, (current = []) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [queryClient, queryKey],
  );

  const refreshInvoicesFromDb = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    invoices: query.data ?? [],
    setInvoices,
    refreshInvoicesFromDb,
    isInvoicesLoading: query.isLoading,
    isInvoicesFetching: query.isFetching,
  };
}

export function syncInvoicesQueryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  scopeKey: string,
  rows: Invoice[],
) {
  queryClient.setQueryData(pharmacyQueryKeys.invoices(scopeKey), rows);
}
