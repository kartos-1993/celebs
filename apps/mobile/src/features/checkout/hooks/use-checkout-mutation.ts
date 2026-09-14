import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { CHECKOUT_QUERY_KEYS, type CheckoutRequest, placeOrder as placeOrderRequest } from '../api';
import type { CheckoutPaymentMethod } from '../components/payment-method-selector';

import { getApiBaseUrl } from '@/api/client';
import { showToast } from '@/components/toast/toast';
import { useAuth } from '@/features/auth/context/auth-context';
import { CART_QUERY_KEYS } from '@/features/cart/api';
import { useCart } from '@/features/cart/context/cart-context';
import { ORDER_QUERY_KEYS } from '@/features/orders/api';
import { PRODUCT_QUERY_KEYS } from '@/features/products/api';

export { CHECKOUT_QUERY_KEYS } from '../api';

export interface ActiveInAppPayment {
  paymentUrl: string;
  orderId: string;
  orderNumber?: string;
  title: string;
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { clearCart } = useCart();
  const { isLoggedIn } = useAuth();
  const [activePayment, setActivePayment] = useState<ActiveInAppPayment | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CheckoutRequest) => {
      if (!isLoggedIn) {
        throw new Error('Please sign in to place your order.');
      }
      return placeOrderRequest(payload);
    },
    onSuccess: async (data, variables) => {
      const placedOrderNumber = data.order?.orderNumber;
      const orderId = data.order?.id;
      await clearCart();
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CHECKOUT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });

      const paymentUrl = data.payment?.redirectUrl;
      if (paymentUrl && orderId) {
        const startUrl =
          variables.paymentMethod === 'ESEWA' && !paymentUrl.includes('bookingId=')
            ? `${getApiBaseUrl()}/orders/payments/esewa/form/${orderId}`
            : paymentUrl;

        const title = variables.paymentMethod === 'ESEWA' ? 'eSewa Mobile Wallet' : 'Khalti by IME';

        setActivePayment({
          paymentUrl: startUrl,
          orderId,
          orderNumber: placedOrderNumber,
          title,
        });
        return;
      }

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

  const handlePaymentResult = (status?: string) => {
    const orderNumber = activePayment?.orderNumber;
    setActivePayment(null);
    queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
    if (status === 'COMPLETED') {
      showToast(orderNumber ? `Order #${orderNumber} paid successfully!` : 'Payment successful!', {
        type: 'success',
      });
    } else if (status === 'FAILED') {
      showToast('Payment did not complete. Your order is saved — retry from Orders.');
    } else {
      showToast('Payment pending. Pull to refresh your order for updates.');
    }
    router.replace('/orders');
  };

  const placeOrder = (addressId: string, paymentMethod: CheckoutPaymentMethod) => {
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
      callbackBase: getApiBaseUrl().replace('/api/v1', ''),
    });
  };

  return {
    placeOrder,
    isPlacingOrder: mutation.isPending,
    activePayment,
    handlePaymentResult,
  };
}
