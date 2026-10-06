import { CommissionScope } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';

import { AppError, asyncHandler, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { commissionService } from './commission.service';
import { listPriceForNet, MAX_COMMISSION_PERCENT } from './commission-calculator';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';
import { Prisma } from '@/config/db.prisma';

/**
 * The platform's cut.
 *
 * Rates are Decimal and leave as exact strings, because a rate of 7.5% is
 * multiplied against rupees and a JSON number would put a float in the middle of
 * the one calculation a seller is paid from.
 */

const MONEY = /^\d+(\.\d{1,2})?$/;

/**
 * A rate as sent by an admin: a JSON number or a string, both accepted.
 *
 * Coerced to a string because that is what the Decimal is built from, and a
 * percent of 7.5 and "7.50" must not be treated as different inputs.
 */
const rateInput = z
  .union([z.number(), z.string()])
  .transform(String)
  .refine((value) => MONEY.test(value), 'Rate must be a number with at most two decimals');

const setRateSchema = z.object({
  scope: z.nativeEnum(CommissionScope),
  // Percent to two decimals. Refused above 100% and below zero by the service,
  // because a rate over 100 pays the seller to list.
  ratePercent: rateInput,
  categoryId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  label: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

const quoteQuerySchema = z.object({
  desiredNet: z
    .union([z.number(), z.string()])
    .transform(String)
    .refine(
      (value) => MONEY.test(value),
      'Target amount must be a number with at most two decimals',
    ),
  // Optional: with no rate given, the seller sees the current marketplace rate.
  ratePercent: rateInput.optional(),
});

export class CommissionController {
  public listCurrent = asyncHandler(async (_req: Request, res: Response) => {
    const [current, history] = await Promise.all([
      commissionService.listCurrent(),
      commissionService.listHistory(),
    ]);

    return sendSuccess(res, {
      current: current.map(serializeRule),
      history: history.map(serializeRule),
      maxPercent: MAX_COMMISSION_PERCENT.toFixed(2),
    });
  });

  public listHistory = asyncHandler(async (_req: Request, res: Response) => {
    const history = await commissionService.listHistory();

    return sendSuccess(res, history.map(serializeRule));
  });

  public setRate = asyncHandler(async (req: Request, res: Response) => {
    const body = setRateSchema.parse(req.body);

    const rule = await commissionService.setRate({
      scope: body.scope,
      ratePercent: new Prisma.Decimal(body.ratePercent),
      categoryId: body.categoryId,
      vendorId: body.vendorId,
      label: body.label,
      description: body.description,
      createdBy: req.user?.id,
    });

    return sendCreated(res, serializeRule(rule), 'Commission rate published');
  });

  /**
   * "I want to keep Rs 900" -> "list at Rs 972.97".
   *
   * A seller thinks in what they keep, not in what we take. Making them solve
   * for it themselves is how a commission starts to feel arbitrary.
   *
   * Open to any signed-in user: it reveals nothing but arithmetic, and a seller
   * who cannot see what they will earn before listing will not list.
   */
  public quote = asyncHandler(async (req: Request, res: Response) => {
    const query = quoteQuerySchema.parse(req.query);

    const ratePercent = query.ratePercent
      ? new Prisma.Decimal(query.ratePercent)
      : await commissionService.resolveRatePercent({});

    // listPriceForNet refuses a target of zero and a 100% rate (there is no list
    // price that nets anything), but it throws RangeError because it is also called
    // from a validator that wants a thrown error. Translate at this boundary so a
    // bad request is a 400, not a 500.
    let result: ReturnType<typeof listPriceForNet>;
    try {
      result = listPriceForNet(new Prisma.Decimal(query.desiredNet), ratePercent);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new AppError(error.message, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
      }
      throw error;
    }

    return sendSuccess(res, {
      listPrice: result.listPrice.toFixed(2),
      commission: result.commission.toFixed(2),
      sellerNet: result.sellerNet.toFixed(2),
      ratePercent: ratePercent.toFixed(2),
    });
  });
}

function serializeRule(rule: {
  id: string;
  scope: CommissionScope;
  categoryId: string | null;
  vendorId: string | null;
  ratePercent: Prisma.Decimal;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  label: string | null;
  description: string | null;
}) {
  return {
    id: rule.id,
    scope: rule.scope,
    categoryId: rule.categoryId,
    vendorId: rule.vendorId,
    ratePercent: rule.ratePercent.toFixed(2),
    effectiveFrom: rule.effectiveFrom?.toISOString() ?? null,
    effectiveTo: rule.effectiveTo?.toISOString() ?? null,
    label: rule.label,
    description: rule.description,
  };
}

export const commissionController = new CommissionController();
