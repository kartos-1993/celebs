import { Request, Response } from 'express';

import { updateBannersSchema } from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { BannerService, bannerService } from './banner.service';

import { sendSuccess } from '@/common/utils/response.util';

export class BannerController {
  private bannerService: BannerService;

  constructor(service: BannerService = bannerService) {
    this.bannerService = service;
  }

  /**
   * Get all active banners (Public)
   */
  getBanners = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.getActiveBanners();
    return sendSuccess(res, banners, 'Active banners retrieved successfully');
  });

  /**
   * Get all banners including inactive (Admin)
   */
  getAllBanners = asyncHandler(async (_req: Request, res: Response) => {
    const banners = await this.bannerService.getAllBanners();
    return sendSuccess(res, banners, 'All banners retrieved successfully');
  });

  /**
   * Update/Replace all banners (Superadmin only)
   */
  updateBanners = asyncHandler(async (req: Request, res: Response) => {
    const validated = updateBannersSchema.parse(req.body);
    const updated = await this.bannerService.updateBanners(validated.banners);
    return sendSuccess(res, updated, 'Banners updated successfully');
  });
}
