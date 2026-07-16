import { NextFunction, Request, Response } from 'express';
import { MobileService } from './mobile.service';
import { HTTPSTATUS } from '@celebs/shared-utils';

export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  getHomeFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categorySlug = (req.query.category as string) || 'men';
      const feed = await this.mobileService.getHomeFeed(categorySlug);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Home feed retrieved successfully',
        data: feed,
      });
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cursor = req.query.cursor as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const categorySlug = req.query.category as string;

      const products = await this.mobileService.getProducts(cursor, limit, categorySlug);

      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Products retrieved successfully',
        data: products,
        nextCursor: products.length === limit ? products[products.length - 1].id : null,
      });
    } catch (error) {
      next(error);
    }
  };
}
