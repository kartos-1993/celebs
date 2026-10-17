import { describe, expect, it } from 'vitest';

import {
  buildSandboxCourierQuote,
  buildSandboxTrackingNumber,
  isSandboxCourierFallbackAllowed,
} from '../sandbox-courier-fallback';

/**
 * The escape hatch that lets local fulfilment be tested while the courier is
 * down. Two properties matter, and the second is the important one: a mocked
 * consignment must be impossible to confuse with a real one.
 */
describe('sandbox courier fallback', () => {
  it('is allowed everywhere except production', () => {
    const original = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'development';
      expect(isSandboxCourierFallbackAllowed()).toBe(true);

      process.env.NODE_ENV = 'test';
      expect(isSandboxCourierFallbackAllowed()).toBe(true);

      // The single environment where a courier holding real consignments must
      // never be substituted for.
      process.env.NODE_ENV = 'production';
      expect(isSandboxCourierFallbackAllowed()).toBe(false);
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it('marks every mocked tracking number so it cannot pass for a courier waybill', () => {
    const tracking = buildSandboxTrackingNumber('ORD-2026-001', 0);

    expect(tracking.startsWith('PATHAO-MOCK-')).toBe(true);
    // A courier's ids never carry this prefix, so reconciliation against a real
    // statement cannot silently pick a mocked parcel up.
    expect(tracking).toBe('PATHAO-MOCK-ORD-2026-001-1');
  });

  it('gives each parcel of a split dispatch its own number', () => {
    const first = buildSandboxTrackingNumber('ORD-2026-002', 0);
    const second = buildSandboxTrackingNumber('ORD-2026-002', 1);

    expect(first).not.toBe(second);
  });

  it('is deterministic, so a retried dispatch does not look like a second parcel', () => {
    expect(buildSandboxTrackingNumber('ORD-2026-003', 0)).toBe(
      buildSandboxTrackingNumber('ORD-2026-003', 0),
    );
  });

  it('provides a valid fallback courier quote with standard delivery fees and COD handling', () => {
    const quote = buildSandboxCourierQuote();
    expect(quote.finalPrice.toFixed(2)).toBe('100.00');
    expect(quote.codPercentage.toFixed(2)).toBe('0.01');
    expect(quote.codEnabled).toBe(true);
    expect(quote.planId).toBe(1);
    expect(quote.raw).toMatchObject({ mock: true });
  });
});
