import { Request, Response } from 'express';
import { asyncHandler, HTTPSTATUS, logger } from '@celebs/shared-utils';
import {
  addToCartSchema,
  updateCartItemSchema,
  syncCartSchema,
} from '@celebs/shared-types';
import { CartService } from './cart.service';

interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export class CartController {
  private static getIdentifiers(req: Request): { userId?: string; sessionId?: string } {
    const user = req.user as AuthUser | undefined;
    const userId = user?.id;

    const sessionIdHeader = req.headers['x-session-id'];
    let sessionId: string | undefined;

    if (typeof sessionIdHeader === 'string') {
      sessionId = sessionIdHeader;
    } else if (Array.isArray(sessionIdHeader) && sessionIdHeader.length > 0) {
      sessionId = sessionIdHeader[0];
    } else if (req.cookies && typeof req.cookies.sessionId === 'string') {
      sessionId = req.cookies.sessionId;
    }

    if (!userId && !sessionId) {
      // Fallback session identifier for guest browsing if header missing
      sessionId = 'guest-session-default';
    }

    return { userId, sessionId };
  }

  static getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.getIdentifiers(req);
    logger.info({ userId, sessionId }, '[CartController.getCart] Fetching cart');
    const cart = await CartService.getCart(userId, sessionId);

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart retrieved successfully',
      data: cart,
    });
  });

  static addToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.getIdentifiers(req);
    logger.info({ userId, sessionId, body: req.body }, '[CartController.addToCart] Received add to cart request');

    const validatedInput = addToCartSchema.parse(req.body);

    const cart = await CartService.addToCart(userId, sessionId, validatedInput);
    logger.info({ userId, sessionId, itemCount: cart.itemCount }, '[CartController.addToCart] Successfully added item to cart');

    res.status(HTTPSTATUS.OK).json({
      message: 'Item added to cart successfully',
      data: cart,
    });
  });


  static updateCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.getIdentifiers(req);
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;
    const validatedInput = updateCartItemSchema.parse(req.body);

    const cart = await CartService.updateCartItemQuantity(
      userId,
      sessionId,
      itemId,
      validatedInput.quantity
    );

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart item updated successfully',
      data: cart,
    });
  });

  static removeCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.getIdentifiers(req);
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;

    const cart = await CartService.removeCartItem(userId, sessionId, itemId);

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart item removed successfully',
      data: cart,
    });
  });

  static clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.getIdentifiers(req);
    const cart = await CartService.clearCart(userId, sessionId);

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart cleared successfully',
      data: cart,
    });
  });

  static syncCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser | undefined;
    if (!user || !user.id) {
      res.status(HTTPSTATUS.UNAUTHORIZED).json({
        message: 'Authentication required to sync cart',
      });
      return;
    }

    const validatedInput = syncCartSchema.parse(req.body);
    const cart = await CartService.syncCart(user.id, validatedInput.items);

    res.status(HTTPSTATUS.OK).json({
      message: 'Guest cart merged successfully',
      data: cart,
    });
  });
}
