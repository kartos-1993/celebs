import { logger } from '@celebs/shared-utils';

import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentVerificationResult,
  RefundRequest,
  RefundResult,
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

function extractKhaltiErrorDetail(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = (payload as Record<string, unknown>).detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }
  return fallback;
}

/**
 * Khalti ePayment v2 adapter (redirect flow).
 * paymentId is the Khalti pidx, saved to Payment.transactionId at initiate time
 * so the return_url callback and later reconciliation resolve to the order.
 * The redirect query params are never trusted — lookup is authoritative.
 */
export class KhaltiAdapter implements IPaymentGateway {
  readonly method = 'KHALTI';
  private readonly config: KhaltiConfig;

  constructor(config?: Partial<KhaltiConfig>) {
    this.config = { ...resolveKhaltiConfig(), ...config };
  }

  private get headers(): Record<string, string> {
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
    if (!this.config.secretKey) {
      throw new Error('KHALTI_SECRET_KEY is required');
    }

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
        throw new Error(extractKhaltiErrorDetail(data, 'Khalti initiate failed'));
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
        throw new Error(extractKhaltiErrorDetail(data, 'Khalti lookup failed'));
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

  /**
   * Returns money to a customer through Khalti's refund API.
   *
   * Two details drive the shape of this. The refund endpoint lives on a different
   * tree from initiate and lookup (`/api/merchant-transaction/...`, no `/api/v2`),
   * and it is addressed by Khalti's `transaction_id` rather than the pidx we
   * stored, so the payment is looked up first to obtain it.
   *
   * Khalti also states the refund API is not guaranteed idempotent, so an already
   * refunded payment is reported as refunded without sending a second request.
   * A blind retry is how a customer gets paid back twice.
   */
  async refund(request: RefundRequest): Promise<RefundResult> {
    if (!this.config.secretKey) {
      return { status: 'FAILED', message: 'KHALTI_SECRET_KEY is required to issue a refund' };
    }

    const lookupResponse = await this.fetchJson(`${this.config.baseUrl}/api/v2/epayment/lookup/`, {
      pidx: request.paymentId,
    });

    if (!lookupResponse.ok) {
      return {
        status: 'FAILED',
        message: extractKhaltiErrorDetail(
          lookupResponse.body,
          'Khalti lookup failed before refund',
        ),
      };
    }

    const lookup = lookupResponse.body as KhaltiLookupResponse;

    // Already returned: reporting success without re-sending is the only way to
    // keep a retry from paying the customer twice.
    if (lookup.status === 'Refunded' || lookup.refunded === true) {
      return {
        status: 'SUCCEEDED',
        providerRefundId: lookup.transaction_id ?? undefined,
        message: 'Khalti already reports this payment as refunded',
      };
    }

    const transactionId = lookup.transaction_id;
    if (!transactionId) {
      return {
        status: 'FAILED',
        message: `Khalti payment ${request.paymentId} has no transaction to refund (status ${String(lookup.status)})`,
      };
    }

    // No amount means a full refund, which the endpoint expresses as an empty body.
    const body = request.amount === undefined ? {} : { amount: toPaisa(request.amount) };

    const refundResponse = await this.fetchJson(
      `${this.config.baseUrl}/api/merchant-transaction/${transactionId}/refund/`,
      body,
    );

    if (!refundResponse.ok) {
      return {
        status: 'FAILED',
        message: extractKhaltiErrorDetail(refundResponse.body, 'Khalti refund failed'),
      };
    }

    const refunded = refundResponse.body as { refunded?: boolean; transaction_id?: string };

    return {
      status: refunded.refunded === false ? 'FAILED' : 'SUCCEEDED',
      providerRefundId: refunded.transaction_id ?? transactionId,
      message: refunded.refunded === false ? 'Khalti did not confirm the refund' : undefined,
    };
  }

  private async fetchJson(
    url: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; body: unknown }> {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    return { ok: response.ok, body: parsed };
  }
}
