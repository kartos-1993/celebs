import { Request, Response } from 'express';

import { addToWishlistSchema } from '@celebs/shared-types';
import { asyncHandler, ErrorCode, logger, UnauthorizedException } from '@celebs/shared-utils';

import { WishlistService } from './wishlist.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

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
      throw new UnauthorizedException(
        'Authentication required',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }
    return user.id;
  }

  static getWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const entries = await WishlistService.getWishlist(userId);
    sendSuccess(res, entries, 'Wishlist retrieved successfully');
  });

  static addToWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const { productId } = addToWishlistSchema.parse(req.body);

    const entry = await WishlistService.addToWishlist(userId, productId);
    sendCreated(res, entry, 'Product added to wishlist');
  });

  static removeFromWishlist = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = WishlistController.getUserId(req);
    const productIdParam = req.params.productId;
    const productId = Array.isArray(productIdParam) ? productIdParam[0] : productIdParam;

    await WishlistService.removeFromWishlist(userId, productId);
    sendSuccess(res, null, 'Product removed from wishlist');
  });
}
