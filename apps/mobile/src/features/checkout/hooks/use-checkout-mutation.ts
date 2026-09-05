import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { CHECKOUT_QUERY_KEYS, type CheckoutRequest, placeOrder as placeOrderRequest } from '../api';

import { showToast } from '@/components/toast/toast';
import { useAuth } from '@/features/auth/context/auth-context';
import { useCart } from '@/features/cart/context/cart-context';
import { ORDER_QUERY_KEYS } from '@/features/orders/api';
import { PRODUCT_QUERY_KEYS } from '@/features/products/api';

export { CHECKOUT_QUERY_KEYS } from '../api';

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { clearCart } = useCart();
  const { isLoggedIn } = useAuth();

  const mutation = useMutation({
    mutationFn: (payload: CheckoutRequest) => {
      if (!isLoggedIn) {
        throw new Error('Please sign in to place your order.');
      }
      return placeOrderRequest(payload);
    },
    onSuccess: async (data) => {
      const placedOrderNumber = data?.data?.order?.orderNumber;
      await clearCart();
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CHECKOUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });

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
    if (!isLoggedIn) {
      showToast('Please sign in to place your order', { type: 'error' });
      router.push('/(tabs)/me');
      return;
    }

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
