import { useQuery } from '@tanstack/react-query';

import { EARNINGS_QUERY_KEYS, EarningsApi } from './api';

/**
 * A seller's own figures.
 *
 * No vendorId is sent. The API decides whose earnings this is from the session's
 * store, so a seller cannot read another's by changing the query.
 */

export function useEarningsSummary() {
  return useQuery<Awaited<ReturnType<typeof EarningsApi.getSummary>>['data']>({
    queryKey: EARNINGS_QUERY_KEYS.summary(),
    queryFn: async () => {
      const { data } = await EarningsApi.getSummary();

      return data;
    },
  });
}

export function useEarningsList(filters: { page: number; limit: number }) {
  return useQuery({
    queryKey: EARNINGS_QUERY_KEYS.list(filters),
    queryFn: async () => {
      const { data } = await EarningsApi.listEntries(filters);

      return data;
    },
  });
}
