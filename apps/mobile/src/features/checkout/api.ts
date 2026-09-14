import type { IApiResponse } from '@celebs/shared-types';

import type { CheckoutPaymentMethod } from './components/payment-method-selector';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

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

export interface CheckoutResult {
  order?: {
    id?: string;
    orderNumber?: string;
  };
  payment?: CheckoutPayment | null;
}

export type CheckoutResponse = IApiResponse<CheckoutResult>;

export async function placeOrder(payload: CheckoutRequest): Promise<CheckoutResult> {
  return handleApiResponse(
    apiClient.post<IApiResponse<CheckoutResult>>('/orders/checkout', payload),
  );
}

export const placeOrderApi = placeOrder;
