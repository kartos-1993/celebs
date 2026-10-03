import { LedgerDirection, LedgerEntryType, SettlementBatchStatus } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { isAboveZero } from '../ledger/decimal';
import { LedgerService, ledgerService } from '../ledger/ledger.service';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Comparing a courier's statement to our own books.
 *
 * A statement is a claim, and this is what holds it against the records. The
 * expectation is computed rather than typed in: what our orders say was owed to be
 * collected, and what the ledger says a courier charged. Hand-entered expectations
 * drift towards agreeing with the courier, which defeats the comparison entirely.
 *
 * Both figures are kept rather than only a difference. A variance with nothing to
 * explain it cannot be argued about, and arguing with a courier about money is the
 * only reason this exists.
 */

export interface OpenBatchInput {
  courier: string;
  periodStart: Date;
  periodEnd: Date;
  reference?: string;
}

export interface RecordStatementInput {
  batchId: string;
  declaredCollected: Prisma.Decimal | number;
  declaredFees: Prisma.Decimal | number;
  reference?: string;
  notes?: string;
}

/**
 * What a settlement may legally become next.
 *
 * Explicit rather than inferred from "is this a known status": a settlement only
 * ever moves forward one step, and PAID is only reachable from RECONCILED. This is
 * what stops a single request that records a statement and asks for PAID from
 * skipping the reconciliation step that exists to catch a discrepancy.
 */
const ALLOWED_TRANSITIONS: Record<SettlementBatchStatus, readonly SettlementBatchStatus[]> = {
  [SettlementBatchStatus.OPEN]: [SettlementBatchStatus.RECONCILED],
  [SettlementBatchStatus.RECONCILED]: [SettlementBatchStatus.PAID],
  [SettlementBatchStatus.PAID]: [],
};

export interface UpdateBatchInput {
  batchId: string;
  /** A statement, if the courier has sent one. */
  declaredCollected?: Prisma.Decimal | number;
  declaredFees?: Prisma.Decimal | number;
  reference?: string;
  notes?: string;
  /** A requested transition, applied only if it is legal from the current status. */
  status?: SettlementBatchStatus;
  actor: string;
}

export class SettlementService {
  constructor(private readonly ledger: LedgerService = ledgerService) {}

  /**
   * Opens the batch for a courier and period, working out what we expect.
   *
   * Returns the existing batch if one is already open for that courier and period
   * start, so a double click cannot produce two competing expectations for the
   * same money and turn the variance into a comparison of a statement with itself.
   */
  async openBatch(input: OpenBatchInput) {
    const existing = await prisma.settlementBatch.findUnique({
      where: { courier_periodStart: { courier: input.courier, periodStart: input.periodStart } },
    });

    if (existing) return existing;

    const [expectedCollected, expectedFees] = await Promise.all([
      this.expectedCollection(input.periodStart, input.periodEnd),
      this.ledger.courierFeesBetween(input.courier, input.periodStart, input.periodEnd),
    ]);

    return prisma.settlementBatch.create({
      data: {
        courier: input.courier,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        expectedCollected,
        expectedFees,
        reference: input.reference,
      },
    });
  }

  /**
   * What our orders say a courier should have collected in the period.
   *
   * Read from the orders rather than the ledger on purpose: the ledger records what
   * the courier actually remitted, which is the other side of this comparison.
   * Deriving the expectation from the thing being checked would make the variance
   * always zero.
   */
  private async expectedCollection(periodStart: Date, periodEnd: Date): Promise<Prisma.Decimal> {
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'COD',
        codSettledAt: { gte: periodStart, lt: periodEnd },
      },
      select: { codAmount: true },
    });

    return orders.reduce(
      (total, order) => total.plus(order.codAmount ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );
  }

  /**
   * Records what the courier's statement says and works out the variance.
   *
   * Variance is what we are left with, not what was collected: a courier who
   * collected less *and* charged more fees is two different problems, and only
   * the net number decides what changes hands.
   */
  async recordStatement(input: RecordStatementInput) {
    const batch = await this.mustFind(input.batchId);

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new AppError(
        `Settlement batch is already ${batch.status}; a statement cannot change it`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const declaredCollected = new Prisma.Decimal(input.declaredCollected);
    const declaredFees = new Prisma.Decimal(input.declaredFees);

    const declaredNet = declaredCollected.minus(declaredFees);
    const expectedNet = batch.expectedCollected.minus(batch.expectedFees);
    const variance = declaredNet.minus(expectedNet);

    return prisma.settlementBatch.update({
      where: { id: batch.id },
      data: {
        declaredCollected,
        declaredFees,
        variance,
        reference: input.reference ?? batch.reference,
        notes: input.notes ?? batch.notes,
        declaredAt: batch.declaredAt ?? new Date(),
      },
    });
  }

  /**
   * The single entry point for changing a batch: a statement, a transition, or both.
   *
   * The transition is checked against the status the batch held when the request
   * arrived, not the one it will hold once the statement has been written. That is
   * deliberate: it means a request cannot slip a payment past reconciliation by
   * carrying its own statement along with it, which is the only way a caller could
   * otherwise reach PAID without ever comparing a courier's figures to ours.
   */
  async update(input: UpdateBatchInput) {
    const before = await this.mustFind(input.batchId);

    if (input.status && !ALLOWED_TRANSITIONS[before.status].includes(input.status)) {
      throw new AppError(
        `A settlement cannot move from ${before.status} to ${input.status}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const hasStatement =
      input.declaredCollected !== undefined ||
      input.declaredFees !== undefined ||
      input.reference !== undefined ||
      input.notes !== undefined;

    let batch = before;

    if (hasStatement) {
      // Both figures are required together: half a statement is not a statement,
      // and defaulting the missing half to zero would invent a claim.
      if (input.declaredCollected === undefined || input.declaredFees === undefined) {
        throw new AppError(
          'A statement needs both the collected amount and the fees charged',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }

      batch = await this.recordStatement({
        batchId: input.batchId,
        declaredCollected: input.declaredCollected,
        declaredFees: input.declaredFees,
        reference: input.reference,
        notes: input.notes,
      });
    }

    if (!input.status) return batch;

    if (input.status === SettlementBatchStatus.RECONCILED) {
      return this.reconcile({ batchId: input.batchId, reconciledBy: input.actor });
    }

    return this.markPaid({ batchId: input.batchId, paidBy: input.actor });
  }

  async reconcile(input: { batchId: string; reconciledBy: string }) {
    const batch = await this.mustFind(input.batchId);

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new AppError(
        `Settlement batch is already ${batch.status}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Judged on declaredAt, not on the money columns. Both default to zero, so a
    // declared zero and an unheard-from courier look identical if you read the
    // figures - and paying the first is legitimate, while paying the second is not.
    if (batch.declaredAt === null) {
      throw new AppError(
        'Record the courier statement before reconciling it',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    return prisma.settlementBatch.update({
      where: { id: batch.id },
      data: {
        status: SettlementBatchStatus.RECONCILED,
        reconciledAt: new Date(),
        reconciledBy: input.reconciledBy,
      },
    });
  }

  /**
   * Pays what the statement said is owed, and records that payment.
   *
   * The figure posted is the courier's own net, not our expectation. When the two
   * disagree, what actually leaves the bank is what they declared, and recording
   * our hoped-for figure would leave the books disagreeing with the bank.
   */
  async markPaid(input: { batchId: string; paidBy: string }) {
    const batch = await this.mustFind(input.batchId);

    if (batch.status !== SettlementBatchStatus.RECONCILED) {
      throw new AppError(
        `A settlement batch must be reconciled before it is paid (currently ${batch.status})`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const owedToCourier = batch.declaredCollected.minus(batch.declaredFees);

    if (isAboveZero(owedToCourier)) {
      await this.ledger.post({
        type: LedgerEntryType.COURIER_PAYMENT,
        direction: LedgerDirection.OUT,
        amount: owedToCourier,
        courier: batch.courier,
        sourceType: 'SETTLEMENT',
        sourceId: batch.id,
        settlementBatchId: batch.id,
        memo: `Settled courier statement for ${batch.periodStart.toISOString().slice(0, 10)}`,
      });
    }

    return prisma.settlementBatch.update({
      where: { id: batch.id },
      data: { status: SettlementBatchStatus.PAID, paidAt: new Date(), paidBy: input.paidBy },
    });
  }

  private async mustFind(batchId: string) {
    const batch = await prisma.settlementBatch.findUnique({ where: { id: batchId } });

    if (!batch) {
      throw new AppError(
        'Settlement batch not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return batch;
  }
}

export const settlementService = new SettlementService();
