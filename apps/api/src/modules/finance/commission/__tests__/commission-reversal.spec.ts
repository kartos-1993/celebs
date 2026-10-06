import { describe, expect, it } from 'vitest';

import { commissionReversals } from '../commission-calculator';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

const line = (lineId: string, vendorId: string, subtotal: string, commissionAmount: string) => ({
  lineId,
  vendorId,
  subtotal: dec(subtotal),
  commissionAmount: dec(commissionAmount),
});

/**
 * Cancelling a sale must give back the commission too.
 *
 * The seller receives neither money nor product on a refunded order, so keeping
 * the commission would mean banking a cut of a transaction that never completed.
 * That is exactly the money a return policy is supposed to protect.
 */
describe('commissionReversals', () => {
  it('reverses all commission when the whole order is refunded', () => {
    const reversals = commissionReversals([line('l1', 'v1', '1000.00', '75.00')], dec('1000.00'));

    expect(reversals).toHaveLength(1);
    expect(reversals[0]?.amount.toFixed(2)).toBe('75.00');
    expect(reversals[0]?.vendorId).toBe('v1');
  });

  it('reverses each seller their own share, never the whole basket', () => {
    // The leak this prevents: one refund spanning two sellers must not hand back
    // one seller the commission taken from both.
    const reversals = commissionReversals(
      [line('l1', 'sellerA', '1800.00', '135.00'), line('l2', 'sellerB', '600.00', '45.00')],
      dec('2400.00'),
    );

    expect(reversals).toHaveLength(2);
    const byVendor = Object.fromEntries(reversals.map((r) => [r.vendorId, r.amount.toFixed(2)]));
    expect(byVendor).toEqual({ sellerA: '135.00', sellerB: '45.00' });
  });

  it('reverses a proportional share on a partial refund', () => {
    // Half the goods refunded means half the commission comes back.
    const reversals = commissionReversals([line('l1', 'v1', '2000.00', '150.00')], dec('1000.00'));

    expect(reversals[0]?.amount.toFixed(2)).toBe('75.00');
  });

  it('never reverses more commission than was taken', () => {
    // A refund larger than the goods - a goodwill credit, or a partial refund
    // after a price correction - must not pay out commission that never existed.
    const reversals = commissionReversals([line('l1', 'v1', '1000.00', '75.00')], dec('5000.00'));

    expect(reversals[0]?.amount.toFixed(2)).toBe('75.00');
  });

  it('rounds the proportional share half-up rather than truncating', () => {
    const reversals = commissionReversals([line('l1', 'v1', '972.97', '72.97')], dec('500.00'));

    // 72.97 * 500 / 972.97 = 37.4985..., which must land on 37.50 and not be
    // truncated to 37.49.
    expect(reversals[0]?.amount.toFixed(2)).toBe('37.50');
  });

  it('truncates nothing when the proportional share lands on a half paisa', () => {
    // A share that is exactly x.xx5 must round up, not down: the seller gave
    // back commission, and understating it leaves them short by a paisa.
    const reversals = commissionReversals([line('l1', 'v1', '3.00', '0.03')], dec('1.00'));

    // 0.03 * 1 / 3 = 0.01 exactly.
    expect(reversals[0]?.amount.toFixed(2)).toBe('0.01');
  });

  it('skips lines that paid no commission', () => {
    const reversals = commissionReversals(
      [line('l1', 'v1', '1000.00', '0.00'), line('l2', 'v2', '500.00', '37.50')],
      dec('1500.00'),
    );

    expect(reversals).toHaveLength(1);
    expect(reversals[0]?.vendorId).toBe('v2');
  });

  it('reverses nothing for a refund of zero', () => {
    expect(commissionReversals([line('l1', 'v1', '1000.00', '75.00')], dec('0.00'))).toEqual([]);
  });

  it('reverses nothing for an order with no commission anywhere', () => {
    expect(commissionReversals([line('l1', 'v1', '1000.00', '0.00')], dec('1000.00'))).toEqual([]);
  });

  it('handles an order with no lines at all', () => {
    expect(commissionReversals([], dec('1000.00'))).toEqual([]);
  });
});
