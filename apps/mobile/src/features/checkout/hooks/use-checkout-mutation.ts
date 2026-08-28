import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { type CheckoutRequest, placeOrderApi } from '../api';

import { showToast } from '@/components/toast/toast';
import { useCart } from '@/features/cart/context/cart-context';
import { ORDER_QUERY_KEYS } from '@/features/orders/api';

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { clearCart } = useCart();

  const mutation = useMutation({
    mutationFn: (payload: CheckoutRequest) => placeOrderApi(payload),
    onSuccess: async (data) => {
      const placedOrderNumber = data?.data?.order?.orderNumber;
      await clearCart();
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });

      showToast(
        placedOrderNumber
          ? `Order #${placedOrderNumber} placed successfully!`
          : 'Order placed successfully!',
        { type: 'success' },
      );
      router.replace('/orders');
    },
    onError: (err: unknown) => {
      const message =
        (err as { message?: string })?.message ||
        'Something went wrong while placing your order. Please try again.';
      showToast(message, { type: 'error' });
    },
  });

  const placeOrder = (addressId: string, paymentMethod: 'COD' | 'STRIPE') => {
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    mutation.mutate({
      addressId,
      paymentMethod,
      idempotencyKey,
    });
  };

  return {
    placeOrder,
    isPlacingOrder: mutation.isPending,
  };
}
