import { apiClient } from '@/api/client';

export const CHECKOUT_QUERY_KEYS = {
  all: ['checkout'] as const,
  summary: () => [...CHECKOUT_QUERY_KEYS.all, 'summary'] as const,
};

export interface CheckoutRequest {
  addressId: string;
  paymentMethod: 'COD' | 'STRIPE';
  idempotencyKey: string;
}

export interface CheckoutResponse {
  success?: boolean;
  message?: string;
  data?: {
    order?: {
      id?: string;
      orderNumber?: string;
    };
  };
}

export async function placeOrder(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const response = await apiClient.post<CheckoutResponse>('/orders/checkout', payload);
  return response.data;
}

export const placeOrderApi = placeOrder;
