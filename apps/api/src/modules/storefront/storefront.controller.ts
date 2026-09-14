import type { Request, Response } from 'express';

import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { StorefrontService, storefrontService } from './storefront.service';

import { sendSuccess } from '@/common/utils/response.util';

export class StorefrontController {
  constructor(private readonly service: StorefrontService = storefrontService) {}

  getHomeComposite = asyncHandler(async (_req: Request, res: Response) => {
    const layout = await this.service.getHomeComposite();
    sendSuccess(
      res,
      layout,
      'Storefront composite home layout fetched successfully',
      HTTPSTATUS.OK,
    );
  });
}

export const storefrontController = new StorefrontController();
