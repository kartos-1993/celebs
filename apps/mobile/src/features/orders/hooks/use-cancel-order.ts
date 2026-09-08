import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelOrderApi, ORDER_QUERY_KEYS } from '../api';

import { showToast } from '@/components/toast/toast';

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (orderId: string) => cancelOrderApi(orderId),
    onSuccess: () => {
      showToast('Order cancelled successfully', { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
    },
    onError: (err: unknown) => {
      const message =
        (err as { message?: string })?.message || 'Failed to cancel order. Please try again.';
      showToast(message, { type: 'error' });
    },
  });

  return {
    cancelOrder: mutation.mutate,
    isCancelling: mutation.isPending,
  };
}
