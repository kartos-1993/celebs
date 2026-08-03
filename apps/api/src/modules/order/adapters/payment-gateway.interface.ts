export interface PaymentIntentResult {
  paymentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  rawResponse?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  rawResponse?: any;
}

export interface IPaymentGateway {
  createPaymentIntent(
    orderId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntentResult>;

  verifyPayment(
    paymentId: string,
    payload: any
  ): Promise<PaymentVerificationResult>;
}
