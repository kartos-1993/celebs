import { useQuery } from '@tanstack/react-query';

import {
  FINANCE_QUERY_KEYS,
  FinanceApi,
  type LedgerFilters,
  type ListParams,
  type SettlementFilters,
} from '../api';

/**
 * Reads only.
 *
 * Both lists are paginated and filtered on the server. The ledger is the whole
 * marketplace's book of money, so it is never fetched whole and cut up in the
 * browser.
 */

export function useLedgerEntries(filters: LedgerFilters & ListParams) {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.ledger(filters),
    queryFn: () => FinanceApi.getLedgerEntries(filters),
  });
}

export function useSettlementBatches(filters: SettlementFilters & ListParams) {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.settlements(filters),
    queryFn: () => FinanceApi.getSettlementBatches(filters),
  });
}

export function usePlatformOverview(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.platformOverview(filters),
    queryFn: () => FinanceApi.getPlatformOverview(filters),
  });
}

export function usePlatformSellers(params?: ListParams & { search?: string }) {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.platformSellers(params),
    queryFn: () => FinanceApi.listPlatformSellers(params),
  });
}
