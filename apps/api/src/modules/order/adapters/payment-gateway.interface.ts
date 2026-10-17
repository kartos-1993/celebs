import { Prisma } from '@/config/db.prisma';

/**
 * Amounts are Prisma.Decimal, never number.
 *
 * This is the boundary where a customer is charged. The gateways want an integer
 * count of paisa or a two-decimal string, and both are derived from the Decimal
 * here rather than from a JS number - a double cannot represent 0.1 + 0.2, and a
 * payment signature computed from a drifted amount is one the gateway rejects.
 */
export interface PaymentIntentResult {
  paymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'REFUNDED';
  rawResponse?: Record<string, unknown>;
}

/**
 * The outcome of asking a gateway to return money to a customer.
 *
 * Three states, because the two wallets genuinely differ. Khalti exposes a refund
 * API. eSewa does not - it can only start a payment and read a status - so an
 * eSewa refund is work a person does in the merchant dashboard. Collapsing that
 * into SUCCEEDED would put "refunded" in front of a customer whose money has not
 * moved, and collapse it into FAILED would hide a refund that only needs a person
 * to finish it.
 */
export interface RefundResult {
  status: 'SUCCEEDED' | 'REQUIRES_MANUAL_ACTION' | 'FAILED';
  providerRefundId?: string;
  message?: string;
}

export interface RefundRequest {
  /** The payment id we stored at initiate time. For Khalti this is the pidx. */
  paymentId: string;
  /** Omit for a full refund; a value refunds part of the original charge. */
  amount?: Prisma.Decimal;
  reason?: string;
}

export interface IPaymentGateway {
  createPaymentIntent(
    orderId: string,
    amount: Prisma.Decimal,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentIntentResult>;

  verifyPayment(paymentId: string, payload?: unknown): Promise<PaymentVerificationResult>;

  refund(request: RefundRequest): Promise<RefundResult>;
}
