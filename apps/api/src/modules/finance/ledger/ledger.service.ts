import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { isBelowZero, isExactlyZero } from './decimal';
import { LedgerRepository, ledgerRepository } from './ledger.repository';

import { Prisma } from '@/config/db.prisma';

/**
 * Every movement of money, recorded once and never edited.
 *
 * Two rules are enforced here rather than trusted to callers:
 *
 * Amounts are never negative. A `-80` is ambiguous between money leaving and a
 * typo, and that ambiguity survives an audit. The sign is carried by `direction`,
 * so every amount in the table is a magnitude somebody can read out loud.
 *
 * A courier cost must say which courier. Without that, "what did Pathao cost us"
 * cannot be answered at all, which is the first question this table exists for.
 */

export interface PostLedgerEntryInput {
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: Prisma.Decimal | number | string;
  courier?: string;
  /** The seller this money belongs to. Null on platform-level entries. */
  vendorId?: string;
  sourceType: string;
  sourceId: string;
  orderId?: string;
  settlementBatchId?: string;
  memo?: string;
  occurredAt?: Date;
}

/** Entry types that represent a charge by a courier, and so need one named. */
const COURIER_COST_TYPES: ReadonlySet<LedgerEntryType> = new Set([
  LedgerEntryType.COURIER_DELIVERY_FEE,
  LedgerEntryType.COURIER_COD_FEE,
  LedgerEntryType.COURIER_RETURN_FEE,
  LedgerEntryType.COURIER_PAYMENT,
]);

export class LedgerService {
  constructor(private readonly repo: LedgerRepository = ledgerRepository) {}

  async post(input: PostLedgerEntryInput, tx?: Prisma.TransactionClient) {
    const amount = new Prisma.Decimal(input.amount);

    if (isBelowZero(amount)) {
      throw new AppError(
        `Ledger amount cannot be negative (got ${amount.toFixed(2)}); use a direction of OUT instead`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (isExactlyZero(amount)) {
      throw new AppError(
        'A zero ledger entry records nothing and would look like a real movement',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (COURIER_COST_TYPES.has(input.type) && !input.courier) {
      throw new AppError(
        `Ledger entry ${input.type} must name the courier it concerns`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    return this.repo.postOrGet(
      {
        type: input.type,
        direction: input.direction,
        amount,
        courier: input.courier,
        vendorId: input.vendorId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        orderId: input.orderId,
        settlementBatchId: input.settlementBatchId,
        memo: input.memo,
        occurredAt: input.occurredAt,
      },
      tx,
    );
  }

  /** What an order took in, minus what it cost. Negative means it lost money. */
  async netForOrder(orderId: string): Promise<Prisma.Decimal> {
    return this.repo.netForOrder(orderId);
  }

  /** What one courier charged between two moments. */
  async courierFeesBetween(courier: string, from: Date, to: Date): Promise<Prisma.Decimal> {
    return this.repo.courierFeesBetween(courier, from, to);
  }

  /** Order lookup for posting. */
  async findOrderForPosting(orderId: string) {
    return this.repo.findOrderForPosting(orderId);
  }

  /** Order line items lookup for posting. */
  async findOrderItemsForPosting(orderId: string) {
    return this.repo.findOrderItemsForPosting(orderId);
  }
}

export const ledgerService = new LedgerService();
