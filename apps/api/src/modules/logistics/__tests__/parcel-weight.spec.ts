import { describe, expect, it } from 'vitest';

import {
  MAX_PARCEL_WEIGHT_KG,
  MIN_PARCEL_WEIGHT_KG,
  resolveParcelWeightKg,
} from '@celebs/shared-types';

import {
  clampWeightDecimal,
  computeBillableLineWeightKg,
  sumBillableWeightKg,
  volumetricWeightDecimal,
} from '../parcel-weight';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

describe('volumetricWeightDecimal', () => {
  it('divides volume by the 5000 divisor exactly', () => {
    // 33 x 22 x 11 / 5000 is 1.5972 - a value with no exact binary form.
    expect(volumetricWeightDecimal(33, 22, 11)?.toString()).toBe('1.5972');
  });

  it('returns undefined for missing or non-positive dimensions', () => {
    expect(volumetricWeightDecimal(33, null, 11)).toBeUndefined();
    expect(volumetricWeightDecimal(0, 22, 11)).toBeUndefined();
    expect(volumetricWeightDecimal(33, -1, 11)).toBeUndefined();
  });
});

describe('clampWeightDecimal', () => {
  it('raises a zero or negative weight to the courier minimum', () => {
    expect(clampWeightDecimal(dec(0)).toNumber()).toBe(MIN_PARCEL_WEIGHT_KG);
    expect(clampWeightDecimal(dec(-4)).toNumber()).toBe(MIN_PARCEL_WEIGHT_KG);
  });

  it('caps at the courier maximum', () => {
    expect(clampWeightDecimal(dec(50)).toNumber()).toBe(MAX_PARCEL_WEIGHT_KG);
  });
});

describe('computeBillableLineWeightKg', () => {
  it('is exact where floating point drifts', () => {
    // 0.7 * 3 is 2.0999999999999996 in binary. Stored unrounded, that value
    // fails any comparison against 2.1 and the parcel is under-declared.
    expect(0.7 * 3).toBeLessThan(2.1);
    expect(computeBillableLineWeightKg({ weightKg: 0.7, quantity: 3 }).toString()).toBe('2.1');
  });

  it('rounds half-up at the gram rather than from the binary form', () => {
    // toFixed(2) yields "1.00" for 1.005; this must not.
    expect(computeBillableLineWeightKg({ weightKg: 1.005, quantity: 1 }).toString()).toBe('1.005');
  });

  it('uses the greater of mass and volume', () => {
    const bulky = computeBillableLineWeightKg({
      weightKg: 0.6,
      quantity: 1,
      lengthCm: 50,
      widthCm: 30,
      heightCm: 10,
    });
    expect(bulky.toNumber()).toBeCloseTo(3, 5);
  });

  it('keeps the mass when volume is smaller', () => {
    const light = computeBillableLineWeightKg({
      weightKg: 4,
      quantity: 1,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
    });
    expect(light.toNumber()).toBe(4);
  });

  it('charges the minimum for a product with no recorded weight', () => {
    // An unknown weight is not a zero weight, and the floor is the direction
    // that gets a parcel accepted rather than rejected.
    expect(computeBillableLineWeightKg({ weightKg: null, quantity: 2 }).toNumber()).toBe(1);
  });

  it('ignores a non-positive quantity rather than returning a free shipment', () => {
    expect(computeBillableLineWeightKg({ weightKg: 2, quantity: 0 }).toNumber()).toBe(
      MIN_PARCEL_WEIGHT_KG,
    );
  });

  it('agrees with the shared display helper on ordinary values', () => {
    // The app shows what the shared helper computes; if the two ever disagree
    // on a normal order the customer sees a figure we do not store.
    const line = { weightKg: 1.2, quantity: 3, lengthCm: null, widthCm: null, heightCm: null };
    expect(computeBillableLineWeightKg(line).toNumber()).toBe(
      resolveParcelWeightKg([{ weightKg: 1.2, quantity: 3 }]),
    );
  });
});

describe('sumBillableWeightKg', () => {
  it('sums without float drift across many lines', () => {
    const total = sumBillableWeightKg(Array.from({ length: 10 }, () => dec(0.1)));
    expect(total.toString()).toBe('1');
  });

  it('returns the minimum for an empty order', () => {
    expect(sumBillableWeightKg([]).toNumber()).toBe(MIN_PARCEL_WEIGHT_KG);
  });

  it('caps a heavy order at the courier maximum', () => {
    const total = sumBillableWeightKg([dec(9), dec(9)]);
    expect(total.toNumber()).toBe(MAX_PARCEL_WEIGHT_KG);
  });
});
