import { Request, Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@celebs/shared-utils';

import {
  EarningsRepository,
  earningsRepository,
  type OrderEarningsItem,
} from './earnings.repository';
import { resolveVendorForRead } from './earnings-scope';

import { sendPaginated, sendSuccess } from '@/common/utils/response.util';
import { Prisma } from '@/config/db.prisma';

/**
 * A seller's earnings: what they sold, what we took, what they keep.
 *
 * Commission is a visible line rather than a discount folded into the gross,
 * because a seller who nets 1,665 with no explanation of the missing 135 will not
 * believe the next figure either.
 *
 * Every amount leaves as an exact string.
 */

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  vendorId: z.string().uuid().optional(),
});

export class EarningsController {
  constructor(private readonly repository: EarningsRepository = earningsRepository) {}

  public summary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = querySchema.parse(req.query);
    const vendorId = resolveVendorForRead(req);

    const summary = await this.repository.summarise({
      vendorId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    sendSuccess(res, {
      summary: {
        grossSales: summary.grossSales.toFixed(2),
        commission: summary.commission.toFixed(2),
        deliveryCosts: summary.deliveryCosts.toFixed(2),
        refunds: summary.refunds.toFixed(2),
        netEarnings: summary.netEarnings.toFixed(2),
        currency: summary.currency,
      },
    });
  });

  public list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = querySchema.parse(req.query);
    const vendorId = resolveVendorForRead(req);

    const { items, total } = await this.repository.listEntries({
      vendorId,
      page: query.page,
      limit: query.limit,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    sendPaginated(
      res,
      items.map(serializeEntry),
      { page: query.page, limit: query.limit, total },
      'Earnings retrieved',
    );
  });

  public orders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = querySchema.parse(req.query);
    const vendorId = resolveVendorForRead(req);

    const { items, total } = await this.repository.listOrderEarnings({
      vendorId,
      page: query.page,
      limit: query.limit,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    sendPaginated(
      res,
      items.map(serializeOrderEarnings),
      { page: query.page, limit: query.limit, total },
      'Order earnings retrieved',
    );
  });
}

function serializeEntry(entry: {
  id: string;
  type: string;
  direction: string;
  amount: Prisma.Decimal;
  currency: string;
  courier: string | null;
  memo: string | null;
  orderId: string | null;
  vendorId: string | null;
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
    vendorId: entry.vendorId,
    occurredAt: entry.occurredAt.toISOString(),
  };
}

function serializeOrderEarnings(item: OrderEarningsItem) {
  return {
    orderId: item.orderId,
    orderNumber: item.orderNumber,
    orderDate: item.orderDate.toISOString(),
    orderStatus: item.orderStatus,
    itemCount: item.itemCount,
    grossSales: item.grossSales.toFixed(2),
    commission: item.commission.toFixed(2),
    vatOnCommission: item.vatOnCommission.toFixed(2),
    netEarnings: item.netEarnings.toFixed(2),
    refunds: item.refunds.toFixed(2),
    refundStatus: item.refundStatus,
    creditNoteAvailable: item.creditNoteAvailable,
    currency: item.currency,
  };
}

export const earningsController = new EarningsController();
