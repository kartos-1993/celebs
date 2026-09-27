import { describe, expect, it } from 'vitest';

import {
  baseProductSchema,
  shippingDetailsSchema,
  warrantyDetailsSchema,
} from '../product.validator';

describe('Shipping and Warranty Validation Specifications', () => {
  describe('Shipping Details Schema', () => {
    it('applies default standard flyer and weight when shipping properties are omitted', () => {
      const parsed = shippingDetailsSchema.parse({});
      expect(parsed.packageWeightKg).toBe(0.3);
      expect(parsed.packagingType).toBe('FLYER_SMALL');
      expect(parsed.isFragile).toBe(false);
      expect(parsed.hasBatteryOrLiquid).toBe(false);
    });

    it('rejects zero or negative package weights', () => {
      expect(() => shippingDetailsSchema.parse({ packageWeightKg: 0 })).toThrow();
      expect(() => shippingDetailsSchema.parse({ packageWeightKg: -0.5 })).toThrow();
    });

    it('accepts physical dimensions in centimeters for volumetric calculations', () => {
      const parsed = shippingDetailsSchema.parse({
        packageWeightKg: 0.8,
        packageLengthCm: 30,
        packageWidthCm: 20,
        packageHeightCm: 10,
        packagingType: 'BOX_STANDARD',
        isFragile: true,
        hasBatteryOrLiquid: false,
      });

      expect(parsed.packageLengthCm).toBe(30);
      expect(parsed.packageWidthCm).toBe(20);
      expect(parsed.packageHeightCm).toBe(10);
      expect(parsed.isFragile).toBe(true);
    });
  });

  describe('Warranty and Return Guard Schema', () => {
    it('defaults to NO_WARRANTY and returnable status', () => {
      const parsed = warrantyDetailsSchema.parse({});
      expect(parsed.warrantyType).toBe('NO_WARRANTY');
      expect(parsed.isNonReturnable).toBe(false);
      expect(parsed.warrantyPeriod).toBeUndefined();
    });

    it('accepts brand and seller warranty with policy explanation', () => {
      const parsed = warrantyDetailsSchema.parse({
        warrantyType: 'BRAND_WARRANTY',
        warrantyPeriod: '1 Year Authorized Service',
        warrantyPolicy: 'Covers internal circuit manufacturing defects only.',
      });

      expect(parsed.warrantyType).toBe('BRAND_WARRANTY');
      expect(parsed.warrantyPeriod).toBe('1 Year Authorized Service');
    });

    it('flags intimate hygiene items as non-returnable to protect merchant and customer health', () => {
      const parsed = warrantyDetailsSchema.parse({
        isNonReturnable: true,
      });

      expect(parsed.isNonReturnable).toBe(true);
    });
  });

  describe('Integration into Base Product Schema', () => {
    it('integrates shipping and warranty fields seamlessly within base product validation', () => {
      const validProduct = {
        name: 'Oversized Heavyweight Hoodie',
        price: 2499,
        categoryId: '00000000-0000-0000-0000-000000000001',
        subcategoryId: '00000000-0000-0000-0000-000000000002',
        packageWeightKg: 0.65,
        packagingType: 'FLYER_MEDIUM',
        isFragile: false,
        warrantyType: 'SELLER_WARRANTY',
        warrantyPeriod: '7 Days Replacement',
        isNonReturnable: false,
      };

      const parsed = baseProductSchema.parse(validProduct);
      expect(parsed.packageWeightKg).toBe(0.65);
      expect(parsed.packagingType).toBe('FLYER_MEDIUM');
      expect(parsed.warrantyType).toBe('SELLER_WARRANTY');
      expect(parsed.isNonReturnable).toBe(false);
    });
  });
});
