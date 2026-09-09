import { logger } from '@celebs/shared-utils';

import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentVerificationResult,
} from './payment-gateway.interface';

export interface KhaltiConfig {
  secretKey: string;
  /** Sandbox: https://dev.khalti.com · Live: https://khalti.com */
  baseUrl: string;
  returnUrl: string;
  websiteUrl: string;
}

export function resolveKhaltiConfig(): KhaltiConfig {
  return {
    secretKey: process.env.KHALTI_SECRET_KEY || '',
    // Sandbox uses https://dev.khalti.com (test-pay.khalti.com for webview)
    baseUrl: process.env.KHALTI_BASE_URL || 'https://dev.khalti.com',
    returnUrl:
      process.env.KHALTI_RETURN_URL || 'http://localhost:3333/api/v1/orders/payments/khalti/return',
    websiteUrl: process.env.KHALTI_WEBSITE_URL || 'http://localhost:5173',
  };
}

export const toPaisa = (npr: number): number => Math.round(npr * 100);

interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at?: string;
  expires_in?: number;
}

export type KhaltiLookupStatus =
  | 'Completed'
  | 'Pending'
  | 'Refunded'
  | 'Expired'
  | 'User canceled'
  | 'Partially refunded'
  | 'Initiated';

interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: KhaltiLookupStatus | string;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
}

/**
 * Khalti ePayment v2 adapter (redirect flow).
 * paymentId is the Khalti pidx, saved to Payment.transactionId at initiate time
 * so the return_url callback and later reconciliation resolve to the order.
 * The redirect query params are never trusted — lookup is authoritative.
 */
export class KhaltiAdapter implements IPaymentGateway {
  private config: KhaltiConfig;

  constructor(config: Partial<KhaltiConfig> = {}) {
    this.config = { ...resolveKhaltiConfig(), ...config };
  }

  private get headers(): Record<string, string> {
    if (!this.config.secretKey) {
      throw new Error('KHALTI_SECRET_KEY is required');
    }
    return {
      Authorization: `Key ${this.config.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createPaymentIntent(
    orderId: string,
    amount: number,
    _currency = 'NPR',
    metadata: Record<string, unknown> = {},
  ): Promise<PaymentIntentResult> {
    const returnUrl =
      typeof metadata.returnUrl === 'string' && metadata.returnUrl.length > 0
        ? metadata.returnUrl
        : this.config.returnUrl;
    const body = {
      return_url: returnUrl,
      website_url: this.config.websiteUrl,
      amount: toPaisa(amount),
      purchase_order_id: orderId,
      purchase_order_name: `Celebs order ${String(metadata.orderNumber || orderId)}`,
    };

    let data: KhaltiInitiateResponse;
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/epayment/initiate/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      data = (await response.json()) as KhaltiInitiateResponse;
      if (!response.ok || !data.pidx || !data.payment_url) {
        throw new Error(
          (data as unknown as { detail?: string }).detail || 'Khalti initiate failed',
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ orderId, message }, 'Khalti payment initiation failed');
      throw new Error(`Khalti payment initiation failed: ${message}`);
    }

    return {
      paymentId: data.pidx,
      redirectUrl: data.payment_url,
      rawResponse: { ...data },
    };
  }

  async verifyPayment(
    paymentId: string,
    _payload: unknown = {},
  ): Promise<PaymentVerificationResult> {
    let data: KhaltiLookupResponse;
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/epayment/lookup/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ pidx: paymentId }),
        signal: AbortSignal.timeout(10000),
      });
      data = (await response.json()) as KhaltiLookupResponse;
      if (!response.ok) {
        throw new Error((data as unknown as { detail?: string }).detail || 'Khalti lookup failed');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ paymentId, message }, 'Khalti lookup unreachable — leaving PENDING');
      return { success: false, status: 'PENDING', rawResponse: { error: message } };
    }

    const rawResponse = { ...data };
    switch (data.status) {
      case 'Completed':
        return {
          success: true,
          transactionId: data.transaction_id || paymentId,
          status: 'COMPLETED',
          rawResponse,
        };
      case 'Refunded':
        return {
          success: false,
          transactionId: data.transaction_id || paymentId,
          status: 'REFUNDED',
          rawResponse,
        };
      case 'Expired':
      case 'User canceled':
        return { success: false, status: 'FAILED', rawResponse };
      default:
        return { success: false, status: 'PENDING', rawResponse };
    }
  }
}
