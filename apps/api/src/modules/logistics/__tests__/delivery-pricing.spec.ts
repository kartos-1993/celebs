import { describe, expect, it } from 'vitest';

import { type RateBand, resolveDeliveryPricing } from '../delivery-pricing';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

const band = (over: Partial<RateBand> = {}): RateBand => ({
  id: 'r1',
  cityId: null,
  minWeightKg: dec(0),
  maxWeightKg: dec(10),
  fee: dec(150),
  codFee: dec(20),
  isActive: true,
  ...over,
});

const base = {
  subtotal: dec(2500),
  weightKg: dec(1),
  isCod: false,
  freeDeliveryThreshold: dec(2500),
  flatShippingFee: dec(150),
  rates: [band()],
};

describe('resolveDeliveryPricing', () => {
  it('waives delivery exactly on the zone threshold', () => {
    // The boundary the app and server used to disagree on: the app used `>=` and
    // said free, the server used `>` and charged.
    const result = resolveDeliveryPricing({ ...base, subtotal: dec(2500) });

    expect(result.shippingFee.equals(0)).toBe(true);
    expect(result.isFreeDelivery).toBe(true);
  });

  it('charges the rate card one paisa below the threshold', () => {
    const result = resolveDeliveryPricing({ ...base, subtotal: dec('2499.99') });

    expect(result.shippingFee.equals(150)).toBe(true);
    expect(result.isFreeDelivery).toBe(false);
  });

  it('charges nothing for an empty order', () => {
    const result = resolveDeliveryPricing({ ...base, subtotal: dec(0) });

    expect(result.shippingFee.equals(0)).toBe(true);
    expect(result.courierFee.equals(0)).toBe(true);
  });

  it('picks the band whose half-open range contains the weight', () => {
    const rates = [
      band({ id: 'light', minWeightKg: dec(0), maxWeightKg: dec(1) }),
      band({ id: 'medium', minWeightKg: dec(1), maxWeightKg: dec(5) }),
      band({ id: 'heavy', minWeightKg: dec(5), maxWeightKg: dec(10) }),
    ];

    expect(resolveDeliveryPricing({ ...base, weightKg: dec('0.999'), rates }).matchedRateId).toBe(
      'light',
    );
    expect(resolveDeliveryPricing({ ...base, weightKg: dec(1), rates }).matchedRateId).toBe(
      'medium',
    );
    expect(resolveDeliveryPricing({ ...base, weightKg: dec('4.999'), rates }).matchedRateId).toBe(
      'medium',
    );
  });

  it('prefers a city-specific rate over the general one', () => {
    const rates = [
      band({ id: 'general', cityId: null }),
      band({ id: 'city', cityId: 'city-1', fee: dec(90) }),
    ];

    const result = resolveDeliveryPricing({
      ...base,
      subtotal: dec(2499),
      rates,
      cityId: 'city-1',
    });

    expect(result.matchedRateId).toBe('city');
    expect(result.source).toBe('RATE_CARD');
    expect(result.shippingFee.equals(90)).toBe(true);
  });

  it('uses the general rate for a city that has no rate of its own', () => {
    // A rate card with only general bands is the common case. If those bands
    // were skipped for any destination we could name, the card would appear to
    // do nothing and every order would quietly use the flat fallback.
    const rates = [band({ id: 'general', cityId: null, fee: dec(70) })];

    const result = resolveDeliveryPricing({
      ...base,
      subtotal: dec(2499),
      rates,
      cityId: 'biratnagar',
    });

    expect(result.matchedRateId).toBe('general');
    expect(result.shippingFee.equals(70)).toBe(true);
  });

  it('does not use another city rate for a city it was not written for', () => {
    const rates = [band({ id: 'other-city', cityId: 'pokhara', fee: dec(70) })];

    expect(
      resolveDeliveryPricing({ ...base, subtotal: dec(2499), rates, cityId: 'biratnagar' }).source,
    ).toBe('FALLBACK');
  });

  it('falls back to the policy fee when no band matches the weight', () => {
    const rates = [band({ minWeightKg: dec(20), maxWeightKg: dec(30) })];

    const result = resolveDeliveryPricing({ ...base, subtotal: dec(2499), rates });

    expect(result.source).toBe('FALLBACK');
    expect(result.matchedRateId).toBeNull();
    expect(result.shippingFee.equals(150)).toBe(true);
  });

  it('ignores an inactive rate band', () => {
    const rates = [band({ isActive: false })];

    expect(resolveDeliveryPricing({ ...base, rates }).source).toBe('FALLBACK');
  });

  it('reports the courier cost we absorb, not the customer charge', () => {
    // Waiving delivery for a free order still costs the courier's rate, and the
    // business gives that up. Keeping the two apart is the only way to see what
    // the thresholds cost.
    const result = resolveDeliveryPricing({ ...base, subtotal: dec(3000) });

    expect(result.shippingFee.equals(0)).toBe(true);
    expect(result.courierFee.equals(150)).toBe(true);
    expect(result.absorbedCost.equals(150)).toBe(true);
  });

  it('uses the higher threshold outside the valley', () => {
    const result = resolveDeliveryPricing({
      ...base,
      subtotal: dec(3000),
      freeDeliveryThreshold: dec(5000),
    });

    expect(result.isFreeDelivery).toBe(false);
    expect(result.shippingFee.equals(150)).toBe(true);
  });

  describe('precision', () => {
    it('adds the collection fee without float drift', () => {
      // 0.1 + 0.2 is 0.30000000000000004 in binary floating point, which is a
      // fee of 0.30 being recorded as 0.30000000000000004 in the database.
      const result = resolveDeliveryPricing({
        ...base,
        subtotal: dec(10),
        isCod: true,
        rates: [band({ fee: dec('0.10'), codFee: dec('0.20') })],
      });

      expect(result.courierFee.toFixed(2)).toBe('0.30');
      expect(result.shippingFee.toFixed(2)).toBe('0.30');
    });

    it('matches a band on a weight that float arithmetic gets wrong', () => {
      // 2.675 as a double is 2.67499999999999982, which falls *below* 2.675 and
      // would price a 2.675 kg parcel in the cheaper band.
      const rates = [
        band({ id: 'light', minWeightKg: dec(0), maxWeightKg: dec('2.675') }),
        band({ id: 'medium', minWeightKg: dec('2.675'), maxWeightKg: dec(10) }),
      ];

      const result = resolveDeliveryPricing({ ...base, weightKg: dec('2.675'), rates });

      expect(result.matchedRateId).toBe('medium');
    });

    it('treats a parcel exactly on the upper band limit as the higher band', () => {
      const rates = [
        band({ id: 'light', minWeightKg: dec(0), maxWeightKg: dec(1) }),
        band({ id: 'heavy', minWeightKg: dec(1), maxWeightKg: dec(10) }),
      ];

      expect(resolveDeliveryPricing({ ...base, weightKg: dec(1), rates }).matchedRateId).toBe(
        'heavy',
      );
    });

    it('keeps a weight with more precision than the stored figure', () => {
      // The cart sums line weights, so the parcel is not a whole number. A band
      // boundary at 1.5 kg must catch 1.5 exactly.
      const rates = [band({ id: 'medium', minWeightKg: dec('1.5'), maxWeightKg: dec(10) })];

      expect(resolveDeliveryPricing({ ...base, weightKg: dec('1.5'), rates }).matchedRateId).toBe(
        'medium',
      );
      expect(resolveDeliveryPricing({ ...base, weightKg: dec('1.499'), rates }).source).toBe(
        'FALLBACK',
      );
    });

    it('never returns a fraction of a paisa', () => {
      const result = resolveDeliveryPricing({
        ...base,
        subtotal: dec('10.005'),
        rates: [band({ fee: dec('33.333') })],
      });

      expect(result.shippingFee.toFixed(2)).toBe('33.33');
    });
  });
});
