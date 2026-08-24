import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StripePaymentAdapter } from '../adapters/stripe-payment.adapter';

describe('StripePaymentAdapter Security & Configuration Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('unconfigured adapter in non-production returns pending verification and does not falsely confirm payment', async () => {
    const adapter = new StripePaymentAdapter('');
    const verification = await adapter.verifyPayment('pi_test_123');

    expect(verification.success).toBe(false);
    expect(verification.status).toBe('PENDING');
  });

  it('unconfigured adapter in production throws error when creating payment intent', async () => {
    process.env.NODE_ENV = 'production';
    const adapter = new StripePaymentAdapter('');

    await expect(adapter.createPaymentIntent('order_123', 1000)).rejects.toThrow(
      'STRIPE_SECRET_KEY is required in production',
    );
  });

  it('unconfigured adapter in production throws error when verifying payment', async () => {
    process.env.NODE_ENV = 'production';
    const adapter = new StripePaymentAdapter('');

    await expect(adapter.verifyPayment('pi_test_123')).rejects.toThrow(
      'STRIPE_SECRET_KEY is required in production',
    );
  });
});
