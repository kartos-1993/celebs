import { describe, it, expect } from 'vitest';
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
