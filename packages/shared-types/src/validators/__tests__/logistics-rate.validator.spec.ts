import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import {
  createShippingRateSchema,
  updateDeliveryCitySchema,
  updateShippingRateSchema,
} from '../logistics.validator';

describe('shipping rate validators', () => {
  const validBand = {
    // Null city means the band applies to every city.
    cityId: null,
    minWeightKg: 0,
    maxWeightKg: 1,
    fee: 80,
    codFee: 0,
  };

  describe('createShippingRateSchema', () => {
    it('accepts a general band with no city', () => {
      expect(createShippingRateSchema.parse(validBand).cityId).toBeNull();
    });

    it('accepts a city-specific band', () => {
      const parsed = createShippingRateSchema.parse({
        ...validBand,
        cityId: '1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f',
      });

      expect(parsed.cityId).toBe('1f2c0f6e-2a3b-4c5d-8e9f-0a1b2c3d4e5f');
    });

    it('rejects an empty band, which would claim every weight for free', () => {
      // min === max matches nothing, and an admin who typed the same number twice
      // would otherwise create a band that silently never prices anything.
      expect(() =>
        createShippingRateSchema.parse({ ...validBand, minWeightKg: 2, maxWeightKg: 2 }),
      ).toThrow(ZodError);
    });

    it('rejects an inverted band', () => {
      expect(() =>
        createShippingRateSchema.parse({ ...validBand, minWeightKg: 5, maxWeightKg: 1 }),
      ).toThrow(ZodError);
    });

    it('rejects a negative weight or fee', () => {
      expect(() => createShippingRateSchema.parse({ ...validBand, minWeightKg: -1 })).toThrow(
        ZodError,
      );
      expect(() => createShippingRateSchema.parse({ ...validBand, fee: -10 })).toThrow(ZodError);
    });

    it('rejects a fee with more precision than a paisa', () => {
      // Silently rounding an admin's 80.005 hides what they typed.
      expect(() => createShippingRateSchema.parse({ ...validBand, fee: 80.005 })).toThrow(ZodError);
    });

    it('rejects a band over the courier maximum', () => {
      expect(() => createShippingRateSchema.parse({ ...validBand, maxWeightKg: 25 })).toThrow(
        ZodError,
      );
    });

    it('rejects a city id that is not a uuid', () => {
      expect(() => createShippingRateSchema.parse({ ...validBand, cityId: 'kathmandu' })).toThrow(
        ZodError,
      );
    });
  });

  describe('updateShippingRateSchema', () => {
    it('accepts a fee-only edit', () => {
      expect(updateShippingRateSchema.parse({ fee: 120 }).fee).toBe(120);
    });

    it('rejects an empty patch that would change nothing', () => {
      expect(() => updateShippingRateSchema.parse({})).toThrow(ZodError);
    });

    it('rejects unknown fields rather than dropping them silently', () => {
      expect(() =>
        updateShippingRateSchema.parse({ fee: 120, freeDelivery: 'always' } as never),
      ).toThrow(ZodError);
    });

    it('allows moving a band between general and city-specific', () => {
      // An admin correcting a band they filed against the wrong city should not
      // have to delete and recreate it.
      expect(updateShippingRateSchema.parse({ cityId: null })).toEqual({ cityId: null });
    });

    it('rejects turning a band off with a non-boolean', () => {
      expect(() => updateShippingRateSchema.parse({ isActive: 'yes' })).toThrow(ZodError);
    });
  });

  describe('updateDeliveryCitySchema', () => {
    it('accepts a new threshold', () => {
      expect(updateDeliveryCitySchema.parse({ freeDeliveryThreshold: 5000 })).toEqual({
        freeDeliveryThreshold: 5000,
      });
    });

    it('rejects a threshold below the value of a small order', () => {
      // A threshold of 1 would make every order free, which is a pricing
      // decision nobody should be able to make by typing one digit.
      expect(() => updateDeliveryCitySchema.parse({ freeDeliveryThreshold: 1 })).toThrow(ZodError);
    });

    it('rejects a threshold that is not money', () => {
      expect(() => updateDeliveryCitySchema.parse({ freeDeliveryThreshold: 2500.5 })).toThrow(
        ZodError,
      );
      expect(() => updateDeliveryCitySchema.parse({ freeDeliveryThreshold: -2500 })).toThrow(
        ZodError,
      );
    });

    it('allows switching a city off without touching its threshold', () => {
      expect(updateDeliveryCitySchema.parse({ isActive: false })).toEqual({ isActive: false });
    });

    it('rejects an empty patch', () => {
      expect(() => updateDeliveryCitySchema.parse({})).toThrow(ZodError);
    });
  });
});
