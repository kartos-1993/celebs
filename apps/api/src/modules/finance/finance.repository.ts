import { Prisma } from '@prisma/client';

import prisma from '@/config/db.prisma';

export interface LedgerQuery {
  page: number;
  limit: number;
  courier?: string;
  type?: string;
  from?: Date;
  to?: Date;
}

export class FinanceRepository {
  async listLedgerEntries(query: LedgerQuery) {
    const where: Prisma.LedgerEntryWhereInput = {
      ...(query.courier ? { courier: query.courier } : {}),
      ...(query.type ? { type: query.type as Prisma.EnumLedgerEntryTypeFilter['equals'] } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lt: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return { items, total };
  }

  async listSettlementBatches(page: number, limit: number, courier?: string) {
    const where: Prisma.SettlementBatchWhereInput = courier ? { courier } : {};

    const [items, total] = await Promise.all([
      prisma.settlementBatch.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.settlementBatch.count({ where }),
    ]);

    return { items, total };
  }

  /** Decimals rendered as exact strings so a paisa is not lost in a JSON number. */
  static serialiseEntry(entry: {
    id: string;
    type: string;
    direction: string;
    amount: Prisma.Decimal;
    currency: string;
    courier: string | null;
    memo: string | null;
    orderId: string | null;
    occurredAt: Date;
  }) {
    return {
      id: entry.id,
      type: entry.type,
      direction: entry.direction,
      amount: entry.amount.toFixed(2),
      currency: entry.currency,
      courier: entry.courier,
      memo: entry.memo,
      orderId: entry.orderId,
      occurredAt: entry.occurredAt.toISOString(),
    };
  }

  static serialiseBatch(batch: {
    id: string;
    courier: string;
    status: string;
    periodStart: Date;
    periodEnd: Date;
    expectedCollected: Prisma.Decimal;
    expectedFees: Prisma.Decimal;
    declaredCollected: Prisma.Decimal;
    declaredFees: Prisma.Decimal;
    variance: Prisma.Decimal;
    reference: string | null;
    notes: string | null;
    reconciledAt: Date | null;
    paidAt: Date | null;
  }) {
    return {
      id: batch.id,
      courier: batch.courier,
      status: batch.status,
      periodStart: batch.periodStart.toISOString(),
      periodEnd: batch.periodEnd.toISOString(),
      expectedCollected: batch.expectedCollected.toFixed(2),
      expectedFees: batch.expectedFees.toFixed(2),
      declaredCollected: batch.declaredCollected.toFixed(2),
      declaredFees: batch.declaredFees.toFixed(2),
      variance: batch.variance.toFixed(2),
      reference: batch.reference,
      notes: batch.notes,
      reconciledAt: batch.reconciledAt?.toISOString() ?? null,
      paidAt: batch.paidAt?.toISOString() ?? null,
    };
  }
}

export const financeRepository = new FinanceRepository();
