import { describe, expect, it } from 'vitest';

import { moneySubtract } from '@celebs/shared-utils';

import { totalCalculatorRow } from '../lib/calculator-rows';

/**
 * The seller's tool.
 *
 * Whatever this shows has to reconcile on screen, because a seller who cannot add
 * up the three figures will not trust the list price they are being told to use.
 */

const row = (listPrice: number, commission: number) => ({
  desiredNet: listPrice - commission,
  listPrice,
  commission,
  sellerNet: listPrice - commission,
  ratePercent: 7.5,
});

describe('totalCalculatorRow', () => {
  it('reconciles: list price less commission equals what the seller keeps', () => {
    const total = totalCalculatorRow([row(972.97, 72.97), row(1081.08, 81.08)]);

    expect(total.listPrice).toBe(2054.05);
    expect(total.commission).toBe(154.05);
    expect(total.sellerNet).toBe(1900);
  });

  it('does not drift when variants are summed', () => {
    // 0.07 added ten times in floating point is 0.7000000000000001.
    const total = totalCalculatorRow(Array.from({ length: 10 }, () => row(0.07, 0)));

    expect(total.listPrice).toBe(0.7);
    expect(total.sellerNet).toBe(0.7);
  });

  it('handles no variants without inventing a figure', () => {
    expect(totalCalculatorRow([])).toEqual({
      desiredNet: 0,
      listPrice: 0,
      commission: 0,
      sellerNet: 0,
    });
  });

  it('keeps the parts adding to the total', () => {
    const total = totalCalculatorRow([row(500.01, 37.5), row(333.33, 25), row(1.08, 0.08)]);

    // Compared through the exact-money helper rather than `-` on floats, which is
    // the very drift this module exists to prevent: 834.42 - 62.58 is
    // 771.8399999999999 in binary floating point.
    expect(moneySubtract(total.listPrice, total.commission)).toBe(total.sellerNet);
  });
});
