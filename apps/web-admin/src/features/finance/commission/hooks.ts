import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { COMMISSION_QUERY_KEYS, CommissionApi, type SetCommissionRateInput } from './api';

/**
 * Reading the current rate and its history, and publishing a new one.
 *
 * Publishing closes the previous rule rather than editing it, so an order placed
 * last month can still be explained. The screen therefore shows history
 * alongside the live rate - a seller disputing an old charge needs to see what
 * the rate was, and "it has changed since" is not an answer.
 */
export function useCommissionOverview() {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.overview(),
    queryFn: async () => {
      const { data } = await CommissionApi.getOverview();

      return data;
    },
  });
}

export function useSetCommissionRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetCommissionRateInput) => CommissionApi.setRate(payload),
    // The overview carries both the current rate and the history, so it is the
    // only key that needs invalidating.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COMMISSION_QUERY_KEYS.overview() }),
  });
}

/**
 * What list price earns a seller the amount they want to keep.
 *
 * Enabled only once something has been typed, so the panel does not call the API
 * on every render of an empty form.
 */
export function useCommissionQuote(desiredNet: string) {
  return useQuery({
    queryKey: [...COMMISSION_QUERY_KEYS.all, 'quote', desiredNet] as const,
    queryFn: async () => {
      const { data } = await CommissionApi.quote(desiredNet);

      return data;
    },
    enabled: desiredNet.trim().length > 0,
    // A seller's own arithmetic, and the rate changes rarely: a stale answer for a
    // few seconds is better than a request per keystroke.
    staleTime: 60_000,
  });
}

/**
 * The live commission rate, for a seller who only needs to read it.
 *
 * Taken from the quote endpoint rather than the admin overview, which is behind
 * COMMISSION_MANAGE. A seller is entitled to know what they are being charged
 * even though they cannot change it.
 */
export function useCurrentCommissionRate() {
  return useQuery({
    queryKey: COMMISSION_QUERY_KEYS.quoteRate(),
    queryFn: async () => {
      const { data } = await CommissionApi.quote('1.00');

      return data;
    },
    staleTime: 5 * 60_000,
  });
}
