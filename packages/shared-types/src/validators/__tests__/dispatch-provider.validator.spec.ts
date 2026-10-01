import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

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

  // Pathao is refused until an adapter exists to create a real consignment.
  // Accepting it while dispatch only knows how to build a Nepal Can Move shipment
  // is what let a dispatch succeed with an empty tracking number.
  it('refuses Pathao while no adapter implements it', () => {
    const result = dispatchOrderSchema.safeParse({ orderId, provider: 'PATHAO' });

    expect(result.success).toBe(false);
    expect(() => dispatchOrderSchema.parse({ orderId, provider: 'PATHAO' })).toThrow(ZodError);
  });

  it('refuses an unknown courier rather than defaulting to a manual dispatch', () => {
    expect(dispatchOrderSchema.safeParse({ orderId, provider: 'DHARMAPATH_CARGO' }).success).toBe(
      false,
    );
  });
});
