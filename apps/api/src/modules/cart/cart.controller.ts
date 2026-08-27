import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import {
  addToCartSchema,
  CartResponse,
  syncCartSchema,
  updateCartItemSchema,
} from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { CartService } from './cart.service';

import { appConfig } from '@/config/app.config';

interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

const GUEST_SESSION_REGEX = /^[a-zA-Z0-9-_]{8,128}$/;

export class CartController {
  private static extractIdentifiers(req: Request): { userId?: string; sessionId?: string } {
    const user = req.user as AuthUser | undefined;
    const userId = user?.id;
    if (userId) return { userId };

    // 1. Prioritize HttpOnly cookie (Web) over client header (Mobile)
    const cookieId =
      req.cookies && typeof req.cookies.sessionId === 'string'
        ? req.cookies.sessionId.trim()
        : undefined;

    const headerRaw = req.headers['x-session-id'];
    const headerId =
      typeof headerRaw === 'string'
        ? headerRaw.trim()
        : Array.isArray(headerRaw)
          ? headerRaw[0]?.trim()
          : undefined;

    let candidate = cookieId || headerId;

    // 2. Reject legacy/shared default and malformed IDs
    if (
      candidate === 'guest-session-default' ||
      (candidate && !GUEST_SESSION_REGEX.test(candidate))
    ) {
      candidate = undefined;
    }

    return { sessionId: candidate };
  }

  private static ensureSessionId(res: Response, existingSessionId?: string): string {
    const sessionId = existingSessionId || randomUUID();
    const config = appConfig();

    res.cookie('sessionId', sessionId, {
      httpOnly: config.COOKIE.HTTPONLY,
      secure: config.COOKIE.SECURE,
      sameSite: config.COOKIE.SAME_SITE,
      domain: config.COOKIE.DOMAIN || undefined,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.setHeader('x-session-id', sessionId);

    return sessionId;
  }

  static getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.extractIdentifiers(req);

    // Prevent crawler DB bloat: return ephemeral empty cart without writing to PostgreSQL
    if (!userId && !sessionId) {
      res.status(HTTPSTATUS.OK).json({
        message: 'Cart retrieved successfully',
        data: {
          id: '',
          userId: null,
          sessionId: null,
          items: [],
          subtotal: 0,
          itemCount: 0,
          hasStockIssues: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies CartResponse,
      });
      return;
    }

    logger.info({ userId, sessionId }, '[CartController.getCart] Fetching cart');
    const cart = await CartService.getCart(userId, sessionId);

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart retrieved successfully',
      data: cart,
    });
  });

  static addToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = CartController.extractIdentifiers(req);
    let { sessionId } = CartController.extractIdentifiers(req);

    // Lazy generation: only provision a session when mutating
    if (!userId) {
      sessionId = CartController.ensureSessionId(res, sessionId);
    }

    logger.info(
      { userId, sessionId, body: req.body },
      '[CartController.addToCart] Received add to cart request',
    );

    const validatedInput = addToCartSchema.parse(req.body);

    const cart = await CartService.addToCart(userId, sessionId, validatedInput);
    logger.info(
      { userId, sessionId, itemCount: cart.itemCount },
      '[CartController.addToCart] Successfully added item to cart',
    );

    res.status(HTTPSTATUS.OK).json({
      message: 'Item added to cart successfully',
      data: cart,
    });
  });

  static updateCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.extractIdentifiers(req);
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;
    const validatedInput = updateCartItemSchema.parse(req.body);

    const cart = await CartService.updateCartItemQuantity(
      userId,
      sessionId,
      itemId,
      validatedInput.quantity,
    );

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart item updated successfully',
      data: cart,
    });
  });

  static removeCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.extractIdentifiers(req);
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;

    const cart = await CartService.removeCartItem(userId, sessionId, itemId);

    res.status(HTTPSTATUS.OK).json({
      message: 'Cart item removed successfully',
      data: cart,
    });
  });

  static clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, sessionId } = CartController.extractIdentifiers(req);
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
