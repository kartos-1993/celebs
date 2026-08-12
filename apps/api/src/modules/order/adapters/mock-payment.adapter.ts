import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentVerificationResult,
} from './payment-gateway.interface';

export class MockPaymentAdapter implements IPaymentGateway {
  async createPaymentIntent(
    orderId: string,
    amount: number,
    currency = 'NPR',
    metadata: Record<string, unknown> = {},
  ): Promise<PaymentIntentResult> {
    const mockPaymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      paymentId: mockPaymentId,
      clientSecret: `mock_secret_${mockPaymentId}`,
      redirectUrl: `https://staging.celebs.app/payments/mock-checkout?orderId=${orderId}&paymentId=${mockPaymentId}`,
      rawResponse: {
        status: 'mock_created',
        orderId,
        amount,
        currency,
        metadata,
      },
    };
  }

  async verifyPayment(paymentId: string, payload: Record<string, unknown> = {}): Promise<PaymentVerificationResult> {
    const isSuccess = payload?.status !== 'failed';
    return {
      success: isSuccess,
      transactionId: `mock_txn_${paymentId}`,
      status: isSuccess ? 'COMPLETED' : 'FAILED',
      rawResponse: payload,
    };
  }
}
