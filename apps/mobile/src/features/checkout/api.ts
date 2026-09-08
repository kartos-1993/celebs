import type { CheckoutPaymentMethod } from './components/payment-method-selector';

import { apiClient } from '@/api/client';

export const CHECKOUT_QUERY_KEYS = {
  all: ['checkout'] as const,
  summary: () => [...CHECKOUT_QUERY_KEYS.all, 'summary'] as const,
};

export interface CheckoutRequest {
  addressId: string;
  paymentMethod: CheckoutPaymentMethod;
  idempotencyKey: string;
  /**
   * API origin the phone's browser can reach (LAN IP / tunnel / staging).
   * The backend builds wallet redirect targets from it after allowlisting.
   */
  callbackBase?: string;
}

export interface CheckoutPayment {
  paymentId?: string;
  redirectUrl?: string;
}

export interface CheckoutResponse {
  success?: boolean;
  message?: string;
  data?: {
    order?: {
      id?: string;
      orderNumber?: string;
    };
    payment?: CheckoutPayment | null;
  };
}

export async function placeOrder(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const response = await apiClient.post<CheckoutResponse>('/orders/checkout', payload);
  return response.data;
}

export const placeOrderApi = placeOrder;
