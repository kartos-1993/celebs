import { describe, expect, it } from 'vitest';

import { getIdempotencyKeyForIntent, resetIdempotencyKey } from '../../utils/idempotency';

describe('Mobile Checkout Idempotency Key State Binding Contract', () => {
  it('reuses the same idempotency key across multiple invocations with the same intent', () => {
    resetIdempotencyKey();
    const key1 = getIdempotencyKeyForIntent('addr-1', 'COD');
    const key2 = getIdempotencyKeyForIntent('addr-1', 'COD');

    expect(key1).toBeDefined();
    expect(key1).toBe(key2);
  });

  it('generates a fresh idempotency key when checkout intent parameters change', () => {
    resetIdempotencyKey();
    const key1 = getIdempotencyKeyForIntent('addr-1', 'COD');
    const key2 = getIdempotencyKeyForIntent('addr-2', 'COD');
    const key3 = getIdempotencyKeyForIntent('addr-2', 'ESEWA');

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
  });

  it('resets idempotency key after order completion or explicit reset', () => {
    const key1 = getIdempotencyKeyForIntent('addr-1', 'COD');
    resetIdempotencyKey();
    const key2 = getIdempotencyKeyForIntent('addr-1', 'COD');

    expect(key1).not.toBe(key2);
  });
});
