import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { COMMISSION_QUERY_KEYS, CommissionApi, type SetCommissionRateInput } from './api';

/**
 * Reads the current rate and its history, and publishes a new one.
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
