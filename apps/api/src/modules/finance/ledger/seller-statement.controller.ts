import { Request, Response } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler, ForbiddenException } from '@celebs/shared-utils';

import {
  type SellerStatementService,
  sellerStatementService,
  serialiseSellerStatement,
} from './seller-statement.service';
import {
  generateSellerStatementSchema,
  listSellerStatementsSchema,
  paySellerStatementSchema,
  statementIdParamSchema,
  voidSellerStatementSchema,
} from './seller-statement.validator';

import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

/**
 * Seller statements: what the platform owes a seller, frozen per period.
 *
 * Thin by design - validate, resolve who is asking, delegate, return the
 * canonical envelope. Every amount leaves as an exact string, because a JSON
 * number rounds a paisa away and these are figures a seller checks against a
 * bank statement.
 *
 * Scoping mirrors the earnings screen: a seller reads their own statements and
 * cannot name another seller; platform finance may read any of them.
 */
export class SellerStatementController {
  constructor(private readonly service: SellerStatementService = sellerStatementService) {}

  /**
   * The vendor a caller may act for, or null when they may act for any.
   *
   * A seller is always pinned to their own store, whatever they pass. Platform
   * finance may name one explicitly. An account with neither is refused here
   * rather than being handed an empty list it would read as "nothing owed".
   */
  private vendorScope(req: Request, requested?: string): string | null {
    const actor = req.actor;
    const storeId = req.store?.id;

    const canReadAny =
      actor?.permissions.includes(Permission.SELLER_STATEMENT_VIEW) &&
      actor?.permissions.includes(Permission.SELLER_STATEMENT_APPROVE);

    if (canReadAny) return requested ?? null;

    if (!storeId) {
      throw new ForbiddenException('This account is not associated with a seller store');
    }

    return storeId;
  }

  private actorId(req: Request): string {
    const id = req.actor?.userId ?? req.user?.id;
    if (!id) {
      throw new ForbiddenException('Authentication required');
    }
    return id;
  }

  public generate = asyncHandler(async (req: Request, res: Response) => {
    const body = generateSellerStatementSchema.parse(req.body);
    const vendorId = this.vendorScope(req, body.vendorId);

    if (!vendorId) {
      throw new ForbiddenException('Name the seller whose statement you want to draft');
    }

    const statement = await this.service.generate({
      vendorId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });

    return sendCreated(res, serialiseSellerStatement(statement), 'Seller statement drafted');
  });

  public list = asyncHandler(async (req: Request, res: Response) => {
    const query = listSellerStatementsSchema.parse(req.query);
    const vendorId = this.vendorScope(req, query.vendorId);

    // A seller has no status filter to offer, but the same shape serves both, so
    // the service is asked for their own rows and nothing else.
    const { items, page, limit } = await this.service.list({
      vendorId: vendorId ?? undefined,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return sendPaginated(
      res,
      items.map(serialiseSellerStatement),
      { page, limit, total: items.length },
      'Seller statements retrieved successfully',
    );
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = statementIdParamSchema.parse(req.params);
    const scope = this.vendorScope(req);

    const statement = await this.service.findForActor(id, scope);

    return sendSuccess(res, serialiseSellerStatement(statement), 'Seller statement retrieved');
  });

  public lock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = statementIdParamSchema.parse(req.params);

    const statement = await this.service.lock(id, this.actorId(req));

    return sendSuccess(res, serialiseSellerStatement(statement), 'Seller statement locked');
  });

  public approve = asyncHandler(async (req: Request, res: Response) => {
    const { id } = statementIdParamSchema.parse(req.params);

    const statement = await this.service.approve(id, this.actorId(req));

    return sendSuccess(res, serialiseSellerStatement(statement), 'Seller statement approved');
  });

  public pay = asyncHandler(async (req: Request, res: Response) => {
    const { id } = statementIdParamSchema.parse(req.params);
    const body = paySellerStatementSchema.parse(req.body);

    const statement = await this.service.markPaid(id, this.actorId(req), body.payoutReference);

    return sendSuccess(res, serialiseSellerStatement(statement), 'Seller statement marked paid');
  });

  public voidStatement = asyncHandler(async (req: Request, res: Response) => {
    const { id } = statementIdParamSchema.parse(req.params);
    const body = voidSellerStatementSchema.parse(req.body ?? {});

    const statement = await this.service.voidStatement(id, this.actorId(req), body.notes);

    return sendSuccess(res, serialiseSellerStatement(statement), 'Seller statement withdrawn');
  });
}

export const sellerStatementController = new SellerStatementController();
