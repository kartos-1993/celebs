import { NextFunction, Request, Response } from 'express';

import { updateBannersSchema } from '@celebs/shared-types';
import { HTTPSTATUS } from '@celebs/shared-utils';

import { BannerService, bannerService } from './banner.service';

export class BannerController {
  private bannerService: BannerService;

  constructor(service: BannerService = bannerService) {
    this.bannerService = service;
  }

  /**
   * Get all active banners (Public)
   */
  getBanners = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const banners = await this.bannerService.getActiveBanners();
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Active banners retrieved successfully',
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all banners including inactive (Admin)
   */
  getAllBanners = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const banners = await this.bannerService.getAllBanners();
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'All banners retrieved successfully',
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update/Replace all banners (Superadmin only)
   */
  updateBanners = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateBannersSchema.parse(req.body);
      const updated = await this.bannerService.updateBanners(validated.banners);
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Banners updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
