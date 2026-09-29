import { describe, expect, it } from 'vitest';

import { type RateBand, resolveDeliveryPricing } from '../delivery-pricing';

const band = (over: Partial<RateBand> = {}): RateBand => ({
  id: 'r1',
  cityId: null,
  minWeightKg: 0,
  maxWeightKg: 10,
  fee: 150,
  codFee: 20,
  isActive: true,
  ...over,
});

describe('resolveDeliveryPricing', () => {
  it('waives delivery exactly on the zone threshold', () => {
    // The boundary the app and server used to disagree on: the app used `>=` and
    // said free, the server used `>` and charged.
    const result = resolveDeliveryPricing({
      subtotal: 2500,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 2500,
      flatShippingFee: 150,
      rates: [band()],
    });

    expect(result.shippingFee).toBe(0);
    expect(result.isFreeDelivery).toBe(true);
  });

  it('charges the rate card below the threshold', () => {
    const result = resolveDeliveryPricing({
      subtotal: 2499,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 2500,
      flatShippingFee: 150,
      rates: [band()],
    });

    expect(result.shippingFee).toBe(150);
    expect(result.isFreeDelivery).toBe(false);
  });

  it('charges nothing for an empty order', () => {
    const result = resolveDeliveryPricing({
      subtotal: 0,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 2500,
      flatShippingFee: 150,
      rates: [band()],
    });

    expect(result.shippingFee).toBe(0);
  });

  it('picks the band whose half-open range contains the weight', () => {
    const rates = [
      band({ id: 'light', minWeightKg: 0, maxWeightKg: 1, fee: 100 }),
      band({ id: 'heavy', minWeightKg: 1, maxWeightKg: 10, fee: 300 }),
    ];

    // Half-open: a parcel exactly on a boundary belongs to the upper band.
    expect(
      resolveDeliveryPricing({
        subtotal: 100,
        weightKg: 1,
        isCod: false,
        freeDeliveryThreshold: 9999,
        flatShippingFee: 150,
        rates,
      }).shippingFee,
    ).toBe(300);
    expect(
      resolveDeliveryPricing({
        subtotal: 100,
        weightKg: 0.9,
        isCod: false,
        freeDeliveryThreshold: 9999,
        flatShippingFee: 150,
        rates,
      }).shippingFee,
    ).toBe(100);
  });

  it('prefers a city-specific rate over the general one', () => {
    const result = resolveDeliveryPricing({
      subtotal: 100,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 9999,
      flatShippingFee: 150,
      cityId: 'city-1',
      rates: [band({ id: 'general', fee: 150 }), band({ id: 'city', cityId: 'city-1', fee: 400 })],
    });

    expect(result.shippingFee).toBe(400);
  });

  it('falls back to the policy fee when no band matches the weight', () => {
    // A gap in the rate card must not produce a free shipment.
    const result = resolveDeliveryPricing({
      subtotal: 100,
      weightKg: 5,
      isCod: false,
      freeDeliveryThreshold: 9999,
      flatShippingFee: 150,
      rates: [band({ minWeightKg: 0, maxWeightKg: 1 })],
    });

    expect(result.shippingFee).toBe(150);
    expect(result.source).toBe('FALLBACK');
  });

  it('ignores an inactive rate band', () => {
    const result = resolveDeliveryPricing({
      subtotal: 100,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 9999,
      flatShippingFee: 150,
      rates: [band({ isActive: false, fee: 999 })],
    });

    expect(result.shippingFee).toBe(150);
    expect(result.source).toBe('FALLBACK');
  });

  it('reports the courier cost we absorb, not the customer charge', () => {
    // Free delivery still costs the business money. Without this the threshold is
    // a silent margin decision.
    const result = resolveDeliveryPricing({
      subtotal: 5000,
      weightKg: 2,
      isCod: true,
      freeDeliveryThreshold: 2500,
      flatShippingFee: 150,
      rates: [band({ fee: 300, codFee: 30 })],
    });

    expect(result.shippingFee).toBe(0);
    expect(result.absorbedCost).toBe(330);
  });

  it('uses the higher threshold outside the valley', () => {
    const outside = resolveDeliveryPricing({
      subtotal: 3000,
      weightKg: 1,
      isCod: false,
      freeDeliveryThreshold: 5000,
      flatShippingFee: 150,
      rates: [band()],
    });

    expect(outside.isFreeDelivery).toBe(false);
    expect(outside.shippingFee).toBe(150);
  });
});
