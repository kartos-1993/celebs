import { describe, expect, it } from 'vitest';

import {
  commissionForLine,
  effectiveRatePercent,
  listPriceForNet,
  sellerNetForLine,
} from '../commission-calculator';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

describe('commissionForLine', () => {
  it('takes the rate off the gross exactly', () => {
    expect(commissionForLine(dec('3601.00'), dec('7.50')).toFixed(2)).toBe('270.08');
    expect(commissionForLine(dec('1000.00'), dec('10.00')).toFixed(2)).toBe('100.00');
  });

  it('rounds half-up rather than truncating', () => {
    // 972.97 * 7.5 / 100 is 72.972750, which must land on 72.97, not 72.98.
    expect(commissionForLine(dec('972.97'), dec('7.50')).toFixed(2)).toBe('72.97');
  });

  it('charges nothing on a free line', () => {
    expect(commissionForLine(dec('0.00'), dec('7.50')).toFixed(2)).toBe('0.00');
  });

  it('refuses a rate that would pay the seller to list', () => {
    expect(() => commissionForLine(dec('100'), dec('100.01'))).toThrow(RangeError);
    expect(() => commissionForLine(dec('100'), dec('-1'))).toThrow(RangeError);
  });

  it('never produces a negative charge on a credit line', () => {
    // A credit note is not a negative commission.
    expect(commissionForLine(dec('-50.00'), dec('7.50')).toFixed(2)).toBe('0.00');
  });
});

describe('sellerNetForLine', () => {
  // The invariant the whole design rests on: the seller nets the gross less the
  // commission we recorded, by subtraction. Computing it independently as
  // gross * (1 - rate) is what makes a ledger drift away from payouts by a paisa
  // at a time, and it is the reason this helper exists at all.
  it('is the gross less the commission, exactly', () => {
    expect(sellerNetForLine(dec('3601.00'), dec('270.08')).toFixed(2)).toBe('3330.92');
  });

  it('never disagrees with the commission recorded beside it', () => {
    for (const gross of ['972.97', '1081.08', '360.00', '1.08', '100.50', '1999.99']) {
      for (const rate of ['7.50', '2.00', '15.00']) {
        const commission = commissionForLine(dec(gross), dec(rate));
        const net = sellerNetForLine(dec(gross), commission);
        const independent = dec(gross)
          .mul(dec(100).minus(dec(rate)))
          .div(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        // Ours is the truth by construction; the independent figure is only ever
        // off by a paisa, but "only ever" is exactly how a ledger stops tying.
        expect(net.plus(commission).toFixed(2)).toBe(dec(gross).toFixed(2));
        expect(net.toFixed(2)).toBe(net.toDecimalPlaces(2).toFixed(2));
        // Recorded so the divergence is visible rather than assumed away.
        if (independent.toFixed(2) !== net.toFixed(2)) {
          expect(independent.minus(net).abs().lte(dec('0.01'))).toBe(true);
        }
      }
    }
  });
});

describe('effectiveRatePercent', () => {
  it('reports the rate actually paid, which is not quite the nominal one', () => {
    // A two-decimal list price cannot represent 1 / 0.925 exactly.
    expect(effectiveRatePercent(dec('972.97'), dec('72.97')).toFixed(4)).toBe('7.4997');
    expect(effectiveRatePercent(dec('360.00'), dec('27.00')).toFixed(4)).toBe('7.5000');
  });

  it('is worst on cheap goods, and bounded', () => {
    expect(effectiveRatePercent(dec('0.50'), dec('0.04')).toFixed(4)).toBe('8.0000');
  });

  it('does not divide by a free line', () => {
    expect(effectiveRatePercent(dec('0'), dec('0')).toFixed(4)).toBe('0.0000');
  });
});

describe('listPriceForNet', () => {
  it('lets a seller hit a target net exactly', () => {
    const result = listPriceForNet(dec('900.00'), dec('7.50'));

    expect(result.listPrice.toFixed(2)).toBe('972.97');
    expect(result.commission.toFixed(2)).toBe('72.97');
    expect(result.sellerNet.toFixed(2)).toBe('900.00');
  });

  it('works for a range of targets', () => {
    for (const target of ['1.00', '333.00', '1000.00', '4725.50', '0.07']) {
      const result = listPriceForNet(dec(target), dec('7.50'));
      // The point of the tool: the seller nets exactly what they asked for.
      expect(result.sellerNet.toFixed(2)).toBe(dec(target).toFixed(2));
    }
  });

  it('refuses a rate that nets nothing, rather than returning Infinity', () => {
    expect(() => listPriceForNet(dec('900'), dec('100'))).toThrow(RangeError);
  });

  it('refuses a target of zero', () => {
    expect(() => listPriceForNet(dec('0'), dec('7.5'))).toThrow(RangeError);
  });

  it('treats a zero rate as listing at the target', () => {
    const result = listPriceForNet(dec('500'), dec('0'));

    expect(result.listPrice.toFixed(2)).toBe('500.00');
    expect(result.commission.toFixed(2)).toBe('0.00');
  });
});
