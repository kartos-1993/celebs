import { Request, Response } from 'express';
import { z } from 'zod';

import { asyncHandler } from '@celebs/shared-utils';

import { PlatformFinanceService, platformFinanceService } from './platform-finance.service';

import { sendPaginated, sendSuccess } from '@/common/utils/response.util';

const overviewQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const sellersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).optional(),
});

export class PlatformFinanceController {
  constructor(private readonly service: PlatformFinanceService = platformFinanceService) {}

  public getOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = overviewQuerySchema.parse(req.query);

    const overview = await this.service.getOverview({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    sendSuccess(res, overview, 'Platform overview financial metrics retrieved');
  });

  public listSellers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = sellersQuerySchema.parse(req.query);

    const { items, total } = await this.service.listSellers({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });

    sendPaginated(
      res,
      items,
      { page: query.page, limit: query.limit, total },
      'Seller remittance directory retrieved',
    );
  });
}

export const platformFinanceController = new PlatformFinanceController();
