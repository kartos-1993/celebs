import crypto from 'crypto';

import { logger } from '@celebs/shared-utils';

import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentVerificationResult,
  RefundRequest,
  RefundResult,
} from './payment-gateway.interface';

import { Prisma } from '@/config/db.prisma';

export interface EsewaConfig {
  productCode: string;
  secretKey: string;
  /** ePay v2 form host, e.g. https://rc-epay.esewa.com.np (UAT) */
  baseUrl: string;
  successUrl: string;
  failureUrl: string;
}

export function resolveEsewaConfig(): EsewaConfig {
  const productCode = process.env.ESEWA_PRODUCT_CODE || '';
  const secretKey = process.env.ESEWA_SECRET_KEY || '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  if ((nodeEnv === 'staging' || nodeEnv === 'production') && (!productCode || !secretKey)) {
    throw new Error(
      'ESEWA_PRODUCT_CODE and ESEWA_SECRET_KEY must be configured in staging/production — test defaults are not allowed',
    );
  }

  const successUrl =
    process.env.ESEWA_SUCCESS_URL || 'http://localhost:3333/api/v1/orders/payments/esewa/success';
  const failureUrl =
    process.env.ESEWA_FAILURE_URL || 'http://localhost:3333/api/v1/orders/payments/esewa/failure';

  if (nodeEnv === 'staging' || nodeEnv === 'production') {
    for (const [name, url] of [
      ['ESEWA_SUCCESS_URL', successUrl],
      ['ESEWA_FAILURE_URL', failureUrl],
    ] as const) {
      if (!url || /localhost|127\.0\.0\.1/.test(url)) {
        throw new Error(
          `${name} must be a real https URL in staging/production — a localhost callback strands customers after they have paid`,
        );
      }
    }
  }

  return {
    productCode: productCode || 'EPAYTEST',
    secretKey: secretKey || '8gBm/:&EnhH.1/q',
    baseUrl: process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np',
    successUrl,
    failureUrl,
  };
}

/**
 * Exact, not a float round: the value is signed into the request the gateway
 * verifies, so a drifted amount produces a signature the gateway rejects.
 */
const toNpr2 = (amount: Prisma.Decimal): string => amount.toFixed(2);

export function buildEsewaSignature(
  fields: { total_amount: string; transaction_uuid: string; product_code: string },
  secretKey: string,
): string {
  const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${fields.product_code}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

export interface EsewaCallbackPayload {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signature: string;
  signed_field_names: string;
}

/** Decode the base64 `data` query param eSewa appends to success_url. */
export function decodeEsewaCallback(dataBase64: string): EsewaCallbackPayload {
  const json = Buffer.from(decodeURIComponent(dataBase64), 'base64').toString('utf8');
  return JSON.parse(json) as EsewaCallbackPayload;
}

/** Recompute the signature over the signed fields and compare timing-safe. */
export function verifyEsewaCallbackSignature(
  payload: EsewaCallbackPayload,
  secretKey: string,
): boolean {
  const signedNames = payload.signed_field_names.split(',').map((s) => s.trim());
  const record: Record<string, unknown> = { ...payload };
  const message = signedNames.map((name) => `${name}=${String(record[name] ?? '')}`).join(',');
  const expected = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(payload.signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type EsewaStatus =
  | 'COMPLETE'
  | 'PENDING'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'CANCELED';

/**
 * eSewa ePay v2 adapter (redirect flow).
 * transaction_uuid is the Order id so callbacks resolve without extra mapping.
 * Never trust the redirect alone — every confirmation goes through the
 * server-side status-check API before an order is marked paid.
 */
export class EsewaAdapter implements IPaymentGateway {
  private config: EsewaConfig;

  constructor(config: Partial<EsewaConfig> = {}) {
    this.config = { ...resolveEsewaConfig(), ...config };
  }

  async createPaymentIntent(
    orderId: string,
    amount: Prisma.Decimal,
    _currency = 'NPR',
    metadata: Record<string, unknown> = {},
  ): Promise<PaymentIntentResult> {
    const totalAmount = toNpr2(amount);
    // Per-order redirect targets (already allowlisted upstream) win over env.
    const successUrl =
      typeof metadata.successUrl === 'string' && metadata.successUrl.length > 0
        ? metadata.successUrl
        : this.config.successUrl;
    const failureUrl =
      typeof metadata.failureUrl === 'string' && metadata.failureUrl.length > 0
        ? metadata.failureUrl
        : this.config.failureUrl;
    const fields = {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: orderId,
      product_code: this.config.productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    const signature = buildEsewaSignature(fields, this.config.secretKey);
    const formUrl = `${this.config.baseUrl}/api/epay/main/v2/form`;

    // Fetch the 302 booking redirect server-side so clients can open
    // the official eSewa login portal directly via GET without client-side form auto-submit.
    let redirectUrl = formUrl;
    try {
      const formData = new URLSearchParams({
        ...fields,
        signature,
      });
      const response = await fetch(formUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        redirect: 'manual',
        signal: AbortSignal.timeout(6000),
      });
      const location = response.headers.get('location');
      if (location && location.startsWith('http')) {
        redirectUrl = location;
      }
    } catch (err) {
      logger.warn(
        { orderId, err },
        'eSewa direct booking fetch failed; falling back to form actionUrl',
      );
    }

    return {
      paymentId: orderId,
      redirectUrl,
      rawResponse: { actionUrl: redirectUrl, formUrl, ...fields, signature, metadata },
    };
  }

  async verifyPayment(
    paymentId: string,
    payload: unknown = {},
  ): Promise<PaymentVerificationResult> {
    // Arrives from the return URL, so it is really a string and converting it to a
    // Decimal is exact rather than a float rounding.
    const { totalAmount } = (payload as { totalAmount?: string | number }) || {};
    if (totalAmount === undefined) {
      throw new Error('Esewa verifyPayment requires payload.totalAmount (NPR)');
    }

    const params = new URLSearchParams({
      product_code: this.config.productCode,
      total_amount: toNpr2(new Prisma.Decimal(totalAmount)),
      transaction_uuid: paymentId,
    });
    const url = `${this.config.baseUrl}/api/epay/transaction/status/?${params.toString()}`;

    let data: { status?: string; ref_id?: string | null };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`eSewa status check returned HTTP ${response.status}`);
      }
      data = (await response.json()) as { status?: string; ref_id?: string | null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ paymentId, message }, 'eSewa status check unreachable — leaving PENDING');
      return { success: false, status: 'PENDING', rawResponse: { error: message } };
    }

    const status = (data.status || 'PENDING') as EsewaStatus;
    const rawResponse = { ...data };

    switch (status) {
      case 'COMPLETE':
        return {
          success: true,
          transactionId: data.ref_id || paymentId,
          status: 'COMPLETED',
          rawResponse,
        };
      case 'FULL_REFUND':
        return {
          success: false,
          transactionId: data.ref_id || paymentId,
          status: 'REFUNDED',
          rawResponse,
        };
      case 'PARTIAL_REFUND':
        return {
          success: false,
          transactionId: data.ref_id || paymentId,
          status: 'PENDING',
          rawResponse,
        };
      default:
        return { success: false, status: 'PENDING', rawResponse };
    }
  }

  /**
   * eSewa publishes no refund endpoint - its API starts a payment and reads a
   * status, and nothing more. A refund is issued by a person in the merchant
   * dashboard, and the status API only reports FULL_REFUND afterwards.
   *
   * So this does not call eSewa at all and does not pretend to have refunded
   * anything: it reports that the refund needs a person, which is the state the
   * caller has to record and show. Reporting SUCCEEDED here would put "refunded"
   * in front of a customer whose money has not moved.
   */
  async refund(_request: RefundRequest): Promise<RefundResult> {
    logger.warn(
      { gateway: 'ESEWA' },
      'eSewa has no refund API; recorded for manual action in the eSewa merchant portal',
    );

    return {
      status: 'REQUIRES_MANUAL_ACTION',
      message:
        'eSewa provides no refund API. Refund this payment manually in the eSewa merchant portal, then mark it settled.',
    };
  }
}
