export interface PaymentIntentResult {
  paymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentGateway {
  createPaymentIntent(
    orderId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentIntentResult>;

  verifyPayment(paymentId: string, payload: unknown): Promise<PaymentVerificationResult>;
}
