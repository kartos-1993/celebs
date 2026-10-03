import { Request, Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@celebs/shared-utils';

import { type FinanceService, financeService } from './finance.service';

import { sendCreated, sendPaginated, sendSuccess } from '@/common/utils/response.util';

/**
 * Reading the books, and acting on a courier's statement.
 *
 * Thin by design: validate, delegate, return the canonical envelope. Every amount
 * leaves as an exact string, because a JSON number rounds a paisa away and these
 * are figures an accountant copies into a spreadsheet.
 */

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  courier: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const batchIdParamSchema = z.object({
  id: z.string().uuid('Invalid settlement batch ID'),
});

const openBatchSchema = z
  .object({
    courier: z.string().trim().min(1).max(64),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
  })
  .refine((body) => new Date(body.periodEnd) > new Date(body.periodStart), {
    message: 'Settlement period must end after it starts',
    path: ['periodEnd'],
  });

/**
 * Only the two forward moves are offered. Listing the statuses a client cannot
 * request is the cheapest way to stop the API accepting a transition the state
 * machine would refuse anyway.
 */
const FORWARD_STATUSES = ['RECONCILED', 'PAID'] as const;

/**
 * Declared figures are refused rather than clamped.
 *
 * A negative collection or a negative fee is not a statement, it is a mistyped
 * one, and quietly taking its absolute value would produce a variance that looks
 * real and is not.
 */
const updateBatchSchema = z
  .object({
    declaredCollected: z
      .number()
      .finite()
      .nonnegative('Declared collection cannot be negative')
      .optional(),
    declaredFees: z.number().finite().nonnegative('Declared fees cannot be negative').optional(),
    reference: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: z.enum(FORWARD_STATUSES).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send the statement, the new status, or both',
  });

export class FinanceController {
  constructor(private readonly service: FinanceService = financeService) {}

  public listLedger = asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.parse(req.query);

    const result = await this.service.listLedger({
      page: query.page,
      limit: query.limit,
      courier: query.courier,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Ledger entries retrieved',
    );
  });

  public listSettlements = asyncHandler(async (req: Request, res: Response) => {
    const query = listQuerySchema.pick({ page: true, limit: true, courier: true }).parse(req.query);

    const result = await this.service.listSettlements({
      page: query.page,
      limit: query.limit,
      courier: query.courier,
    });

    return sendPaginated(
      res,
      result.items,
      { page: result.page, limit: result.limit, total: result.total },
      'Settlement batches retrieved',
    );
  });

  public openBatch = asyncHandler(async (req: Request, res: Response) => {
    const body = openBatchSchema.parse(req.body);

    const batch = await this.service.openBatch({
      courier: body.courier,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });

    return sendCreated(res, batch, 'Settlement batch opened');
  });

  public updateBatch = asyncHandler(async (req: Request, res: Response) => {
    const { id } = batchIdParamSchema.parse(req.params);
    const body = updateBatchSchema.parse(req.body);

    const batch = await this.service.updateBatch({
      batchId: id,
      declaredCollected: body.declaredCollected,
      declaredFees: body.declaredFees,
      reference: body.reference,
      notes: body.notes,
      status: body.status,
      actor: req.user?.id ?? 'unknown',
    });

    return sendSuccess(res, batch, 'Settlement updated');
  });
}

export const financeController = new FinanceController();
