import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import { medicinesSeed } from "../data/medicinesSeed";
import type { Medicine } from "../types";
import { pharmacyQueryKeys } from "./queryKeys";

export function useMedicinesCatalogQuery(scopeKey: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = pharmacyQueryKeys.medicines(scopeKey);

  const query = useQuery({
    queryKey,
    queryFn: () => pharmacyService.getMedicines(),
    enabled: enabled && Boolean(scopeKey),
    placeholderData: medicinesSeed,
  });

  const setMedicines = useCallback(
    (updater: SetStateAction<Medicine[]>) => {
      queryClient.setQueryData<Medicine[]>(queryKey, (current = medicinesSeed) =>
        typeof updater === "function" ? updater(current) : updater,
      );
    },
    [queryClient, queryKey],
  );

  const refreshMedicinesFromDb = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    medicines: query.data ?? medicinesSeed,
    setMedicines,
    refreshMedicinesFromDb,
    isMedicinesLoading: query.isLoading,
    isMedicinesFetching: query.isFetching,
  };
}

export function syncMedicinesQueryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  scopeKey: string,
  rows: Medicine[],
) {
  queryClient.setQueryData(pharmacyQueryKeys.medicines(scopeKey), rows);
}
