import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  type SellerStatementRecord,
  SellerStatementRepository,
  sellerStatementRepository,
} from './seller-statement.repository';

/**
 * Issuing a seller statement and paying for it.
 *
 * The order is deliberate and is the part marketplaces get right: draft the
 * figures, freeze them, have somebody *else* approve, then pay. Anyone able to
 * skip a step is a person who can pay themselves.
 */
export interface SellerStatementServiceDeps {
  repo?: Partial<SellerStatementRepository>;
}

export class SellerStatementService {
  private repo: SellerStatementRepository;

  constructor(deps: SellerStatementServiceDeps = {}) {
    this.repo = (deps.repo ?? sellerStatementRepository) as SellerStatementRepository;
  }

  /**
   * Drafts a statement for a period from the ledger, or returns the one that
   * already exists for it.
   */
  async generate(input: { vendorId: string; periodStart: Date; periodEnd: Date }) {
    assertPeriod(input.periodStart, input.periodEnd);

    return this.repo.generate(input);
  }

  /**
   * Freezes the figures and issues the statement to the seller.
   *
   * After this, ledger activity dated inside the period cannot alter what the
   * seller has been told they earned. Anything that arrives later belongs to a
   * later statement.
   */
  async lock(statementId: string, actor: string): Promise<SellerStatementRecord> {
    const statement = await this.mustFind(statementId);

    const locked = await this.repo.lock(statementId, actor, new Date());
    if (!locked) {
      throw new AppError(
        `Only a draft statement can be locked; ${statementId} is ${statement.status}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_STATE_TRANSITION,
      );
    }

    return this.mustFind(statementId);
  }

  /**
   * Approves a locked statement for payment.
   *
   * Separation of duties, enforced rather than documented: whoever locked the
   * figures cannot also approve them. One person doing both is the exact case
   * this exists to catch, so it is refused even though both steps are permitted
   * to the same role.
   */
  async approve(statementId: string, actor: string): Promise<SellerStatementRecord> {
    const statement = await this.mustFind(statementId);

    if (statement.lockedBy && statement.lockedBy === actor) {
      throw new AppError(
        'The person who locked this statement cannot also approve it; approval needs a second pair of eyes',
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_STATE_TRANSITION,
      );
    }

    const approved = await this.repo.approve(statementId, actor, new Date());
    if (!approved) {
      throw new AppError(
        `Only a locked statement can be approved; ${statementId} is ${statement.status}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_STATE_TRANSITION,
      );
    }

    return this.mustFind(statementId);
  }

  /** Records that the money has gone out. */
  async markPaid(
    statementId: string,
    actor: string,
    payoutReference: string,
  ): Promise<SellerStatementRecord> {
    const statement = await this.mustFind(statementId);

    const paid = await this.repo.markPaid(statementId, actor, new Date(), payoutReference);
    if (!paid) {
      throw new AppError(
        `Only an approved statement can be paid; ${statementId} is ${statement.status}`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_STATE_TRANSITION,
      );
    }

    return this.mustFind(statementId);
  }

  /** Withdraws a statement before payment. Refused once approved. */
  async voidStatement(statementId: string, actor: string, notes?: string) {
    const statement = await this.mustFind(statementId);

    const voided = await this.repo.voidStatement(statementId, actor, new Date(), notes);
    if (!voided) {
      throw new AppError(
        `A ${statement.status} statement can no longer be withdrawn; approve-then-void is not a path`,
        HTTPSTATUS.CONFLICT,
        ErrorCode.INVALID_STATE_TRANSITION,
      );
    }

    return this.mustFind(statementId);
  }

  /**
   * The statement covering a window, when one has been locked.
   *
   * This is what a seller dashboard reads for a closed period. A DRAFT is not
   * returned: an unissued draft is a work in progress, and showing one as if it
   * were a settled figure is the exact confusion snapshots exist to remove.
   */
  async lockedFor(vendorId: string, periodStart: Date): Promise<SellerStatementRecord | null> {
    const statement = await this.repo.findForPeriod(vendorId, periodStart);
    if (!statement || statement.status === 'DRAFT' || statement.status === 'VOID') return null;
    return statement;
  }

  async list(filters: { vendorId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const items = await this.repo.list({
      vendorId: filters.vendorId,
      status: filters.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, page, limit, total: items.length };
  }

  listForVendor(vendorId: string, take = 50) {
    return this.repo.listForVendor(vendorId, take);
  }

  private async mustFind(statementId: string): Promise<SellerStatementRecord> {
    const statement = await this.repo.findById(statementId);
    if (!statement) {
      throw new AppError(
        `Seller statement not found: ${statementId}`,
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return statement;
  }
}

/** A period that ends before it starts would silently total nothing. */
function assertPeriod(periodStart: Date, periodEnd: Date): void {
  if (periodEnd <= periodStart) {
    throw new AppError(
      'A statement period must end after it starts',
      HTTPSTATUS.BAD_REQUEST,
      ErrorCode.INVALID_REQUEST,
    );
  }
}

export const sellerStatementService = new SellerStatementService();
