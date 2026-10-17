import { SettlementBatchStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Data required to open a new settlement batch.
 */
export interface CreateSettlementBatchData {
  courier: string;
  periodStart: Date;
  periodEnd: Date;
  expectedCollected: Prisma.Decimal;
  expectedFees: Prisma.Decimal;
  reference?: string | null;
}

/**
 * Data recorded from a courier's received statement.
 */
export interface UpdateStatementData {
  declaredCollected: Prisma.Decimal;
  declaredFees: Prisma.Decimal;
  variance: Prisma.Decimal;
  reference?: string | null;
  notes?: string | null;
  declaredAt: Date;
}

/**
 * Repository encapsulating database access for courier settlement batches.
 *
 * Gate 9 Compliance: Every entity model accessed by services MUST have a dedicated
 * Repository. Domain services never call prisma.* or raw queries directly.
 *
 * Concurrency & CAS:
 * Status transitions (OPEN -> RECONCILED -> PAID) are implemented via atomic
 * Compare-And-Swap (updateMany with status guard) inside bounded transactions.
 * This completely prevents concurrent requests from double-paying or bypassing
 * reconciliation.
 */
export class SettlementRepository {
  /**
   * Finds a unique settlement batch by courier and periodStart.
   */
  public async findByCourierAndPeriod(
    courier: string,
    periodStart: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.settlementBatch.findUnique({
      where: {
        courier_periodStart: {
          courier,
          periodStart,
        },
      },
    });
  }

  /**
   * Creates a new settlement batch.
   */
  public async createBatch(data: CreateSettlementBatchData, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settlementBatch.create({
      data: {
        courier: data.courier,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        expectedCollected: data.expectedCollected,
        expectedFees: data.expectedFees,
        reference: data.reference,
      },
    });
  }

  /**
   * Finds settled COD orders within a billing period for computing expected collections.
   */
  public async findExpectedCodOrders(
    periodStart: Date,
    periodEnd: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.order.findMany({
      where: {
        paymentMethod: 'COD',
        codSettledAt: { gte: periodStart, lt: periodEnd },
      },
      select: { codAmount: true },
    });
  }

  /**
   * Finds a settlement batch by its unique ID.
   */
  public async findBatchById(batchId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.settlementBatch.findUnique({
      where: { id: batchId },
    });
  }

  /**
   * Updates statement amounts and calculated variance on an open batch.
   */
  public async updateStatement(
    batchId: string,
    data: UpdateStatementData,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.settlementBatch.update({
      where: { id: batchId },
      data: {
        declaredCollected: data.declaredCollected,
        declaredFees: data.declaredFees,
        variance: data.variance,
        reference: data.reference,
        notes: data.notes,
        declaredAt: data.declaredAt,
      },
    });
  }

  /**
   * Atomic Compare-And-Swap (CAS) transition from OPEN to RECONCILED.
   *
   * Returns true if successfully transitioned, false if the batch was not OPEN
   * or had not yet received a statement.
   */
  public async atomicReconcile(
    batchId: string,
    reconciledBy: string,
    reconciledAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const result = await client.settlementBatch.updateMany({
      where: {
        id: batchId,
        status: SettlementBatchStatus.OPEN,
        declaredAt: { not: null },
      },
      data: {
        status: SettlementBatchStatus.RECONCILED,
        reconciledAt,
        reconciledBy,
      },
    });
    return result.count > 0;
  }

  /**
   * Atomic Compare-And-Swap (CAS) transition from RECONCILED to PAID.
   *
   * Returns true if successfully transitioned, false if the batch was not in RECONCILED state.
   * This completely prevents concurrent requests from double-paying the courier.
   */
  public async atomicMarkPaid(
    batchId: string,
    paidBy: string,
    paidAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const result = await client.settlementBatch.updateMany({
      where: {
        id: batchId,
        status: SettlementBatchStatus.RECONCILED,
      },
      data: {
        status: SettlementBatchStatus.PAID,
        paidAt,
        paidBy,
      },
    });
    return result.count > 0;
  }
}

export const settlementRepository = new SettlementRepository();
