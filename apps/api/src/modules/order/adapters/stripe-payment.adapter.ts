import {
  IPaymentGateway,
  PaymentIntentResult,
  PaymentVerificationResult,
} from './payment-gateway.interface';

export class StripePaymentAdapter implements IPaymentGateway {
  private secretKey: string;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY || '') {
    this.secretKey = secretKey;
  }

  async createPaymentIntent(
    orderId: string,
    amount: number,
    currency = 'usd',
    metadata: Record<string, unknown> = {},
  ): Promise<PaymentIntentResult> {
    if (!this.secretKey) {
      // Fallback to simulation if Stripe key is not configured in env
      const mockId = `stripe_sim_${Date.now()}`;
      return {
        paymentId: mockId,
        clientSecret: `pi_${mockId}_secret`,
        rawResponse: { status: 'simulated_no_key' },
      };
    }

    try {
      // Dynamic import of Stripe or REST API call to avoid dependency issues if Stripe SDK not preinstalled
      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: Math.round(amount * 100).toString(), // convert to cents
          currency: currency.toLowerCase(),
          'metadata[orderId]': orderId,
          ...Object.entries(metadata).reduce(
            (acc, [k, v]) => {
              acc[`metadata[${k}]`] = String(v);
              return acc;
            },
            {} as Record<string, string>,
          ),
        }).toString(),
      });

      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error((data.error as { message?: string })?.message || 'Stripe API error');
      }

      return {
        paymentId: data.id as string,
        clientSecret: data.client_secret as string,
        rawResponse: data,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Stripe Payment Intent failed: ${errMsg}`);
    }
  }

  async verifyPayment(
    paymentId: string,
    _payload: unknown = {},
  ): Promise<PaymentVerificationResult> {
    if (!this.secretKey) {
      return {
        success: true,
        transactionId: `txn_${paymentId}`,
        status: 'COMPLETED',
      };
    }

    try {
      const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = (await response.json()) as Record<string, unknown>;
      const isSucceeded = data.status === 'succeeded';
      return {
        success: isSucceeded,
        transactionId: data.id as string,
        status: isSucceeded
          ? 'COMPLETED'
          : data.status === 'requires_payment_method'
            ? 'FAILED'
            : 'PENDING',
        rawResponse: data,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        status: 'FAILED',
        rawResponse: { error: errMsg },
      };
    }
  }
}
