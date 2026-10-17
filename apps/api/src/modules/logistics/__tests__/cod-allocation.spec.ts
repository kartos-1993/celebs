import { describe, expect, it } from 'vitest';

import { allocateCollection } from '../cod-allocation';

import { Prisma } from '@/config/db.prisma';

const dec = (v: string | number) => new Prisma.Decimal(v);

/**
 * One customer pays one total. N parcels produce N collectible amounts.
 *
 * Those have to add back up to the total exactly. Not approximately - exactly.
 * The customer is told "collect 1363.50" and hands over 1363.50, and if our
 * consignments add to 1363.49 the courier is short a rupee against a customer who
 * has already paid us in full, and that rupee is ours.
 *
 * Proportional splitting with independent rounding cannot do this: round each
 * share down and the parcel loses money; round each up and the platform pays.
 * So the shares are floored, and the paisas left over are handed out by largest
 * remainder, which always sums to the total.
 */
describe('allocateCollection', () => {
  it("splits in proportion to each parcel's share of the value", () => {
    const result = allocateCollection({
      total: dec('1000'),
      parts: [
        { key: 'sellerA', weight: dec('700') },
        { key: 'sellerB', weight: dec('300') },
      ],
    });

    expect(result.get('sellerA')!.toFixed(2)).toBe('700.00');
    expect(result.get('sellerB')!.toFixed(2)).toBe('300.00');
  });

  it('sums to the total exactly when the shares do not divide', () => {
    // Three equal shares of 1000 is 333.333... each. Flooring all three loses a
    // rupee that has to go somewhere, and it must go somewhere rather than
    // evaporate.
    const result = allocateCollection({
      total: dec('1000'),
      parts: [
        { key: 'a', weight: dec('1') },
        { key: 'b', weight: dec('1') },
        { key: 'c', weight: dec('1') },
      ],
    });

    const sum = [...result.values()].reduce((acc, v) => acc.plus(v), dec('0'));
    expect(sum.toFixed(2)).toBe('1000.00');
    expect(result.get('a')!.toFixed(2)).toBe('333.34');
    expect(result.get('b')!.toFixed(2)).toBe('333.33');
    expect(result.get('c')!.toFixed(2)).toBe('333.33');
  });

  it('gives the leftover paisas to the largest remainders first', () => {
    // 10 across three equal parts is 3.3333...; one part gets the extra paisa.
    const result = allocateCollection({
      total: dec('10'),
      parts: [
        { key: 'a', weight: dec('1') },
        { key: 'b', weight: dec('1') },
        { key: 'c', weight: dec('1') },
      ],
    });

    expect(result.get('a')!.toFixed(2)).toBe('3.34');
    expect([...result.values()].reduce((acc, v) => acc.plus(v), dec('0')).toFixed(2)).toBe('10.00');
  });

  it('never allocates a negative amount on a negative total', () => {
    const result = allocateCollection({
      total: dec('-100'),
      parts: [
        { key: 'a', weight: dec('1') },
        { key: 'b', weight: dec('1') },
      ],
    });

    // A negative total is a broken input, not an instruction to take money from a
    // courier. Zero for every part is the only safe reading.
    for (const amount of result.values()) {
      expect(amount.toFixed(2)).toBe('0.00');
    }
  });

  it('gives everything to the only part when there is one', () => {
    const result = allocateCollection({
      total: dec('742.19'),
      parts: [{ key: 'a', weight: dec('9') }],
    });

    expect(result.get('a')!.toFixed(2)).toBe('742.19');
  });

  it('returns nothing at all when there are no parts', () => {
    const result = allocateCollection({ total: dec('500'), parts: [] });

    expect(result.size).toBe(0);
  });

  it('falls back to an even split when every weight is zero', () => {
    // Otherwise this divides by zero, and a parcel with no stated value would take
    // the whole customer total.
    const result = allocateCollection({
      total: dec('90'),
      parts: [
        { key: 'a', weight: dec('0') },
        { key: 'b', weight: dec('0') },
        { key: 'c', weight: dec('0') },
      ],
    });

    expect(result.get('a')!.toFixed(2)).toBe('30.00');
    expect(result.get('b')!.toFixed(2)).toBe('30.00');
    expect(result.get('c')!.toFixed(2)).toBe('30.00');
  });

  it('still sums exactly when the weights are wildly unequal', () => {
    const result = allocateCollection({
      total: dec('1363.50'),
      parts: [
        { key: 'heavy', weight: dec('9999') },
        { key: 'light', weight: dec('1') },
      ],
    });

    const sum = [...result.values()].reduce((acc, v) => acc.plus(v), dec('0'));
    expect(sum.toFixed(2)).toBe('1363.50');
  });

  it('is stable regardless of the order the parts arrive in', () => {
    const parts = [
      { key: 'a', weight: dec('1') },
      { key: 'b', weight: dec('1') },
      { key: 'c', weight: dec('1') },
    ];

    const forwards = allocateCollection({ total: dec('1000'), parts });
    const backwards = allocateCollection({ total: dec('1000'), parts: [...parts].reverse() });

    for (const key of ['a', 'b', 'c']) {
      expect(backwards.get(key)!.toFixed(2)).toBe(forwards.get(key)!.toFixed(2));
    }
  });
});
