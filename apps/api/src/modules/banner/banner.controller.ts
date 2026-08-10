import { Request, Response, NextFunction } from 'express';
import { BannerService } from './banner.service';
import { HTTPSTATUS, AppError, ErrorCode } from '@celebs/shared-utils';

export class BannerController {
  constructor(private bannerService: BannerService) {}

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
      const bannersData = req.body.banners;
      if (!bannersData || !Array.isArray(bannersData)) {
        throw new AppError(
          'Invalid banners data payload',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }

      const updated = await this.bannerService.updateBanners(bannersData);
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
