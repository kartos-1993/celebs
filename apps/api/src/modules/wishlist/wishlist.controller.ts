import { Request, Response } from 'express';

import { addToWishlistSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { WishlistService } from './wishlist.service';

interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export class WishlistController {
  private static getUserId(req: Request): string {
    const user = req.user as AuthUser | undefined;
    if (!user?.id) {
      logger.error('[WishlistController] Missing authenticated user id');
      throw new Error('Authentication required');
    }
    return user.id;
  }

  static getWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const entries = await WishlistService.getWishlist(userId);

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: entries,
    });
  });

  static addToWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const { productId } = addToWishlistSchema.parse(req.body);

    const entry = await WishlistService.addToWishlist(userId, productId);

    res.status(HTTPSTATUS.CREATED).json({
      success: true,
      message: 'Product added to wishlist',
      data: entry,
    });
  });

  static removeFromWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const productIdParam = req.params.productId;
    const productId = Array.isArray(productIdParam) ? productIdParam[0] : productIdParam;

    await WishlistService.removeFromWishlist(userId, productId);

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Product removed from wishlist',
    });
  });
}
