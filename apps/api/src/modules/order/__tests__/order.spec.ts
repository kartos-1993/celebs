import { describe, expect, it } from 'vitest';

import { addressSchema, checkoutSchema, COD_MAX_LIMIT } from '@celebs/shared-types';

describe('Order & Checkout Validation Rules', () => {
  it('enforces maximum COD limit of NPR 5,000', () => {
    expect(COD_MAX_LIMIT).toBe(5000);
  });

  it('validates Nepal address fields (Province, District, City/Area)', () => {
    const validAddress = {
      fullName: 'Ram Bahadur',
      phone: '9841234567',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'New Baneshwor',
      streetAddress: 'House #42, Near Civil Hospital',
      label: 'Home',
      isDefault: true,
    };

    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('rejects incomplete Nepal address missing cityArea', () => {
    const invalidAddress = {
      fullName: 'Ram Bahadur',
      phone: '9841234567',
      province: 'Bagmati',
      district: 'Kathmandu',
      streetAddress: 'House #42',
    };

    const result = addressSchema.safeParse(invalidAddress);
    expect(result.success).toBe(false);
  });

  it('validates checkout schema with payment method and idempotency key', () => {
    const validCheckout = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      paymentMethod: 'COD',
      idempotencyKey: 'idemp_key_9876543210',
    };

    const result = checkoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects KHALTI and ESEWA payment methods in checkout schema until adapters are available', () => {
    const khaltiCheckout = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      paymentMethod: 'KHALTI',
      idempotencyKey: 'idemp_key_9876543210',
    };
    const esewaCheckout = {
      addressId: '123e4567-e89b-12d3-a456-426614174000',
      paymentMethod: 'ESEWA',
      idempotencyKey: 'idemp_key_9876543210',
    };

    const khaltiRes = checkoutSchema.safeParse(khaltiCheckout);
    expect(khaltiRes.success).toBe(false);
    if (!khaltiRes.success) {
      expect(khaltiRes.error.issues[0].message).toContain('KHALTI and ESEWA payments are not supported yet');
    }

    const esewaRes = checkoutSchema.safeParse(esewaCheckout);
    expect(esewaRes.success).toBe(false);
    if (!esewaRes.success) {
      expect(esewaRes.error.issues[0].message).toContain('KHALTI and ESEWA payments are not supported yet');
    }
  });
});
