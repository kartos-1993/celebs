
import { computeSellerTotals, type GroupedLedgerRow } from '../ledger/seller-totals';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Reading one seller's money.
 *
 * Scoped by `vendorId` on the entry, never by joining the seller's order items.
 * `Order` has no vendor column - an order is a basket that can hold several
 * sellers' goods - so ORDER_REVENUE is posted once for the whole subtotal and a
 * join would credit one seller with another seller's revenue.
 *
 * The arithmetic is NOT here: it lives in ledger/seller-totals so that this live
 * view and a frozen SellerStatement cannot disagree about the same period. For a
 * CLOSED period, prefer the statement - see SellerStatementService.lockedFor -
 * because the ledger keeps moving and this number will keep changing with it.
 */

export interface EarningsScope {
  vendorId: string;
  from?: Date;
  to?: Date;
}

export interface EarningsSummary {
  grossSales: Prisma.Decimal;
  commission: Prisma.Decimal;
  deliveryCosts: Prisma.Decimal;
  refunds: Prisma.Decimal;
  /** Gross less commission and refunds. Derived, never multiplied by a rate. */
  netEarnings: Prisma.Decimal;
  currency: string;
}

export class EarningsRepository {
  /**
   * Totals for one seller over a period.
   *
   * Net is derived by subtraction. Computing it as gross * (1 - rate) would round
   * independently and land a paisa away from the commission shown on the line,
   * which is the difference between a figure a seller can check and one they
   * cannot.
   */
  async summarise(scope: EarningsScope): Promise<EarningsSummary> {
    const grouped = await prisma.ledgerEntry.groupBy({
      by: ['type', 'direction'],
      where: this.where(scope),
      _sum: { amount: true },
    });

    const totals = computeSellerTotals(grouped as unknown as GroupedLedgerRow[]);

    return {
      grossSales: totals.grossSales,
      commission: totals.commission,
      deliveryCosts: totals.deliveryCosts,
      refunds: totals.refunds,
      netEarnings: totals.netPayable,
      currency: totals.currency,
    };
  }

  /** One seller's entries, newest first. Always filtered to that seller. */
  async listEntries(
    scope: EarningsScope & { page: number; limit: number },
  ): Promise<{ items: Awaited<ReturnType<typeof prisma.ledgerEntry.findMany>>; total: number }> {
    const where = this.where(scope);

    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (scope.page - 1) * scope.limit,
        take: scope.limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return { items, total };
  }

  private where(scope: EarningsScope): Prisma.LedgerEntryWhereInput {
    return {
      // The whole point: an entry belongs to one seller or to nobody.
      vendorId: scope.vendorId,
      ...(scope.from || scope.to
        ? {
            occurredAt: {
              ...(scope.from ? { gte: scope.from } : {}),
              ...(scope.to ? { lt: scope.to } : {}),
            },
          }
        : {}),
    };
  }
}

export const earningsRepository = new EarningsRepository();
