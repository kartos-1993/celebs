import { describe, it, expect } from 'vitest';
import { COD_MAX_LIMIT, addressSchema, checkoutSchema } from '@celebs/shared-types';

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
});
