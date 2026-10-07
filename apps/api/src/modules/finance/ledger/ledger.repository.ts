import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export class LedgerRepository {
  /**
   * Adds one entry, or returns the one that is already there.
   *
   * Idempotency is the database's job. The unique index on
   * (sourceType, sourceId, type) means a replayed webhook or a retried admin
   * action cannot produce a second line, and a read-then-write guard in this
   * method would lose to two concurrent arrivals anyway.
   *
   * On a collision the amount is verified rather than assumed: if the same source
   * somehow arrives with a different figure that is a bug upstream, and silently
   * keeping the first would hide it.
   */
  async postOrGet(
    data: {
      type: LedgerEntryType;
      direction: LedgerDirection;
      amount: Prisma.Decimal;
      courier?: string;
      vendorId?: string;
      sourceType: string;
      sourceId: string;
      orderId?: string;
      settlementBatchId?: string;
      memo?: string;
      occurredAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const values = {
      type: data.type,
      direction: data.direction,
      amount: data.amount,
      courier: data.courier ?? null,
      vendorId: data.vendorId ?? null,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      orderId: data.orderId ?? null,
      settlementBatchId: data.settlementBatchId ?? null,
      memo: data.memo ?? null,
      occurredAt: data.occurredAt ?? new Date(),
    };

    const client = tx ?? prisma;

    const created = await client.ledgerEntry.createMany({ data: [values], skipDuplicates: true });

    const entry = await client.ledgerEntry.findUniqueOrThrow({
      where: {
        sourceType_sourceId_type: {
          sourceType: data.sourceType,
          sourceId: data.sourceId,
          type: data.type,
        },
      },
    });

    if (created.count === 0 && !entry.amount.equals(data.amount)) {
      throw new Error(
        `Ledger entry ${data.sourceType}/${data.sourceId}/${String(data.type)} already exists at ${entry.amount.toFixed(2)}; refused to record ${data.amount.toFixed(2)}`,
      );
    }

    return entry;
  }

  /**
   * Net movement for one order: money in minus money out.
   *
   * Amounts are stored unsigned, so the direction is what makes the sign.
   */
  async netForOrder(orderId: string): Promise<Prisma.Decimal> {
    const grouped = await prisma.ledgerEntry.groupBy({
      by: ['direction'],
      where: { orderId },
      _sum: { amount: true },
    });

    const sumFor = (direction: LedgerDirection) =>
      grouped.find((row) => row.direction === direction)?._sum.amount ?? new Prisma.Decimal(0);

    return sumFor(LedgerDirection.IN).minus(sumFor(LedgerDirection.OUT));
  }

  /** What one courier charged us between two moments, as a positive figure. */
  async courierFeesBetween(courier: string, from: Date, to: Date): Promise<Prisma.Decimal> {
    const result = await prisma.ledgerEntry.aggregate({
      where: {
        courier,
        direction: LedgerDirection.OUT,
        occurredAt: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }
}

export const ledgerRepository = new LedgerRepository();
