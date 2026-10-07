import { describe, expect, it } from 'vitest';

import { dispatchOrderSchema } from '../logistics.validator';

describe('dispatchOrderSchema', () => {
  const orderId = '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

  it('accepts a manual dispatch with a courier-supplied tracking number', () => {
    const parsed = dispatchOrderSchema.parse({
      orderId,
      provider: 'MANUAL',
      manualCourierName: 'FastExpress Nepal',
      manualTrackingNumber: 'FE-998877',
    });

    expect(parsed.provider).toBe('MANUAL');
  });

  it('accepts the Nepal Can Move courier', () => {
    expect(dispatchOrderSchema.parse({ orderId, provider: 'NEPAL_CAN_MOVE' }).provider).toBe(
      'NEPAL_CAN_MOVE',
    );
  });

  it('accepts Pathao with synchronous order creation adapter', () => {
    expect(dispatchOrderSchema.parse({ orderId, provider: 'PATHAO' }).provider).toBe('PATHAO');
  });

  it('refuses an unknown courier rather than defaulting to a manual dispatch', () => {
    expect(dispatchOrderSchema.safeParse({ orderId, provider: 'DHARMAPATH_CARGO' }).success).toBe(
      false,
    );
  });
});
