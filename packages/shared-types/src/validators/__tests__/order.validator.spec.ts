import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { addressSchema, checkoutSchema } from '../order.validator';

describe('Order Zod Validator Unit Tests', () => {
  it('should parse valid shipping address payload cleanly', () => {
    const payload = {
      fullName: 'Ram Bahadur',
      phone: '9841234567',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'New Baneshwor',
      streetAddress: 'House 42, Ward 10',
    };

    const parsed = addressSchema.parse(payload);
    expect(parsed.fullName).toBe('Ram Bahadur');
    expect(parsed.label).toBe('Home');
  });

  it('should throw ZodError on missing required address fields', () => {
    const payload = {
      fullName: 'Ram Bahadur',
      phone: '9841234567',
    };

    expect(() => addressSchema.parse(payload)).toThrow(ZodError);
  });

  describe('delivery zone', () => {
    const base = {
      fullName: 'Ram Bahadur',
      phone: '9841234567',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'New Baneshwor',
      streetAddress: 'House 42, Ward 10',
    };

    it('accepts the delivery zone chosen from the address picker', () => {
      const zoneId = '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

      expect(addressSchema.parse({ ...base, logisticsZoneId: zoneId }).logisticsZoneId).toBe(
        zoneId,
      );
    });

    it('accepts an address saved before delivery zones existed', () => {
      // Optional on purpose: refusing to save would lock existing customers out
      // of managing their addresses. Checkout is where a missing zone blocks.
      expect(() => addressSchema.parse(base)).not.toThrow();
    });

    it('accepts an empty zone so the form can submit before a pick is made', () => {
      expect(addressSchema.parse({ ...base, logisticsZoneId: '' }).logisticsZoneId).toBe('');
    });

    it('rejects a zone that is not a real id', () => {
      // A free-typed or malformed value would silently never match a courier
      // area, which is the exact failure the picker exists to prevent.
      expect(() => addressSchema.parse({ ...base, logisticsZoneId: 'not-a-uuid' })).toThrow(
        ZodError,
      );
    });
  });

  it('should validate checkout payment methods strictly', () => {
    const validCheckout = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      paymentMethod: 'COD',
      idempotencyKey: 'idemp-123456789',
    };

    expect(checkoutSchema.parse(validCheckout).paymentMethod).toBe('COD');

    const invalidCheckout = {
      ...validCheckout,
      paymentMethod: 'BITCOIN',
    };

    expect(() => checkoutSchema.parse(invalidCheckout)).toThrow(ZodError);
  });
});
