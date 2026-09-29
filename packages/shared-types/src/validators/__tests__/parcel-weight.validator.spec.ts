import { describe, expect, it } from 'vitest';

import {
  clampParcelWeight,
  MIN_PARCEL_WEIGHT_KG,
  resolveParcelWeightKg,
  roundWeightToGrams,
  volumetricWeightKg,
} from '../parcel-weight.validator';

describe('volumetricWeightKg', () => {
  // Pathao and other domestic couriers bill the greater of actual weight and
  // volume divided by 5000 (grams per kilogram), so a bulky but light parcel
  // still costs more to ship than its mass suggests.
  it('divides volume in cm by the 5000 divisor', () => {
    expect(volumetricWeightKg(30, 20, 10)).toBeCloseTo(1.2, 5);
  });

  it('returns undefined when any dimension is missing', () => {
    expect(volumetricWeightKg(30, 20, null)).toBeUndefined();
    expect(volumetricWeightKg(null, 20, 10)).toBeUndefined();
    expect(volumetricWeightKg(30, undefined, 10)).toBeUndefined();
  });

  it('ignores non-positive dimensions rather than reporting zero volume', () => {
    expect(volumetricWeightKg(0, 20, 10)).toBeUndefined();
    expect(volumetricWeightKg(30, -5, 10)).toBeUndefined();
  });
});

describe('roundWeightToGrams', () => {
  it('rounds half-up rather than from the binary representation', () => {
    // `toFixed` gives 1.00 for 1.005 and 1.04 for 1.045, because those decimals
    // are not representable in binary. The stored weight must not inherit that.
    expect(roundWeightToGrams(1.005)).toBe(1.005);
    expect(roundWeightToGrams(1.045)).toBe(1.045);
    expect(roundWeightToGrams(2.675)).toBe(2.675);
  });

  it('rounds a genuine tie up', () => {
    expect(roundWeightToGrams(1.0005)).toBe(1.001);
    expect(roundWeightToGrams(1.5975)).toBe(1.598);
    expect(roundWeightToGrams(0.0005)).toBe(0.001);
  });

  it('rounds a value one ulp below a tie up rather than down', () => {
    // 0.7 * 3 is 2.0999999999999996 in binary. Left unrounded it fails any
    // comparison against 2.1, which is how a parcel silently under-declares.
    expect(0.7 * 3).toBeLessThan(2.1);
    expect(roundWeightToGrams(0.7 * 3)).toBe(2.1);
  });

  it('leaves a value already at gram precision alone', () => {
    expect(roundWeightToGrams(1.597)).toBe(1.597);
    expect(roundWeightToGrams(2.1)).toBe(2.1);
  });
});

describe('clampParcelWeight', () => {
  it('raises a sub-minimum weight to the courier minimum', () => {
    // Every carrier rejects a parcel below 0.5 kg, so an order that totals
    // 0.3 kg has to be quoted as 0.5 rather than rejected.
    expect(clampParcelWeight(0.3)).toBe(MIN_PARCEL_WEIGHT_KG);
  });

  it('passes an in-range weight through untouched', () => {
    expect(clampParcelWeight(2.4)).toBe(2.4);
  });

  it('caps at the maximum a single parcel can be', () => {
    expect(clampParcelWeight(25)).toBe(10);
  });

  it('falls back to the minimum for a missing or unusable weight', () => {
    expect(clampParcelWeight(undefined)).toBe(MIN_PARCEL_WEIGHT_KG);
    expect(clampParcelWeight(Number.NaN)).toBe(MIN_PARCEL_WEIGHT_KG);
    expect(clampParcelWeight(0)).toBe(MIN_PARCEL_WEIGHT_KG);
  });
});

describe('resolveParcelWeightKg', () => {
  const item = (weight: number | null | undefined, quantity: number, dims?: number[]) => ({
    weightKg: weight,
    quantity,
    lengthCm: dims?.[0] ?? null,
    widthCm: dims?.[1] ?? null,
    heightCm: dims?.[2] ?? null,
  });

  it('sums weight multiplied by quantity across the order', () => {
    // 0.5 x 2 + 1.2 x 3 = 4.6
    expect(resolveParcelWeightKg([item(0.5, 2), item(1.2, 3)])).toBeCloseTo(4.6, 5);
  });

  it('uses the greater of actual and volumetric weight for the order', () => {
    // 1 kg of feathers in a big box: mass says 1 kg, volume says 3 kg.
    const weight = resolveParcelWeightKg([item(1, 1, [50, 30, 10])]);
    expect(weight).toBeCloseTo(3, 5);
  });

  it('keeps the actual weight when volume is smaller', () => {
    const weight = resolveParcelWeightKg([item(4, 1, [10, 10, 10])]);
    expect(weight).toBeCloseTo(4, 5);
  });

  it('applies the minimum to the order total, not to each line', () => {
    // Three 0.1 kg shirts travel as ONE parcel. A courier bills that at the
    // 0.5 kg floor, not as three sub-minimum parcels totalling 1.5 kg.
    expect(resolveParcelWeightKg([item(0.1, 3)])).toBeCloseTo(0.5, 5);
  });

  it('returns the minimum for an empty order rather than zero', () => {
    expect(resolveParcelWeightKg([])).toBe(MIN_PARCEL_WEIGHT_KG);
  });

  it('caps a very heavy order at the courier maximum', () => {
    expect(resolveParcelWeightKg([item(9, 5)])).toBe(10);
  });

  it('charges the minimum per unit for a product with no recorded weight', () => {
    // An unknown weight is not a zero weight. Weight becomes required going
    // forward; this covers legacy products, and errs towards a parcel the
    // courier will accept rather than one it rejects.
    expect(resolveParcelWeightKg([item(null, 3)])).toBeCloseTo(1.5, 5);
  });
});
