import { Router } from 'express';

import { WishlistController } from './wishlist.controller';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const wishlistRoutes = Router();

// Wishlist is user-only — enforce auth at router level
wishlistRoutes.use(authenticateJWT);

wishlistRoutes.get('/', WishlistController.getWishlist);
wishlistRoutes.post('/', WishlistController.addToWishlist);
wishlistRoutes.delete('/:productId', WishlistController.removeFromWishlist);

export default wishlistRoutes;
