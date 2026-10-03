import { useMutation, useQueryClient } from '@tanstack/react-query';

import { FINANCE_QUERY_KEYS, FinanceApi, type SettlementUpdate } from '../api';

/**
 * The only writes onto a settlement.
 *
 * A statement and a transition go over the same request because that is how the
 * work is done: the courier's figures are read in and the batch moves forward in
 * one sitting. What a caller cannot do is reach PAID in a single call - the server
 * checks the requested transition against the status the batch arrived with, so
 * reconciliation is a step rather than something to be talked past.
 */

export function useUpdateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SettlementUpdate }) =>
      FinanceApi.updateBatch(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.lists() }),
  });
}

export function useOpenSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { courier: string; periodStart: string; periodEnd: string }) =>
      FinanceApi.openBatch(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.lists() }),
  });
}
