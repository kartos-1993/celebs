import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  dispatch3PLOrder,
  type Dispatch3PLResponse,
  settleCodOrder,
  updateOrderItemStatusApi,
} from '../api';

interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

type FulfillmentVariables = Parameters<typeof updateOrderItemStatusApi>;

/** Item fulfillment-stage update with precise cache invalidation. */
export function useUpdateFulfillmentMutation(
  activeListKey: readonly unknown[],
  callbacks?: MutationCallbacks,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ([itemId, body]: FulfillmentVariables) => updateOrderItemStatusApi(itemId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeListKey });
      callbacks?.onSuccess?.();
    },
    onError: (err: Error) => callbacks?.onError?.(err),
  });
}

/** 3PL dispatch — returns tracking so the dialog can record the handover. */
export function useDispatch3PLMutation(callbacks?: {
  onSuccess?: (res: Dispatch3PLResponse) => void;
  onError?: (err: Error) => void;
}) {
  return useMutation({
    mutationFn: (orderId: string) => dispatch3PLOrder({ orderId }),
    onSuccess: (res) => callbacks?.onSuccess?.(res),
    onError: (err: Error) => callbacks?.onError?.(err),
  });
}

/** COD settlement with precise cache invalidation. */
export function useSettleCodMutation(
  activeListKey: readonly unknown[],
  callbacks?: MutationCallbacks,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      settleCodOrder({ orderId, reference: `VOUCHER-${Date.now()}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activeListKey });
      callbacks?.onSuccess?.();
    },
    onError: (err: Error) => callbacks?.onError?.(err),
  });
}
