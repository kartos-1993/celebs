import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { computeSellerTotals } from '../seller-totals';

import { Prisma } from '@/config/db.prisma';

/**
 * The arithmetic behind both the live seller dashboard and the frozen statement.
 *
 * Pure on purpose: it is the one place a paisa can be lost, and it is the one
 * place two screens would otherwise disagree.
 */
const row = (type: LedgerEntryType, direction: LedgerDirection, amount: string | null) => ({
  type,
  direction,
  _sum: { amount: amount === null ? null : new Prisma.Decimal(amount) },
});

describe('computeSellerTotals', () => {
  it('nets revenue against commission and refunds', () => {
    const totals = computeSellerTotals([
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.IN, '1000.00'),
      row(LedgerEntryType.COMMISSION, LedgerDirection.OUT, '150.00'),
      row(LedgerEntryType.REFUND, LedgerDirection.OUT, '100.00'),
    ]);

    expect(totals.grossSales.toFixed(2)).toBe('1000.00');
    expect(totals.commission.toFixed(2)).toBe('150.00');
    expect(totals.refunds.toFixed(2)).toBe('100.00');
    // 1000 - 150 - 100. Derived, so it always agrees with the lines above.
    expect(totals.netPayable.toFixed(2)).toBe('750.00');
  });

  it('matches the commission on the line, which multiplying by a rate would not', () => {
    // 8.05 at 9% is 0.7245. Multiplying rounds to 0.72 and nets 7.33; subtracting
    // the stored commission keeps the two figures consistent with each other.
    const totals = computeSellerTotals([
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.IN, '8.05'),
      row(LedgerEntryType.COMMISSION, LedgerDirection.OUT, '0.72'),
    ]);

    expect(totals.netPayable.toFixed(2)).toBe('7.33');
  });

  it('reports delivery costs separately and never subtracts them from the payout', () => {
    const totals = computeSellerTotals([
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.IN, '500.00'),
      row(LedgerEntryType.COURIER_DELIVERY_FEE, LedgerDirection.OUT, '80.00'),
      row(LedgerEntryType.FREE_DELIVERY_ABSORBED, LedgerDirection.OUT, '20.00'),
    ]);

    expect(totals.deliveryCosts.toFixed(2)).toBe('100.00');
    // Delivery is what it cost us. Withholding it would be a different promise.
    expect(totals.netPayable.toFixed(2)).toBe('500.00');
  });

  it('counts a refund against the seller it is attributed to', () => {
    const totals = computeSellerTotals([row(LedgerEntryType.REFUND, LedgerDirection.OUT, '75.50')]);

    expect(totals.refunds.toFixed(2)).toBe('75.50');
  });

  it('totals zero for a period with no activity rather than failing', () => {
    const totals = computeSellerTotals([]);

    expect(totals.netPayable.toFixed(2)).toBe('0.00');
    expect(totals.currency).toBe('NPR');
  });

  it('treats a null summed amount as zero', () => {
    const totals = computeSellerTotals([
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.IN, null),
    ]);

    expect(totals.grossSales.toFixed(2)).toBe('0.00');
  });

  it('ignores an entry pointing the wrong way, such as a reversed delivery charge', () => {
    const totals = computeSellerTotals([
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.IN, '300.00'),
      // An OUT revenue entry is not revenue; counting it would corrupt the total.
      row(LedgerEntryType.ORDER_REVENUE, LedgerDirection.OUT, '300.00'),
    ]);

    expect(totals.grossSales.toFixed(2)).toBe('300.00');
  });
});
