import { Router } from 'express';

import { CartController } from './cart.controller';

import { authenticateJWT, optionalAuthenticateJWT } from '@/common/strategies/jwt.strategy';

const cartRoutes = Router();

// Public / Guest / Logged-in Cart routes (uses optional JWT auth)
cartRoutes.get('/', optionalAuthenticateJWT, CartController.getCart);
cartRoutes.post('/items', optionalAuthenticateJWT, CartController.addToCart);
cartRoutes.patch('/items/:itemId', optionalAuthenticateJWT, CartController.updateCartItem);
cartRoutes.delete('/items/:itemId', optionalAuthenticateJWT, CartController.removeCartItem);
cartRoutes.delete('/', optionalAuthenticateJWT, CartController.clearCart);

// User-enforced Cart Sync route
cartRoutes.post('/sync', authenticateJWT, CartController.syncCart);

export default cartRoutes;
