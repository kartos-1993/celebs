import { computeSellerTotals, type GroupedLedgerRow } from '../ledger/seller-totals';
import { calculateNepalCommissionTax } from '../tax/tax-calculator';

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

export interface OrderEarningsItem {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  orderStatus: string;
  itemCount: number;
  grossSales: Prisma.Decimal;
  commission: Prisma.Decimal;
  vatOnCommission: Prisma.Decimal;
  netEarnings: Prisma.Decimal;
  refunds: Prisma.Decimal;
  refundStatus: 'NONE' | 'PARTIAL' | 'FULL';
  creditNoteAvailable: boolean;
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

  /**
   * List order-grouped earnings for a seller with line item isolation,
   * Nepal 13% VAT calculation, and refund accounting.
   */
  async listOrderEarnings(
    scope: EarningsScope & { page: number; limit: number },
  ): Promise<{ items: OrderEarningsItem[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      items: {
        some: { vendorId: scope.vendorId },
      },
      ...(scope.from || scope.to
        ? {
            createdAt: {
              ...(scope.from ? { gte: scope.from } : {}),
              ...(scope.to ? { lt: scope.to } : {}),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          items: {
            where: { vendorId: scope.vendorId },
            select: {
              id: true,
              vendorId: true,
              subtotal: true,
              commissionAmount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (scope.page - 1) * scope.limit,
        take: scope.limit,
      }),
      prisma.order.count({ where }),
    ]);

    const orderIds = orders.map((o) => o.id);
    const ledgerEntries =
      orderIds.length > 0
        ? await prisma.ledgerEntry.findMany({
            where: {
              orderId: { in: orderIds },
              vendorId: scope.vendorId,
              type: { in: ['REFUND', 'COMMISSION'] },
            },
          })
        : [];

    const ledgerByOrder = new Map<string, typeof ledgerEntries>();
    for (const entry of ledgerEntries) {
      if (!entry.orderId) continue;
      const list = ledgerByOrder.get(entry.orderId) ?? [];
      list.push(entry);
      ledgerByOrder.set(entry.orderId, list);
    }

    const items: OrderEarningsItem[] = orders.map((order) => {
      let grossSales = new Prisma.Decimal(0);
      let commission = new Prisma.Decimal(0);

      // Multi-vendor safety: only aggregate items belonging to this vendor
      for (const item of order.items) {
        if (item.vendorId === scope.vendorId) {
          grossSales = grossSales.plus(item.subtotal);
          commission = commission.plus(item.commissionAmount);
        }
      }

      const { vatAmount: vatOnCommission } = calculateNepalCommissionTax(commission);

      const entries = ledgerByOrder.get(order.id) ?? [];
      let refunds = new Prisma.Decimal(0);
      for (const entry of entries) {
        if (entry.type === 'REFUND') {
          if (entry.direction === 'OUT') {
            refunds = refunds.plus(entry.amount);
          } else if (entry.direction === 'IN') {
            refunds = refunds.minus(entry.amount);
          }
        }
      }

      // If full order was refunded and no ledger rows yet (fallback guard)
      if ((order.status === 'RETURNED' || order.paymentStatus === 'REFUNDED') && refunds.isZero()) {
        refunds = grossSales;
      }

      const refundStatus: 'NONE' | 'PARTIAL' | 'FULL' = refunds.isZero()
        ? 'NONE'
        : refunds.gte(grossSales)
          ? 'FULL'
          : 'PARTIAL';

      const netEarnings = grossSales.minus(commission).minus(vatOnCommission).minus(refunds);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        orderStatus: order.status,
        itemCount: order.items.filter((i) => i.vendorId === scope.vendorId).length,
        grossSales,
        commission,
        vatOnCommission,
        netEarnings,
        refunds,
        refundStatus,
        creditNoteAvailable: !refunds.isZero(),
        currency: 'NPR',
      };
    });

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
