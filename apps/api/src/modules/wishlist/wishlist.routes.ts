import { Router } from 'express';

import { asyncHandler } from '@celebs/shared-utils';

import { WishlistController } from './wishlist.controller';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const wishlistRoutes = Router();

// Wishlist is user-only — enforce auth at router level
wishlistRoutes.use(authenticateJWT);

wishlistRoutes.get('/', asyncHandler(WishlistController.getWishlist));
wishlistRoutes.post('/', asyncHandler(WishlistController.addToWishlist));
wishlistRoutes.delete('/:productId', asyncHandler(WishlistController.removeFromWishlist));

export default wishlistRoutes;
