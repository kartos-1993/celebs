import { SellerStatementStatus } from '@prisma/client';

import {
  computeSellerTotals,
  type GroupedLedgerRow,
  periodWindow,
  type SellerTotals,
} from './seller-totals';

import prisma, { Prisma } from '@/config/db.prisma';

export type SellerStatementRecord = Prisma.SellerStatementGetPayload<object>;

export interface GenerateSellerStatementData {
  vendorId: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Seller statements: frozen periods, and the ledger totals behind them.
 *
 * Every transition is a compare-and-swap rather than a read-then-write. Two
 * operators acting on the same statement at the same time must not both succeed,
 * and a check in application code cannot prevent that the way `updateMany` with
 * the status in its `where` clause does.
 */
export class SellerStatementRepository {
  /**
   * One seller's totals over a window, straight from the ledger.
   *
   * Serves both the live dashboard and the snapshot generator, which is the
   * point: one arithmetic, so a seller cannot be shown two different totals for
   * the same period depending on which screen they looked at.
   */
  async totalsFor(vendorId: string, periodStart: Date, periodEnd: Date): Promise<SellerTotals> {
    const grouped = await prisma.ledgerEntry.groupBy({
      by: ['type', 'direction'],
      where: { vendorId, ...periodWindow(periodStart, periodEnd) },
      _sum: { amount: true },
    });

    return computeSellerTotals(grouped as unknown as GroupedLedgerRow[]);
  }

  /**
   * The draft for a period, or a new one carrying the current totals.
   *
   * Idempotent by the unique on (vendor, periodStart): generating twice returns
   * the same statement rather than a second, competing assertion about the same
   * money. Deliberately not an upsert - a second call must not silently rewrite
   * the figures of a statement somebody may already have locked.
   */
  async generate(data: GenerateSellerStatementData): Promise<SellerStatementRecord> {
    const existing = await this.findForPeriod(data.vendorId, data.periodStart);
    if (existing) return existing;

    const totals = await this.totalsFor(data.vendorId, data.periodStart, data.periodEnd);

    return prisma.sellerStatement.create({
      data: {
        vendorId: data.vendorId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        status: 'DRAFT',
        grossSales: totals.grossSales,
        commission: totals.commission,
        refunds: totals.refunds,
        deliveryCosts: totals.deliveryCosts,
        netPayable: totals.netPayable,
      },
    });
  }

  findById(id: string): Promise<SellerStatementRecord | null> {
    return prisma.sellerStatement.findUnique({ where: { id } });
  }

  findForPeriod(vendorId: string, periodStart: Date): Promise<SellerStatementRecord | null> {
    return prisma.sellerStatement.findUnique({
      where: { vendorId_periodStart: { vendorId, periodStart } },
    });
  }

  /** Platform view: every statement, newest period first. */
  list(filters: { vendorId?: string; status?: string; skip?: number; take?: number } = {}) {
    return prisma.sellerStatement.findMany({
      where: {
        ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
        ...(filters.status ? { status: filters.status as unknown as SellerStatementStatus } : {}),
      },
      orderBy: [{ periodStart: 'desc' }, { vendorId: 'asc' }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 50,
    });
  }

  /** A seller's own history, newest first. */
  listForVendor(vendorId: string, take = 50): Promise<SellerStatementRecord[]> {
    return prisma.sellerStatement.findMany({
      where: { vendorId },
      orderBy: { periodEnd: 'desc' },
      take,
    });
  }

  /**
   * DRAFT -> LOCKED. The figures stop moving here.
   *
   * The status is in the `where` so a concurrent second locker gets false rather
   * than overwriting the first one's name and timestamp.
   */
  async lock(id: string, lockedBy: string, lockedAt: Date): Promise<boolean> {
    const result = await prisma.sellerStatement.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'LOCKED', lockedBy, lockedAt },
    });
    return result.count > 0;
  }

  /** LOCKED -> APPROVED. Only ever called once the caller has cleared dual control. */
  async approve(id: string, approvedBy: string, approvedAt: Date): Promise<boolean> {
    const result = await prisma.sellerStatement.updateMany({
      where: { id, status: 'LOCKED' },
      data: { status: 'APPROVED', approvedBy, approvedAt },
    });
    return result.count > 0;
  }

  /** APPROVED -> PAID. The money has left. */
  async markPaid(
    id: string,
    paidBy: string,
    paidAt: Date,
    payoutReference: string,
  ): Promise<boolean> {
    const result = await prisma.sellerStatement.updateMany({
      where: { id, status: 'APPROVED' },
      data: { status: 'PAID', paidBy, paidAt, payoutReference },
    });
    return result.count > 0;
  }

  /** DRAFT or LOCKED -> VOID. Refused once approved, because money is committed. */
  async voidStatement(
    id: string,
    voidedBy: string,
    voidedAt: Date,
    notes?: string,
  ): Promise<boolean> {
    const result = await prisma.sellerStatement.updateMany({
      where: { id, status: { in: ['DRAFT', 'LOCKED'] } },
      data: { status: 'VOID', voidedBy, voidedAt, ...(notes ? { notes } : {}) },
    });
    return result.count > 0;
  }
}

export const sellerStatementRepository = new SellerStatementRepository();
