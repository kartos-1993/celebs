import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { InventoryService } from '../inventory/inventory.service';

import { cartRepository } from './cart.repository';

import prisma, { Prisma } from '@/config/db.prisma';

export class CartService {
  /**
   * Helper to resolve or create a Cart record in PostgreSQL
   */
  private static async getOrCreateCartRecord(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new AppError(
        'Either userId or sessionId is required to access cart',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    if (userId) {
      let cart = await cartRepository.findUnique({ userId });
      if (!cart) {
        cart = await cartRepository.createCartForUser(userId);
      }
      return cart;
    }

    let cart = await cartRepository.findUnique({ sessionId });
    if (!cart) {
      cart = await cartRepository.createCartForSession(sessionId!);
    }
    return cart;
  }

  /**
   * Get hydrated Cart with live PostgreSQL product details & stock checks
   */
  static async getCart(userId?: string, sessionId?: string): Promise<CartResponse> {
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);
    const cartWithItems = await cartRepository.findUniqueWithItems(cartRecord.id);

    if (!cartWithItems) {
      return {
        id: cartRecord.id,
        userId: cartRecord.userId,
        sessionId: cartRecord.sessionId,
        items: [],
        subtotal: 0,
        itemCount: 0,
        hasStockIssues: false,
        createdAt: cartRecord.createdAt.toISOString(),
        updatedAt: cartRecord.updatedAt.toISOString(),
      };
    }

    const productIds = Array.from(
      new Set(cartWithItems.items.map((item) => item.inventory.productId)),
    );

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotalDecimal = new Prisma.Decimal(0);
    let itemCount = 0;
    let hasStockIssues = false;

    const hydratedItems: CartItemHydrated[] = cartWithItems.items.map((item) => {
      const product = productMap.get(item.inventory.productId);
      const availableStock = item.inventory.quantity - item.inventory.reservedQuantity;
      const isAvailable = availableStock > 0 && availableStock >= item.quantity;

      if (!isAvailable) {
        hasStockIssues = true;
      }

      let stockWarning: string | undefined;
      if (availableStock <= 0) {
        stockWarning = 'Out of Stock';
      } else if (availableStock < item.quantity) {
        stockWarning = `Only ${availableStock} remaining in stock`;
      } else if (availableStock <= 5) {
        stockWarning = `Only ${availableStock} left - order soon!`;
      }

      const rawPrice = product?.price ? Number(product.price) : 0;
      const rawDiscounted = product?.discountedPrice ? Number(product.discountedPrice) : undefined;
      const price = rawDiscounted || rawPrice;
      const discountedPrice = rawDiscounted && rawDiscounted < rawPrice ? rawDiscounted : undefined;

      let variantImage = product?.mainImages?.[0] || '';
      if (product && Array.isArray(product.colorVariants)) {
        const variants = product.colorVariants as Array<{ name: string; images?: string[] }>;
        const variant = variants.find(
          (v) => v.name.toLowerCase() === item.inventory.colorVariantName.toLowerCase(),
        );
        if (variant && variant.images && variant.images.length > 0 && variant.images[0]) {
          variantImage = variant.images[0];
        }
      }

      if (isAvailable) {
        const priceDecimal = new Prisma.Decimal(price);
        subtotalDecimal = subtotalDecimal.add(priceDecimal.mul(item.quantity));
        itemCount += item.quantity;
      }

      return {
        id: item.id,
        cartId: item.cartId,
        inventoryId: item.inventoryId,
        productId: item.inventory.productId,
        productName: product?.name || 'Unknown Product',
        productSlug: product?.slug || '',
        productBrand: product?.brand || undefined,
        price: rawPrice,
        discountedPrice,
        colorVariantName: item.inventory.colorVariantName,
        colorCode: '#000000',
        image: variantImage,
        size: item.inventory.size,
        quantity: item.quantity,
        availableStock: availableStock > 0 ? availableStock : 0,
        isAvailable,
        stockWarning,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });

    return {
      id: cartRecord.id,
      userId: cartRecord.userId,
      sessionId: cartRecord.sessionId,
      items: hydratedItems,
      subtotal: subtotalDecimal.toNumber(),
      itemCount,
      hasStockIssues,
      createdAt: cartRecord.createdAt.toISOString(),
      updatedAt: cartRecord.updatedAt.toISOString(),
    };
  }

  /**
   * Add or increment an item in the cart with stock verification
   */
  static async addToCart(
    userId: string | undefined,
    sessionId: string | undefined,
    input: AddToCartInput,
  ): Promise<CartResponse> {
    const { productId, colorVariantName, size, quantity } = input;

    // 1. Validate Product Existence in PostgreSQL Prisma
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 2. Find or Create Inventory record in PostgreSQL
    const stockInfo = await InventoryService.findOrCreateInventory(
      productId,
      colorVariantName,
      size,
    );

    // 3. Get Cart
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

    // Check existing item in cart
    const existingCart = await cartRepository.findUniqueWithItems(cartRecord.id);
    const existingItem = existingCart?.items.find((i) => i.inventoryId === stockInfo.inventoryId);

    const targetQuantity = (existingItem?.quantity || 0) + quantity;

    if (stockInfo.availableQuantity < targetQuantity) {
      throw new AppError(
        `Requested quantity (${targetQuantity}) exceeds available stock (${stockInfo.availableQuantity})`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    // Upsert CartItem
    await cartRepository.addItemToCart(cartRecord.id, stockInfo.inventoryId, targetQuantity);

    return this.getCart(userId, sessionId);
  }

  /**
   * Update quantity of an item in cart
   */
  static async updateCartItemQuantity(
    userId: string | undefined,
    sessionId: string | undefined,
    itemId: string,
    newQuantity: number,
  ): Promise<CartResponse> {
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

    const item = await cartRepository.findUniqueWithItems(cartRecord.id);
    const cartItem = item?.items.find((i) => i.id === itemId);

    if (!cartItem) {
      throw new AppError('Cart item not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (newQuantity <= 0) {
      await cartRepository.deleteItem(itemId);
      return this.getCart(userId, sessionId);
    }

    const availableStock = cartItem.inventory.quantity - cartItem.inventory.reservedQuantity;
    if (availableStock < newQuantity) {
      throw new AppError(
        `Cannot update to ${newQuantity}. Only ${availableStock} in stock.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await cartRepository.updateItem(itemId, { quantity: newQuantity });

    return this.getCart(userId, sessionId);
  }

  /**
   * Remove item from cart
   */
  static async removeCartItem(
    userId: string | undefined,
    sessionId: string | undefined,
    itemId: string,
  ): Promise<CartResponse> {
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

    await cartRepository.deleteManyItems({ id: itemId, cartId: cartRecord.id });

    return this.getCart(userId, sessionId);
  }

  /**
   * Clear entire cart
   */
  static async clearCart(userId?: string, sessionId?: string): Promise<CartResponse> {
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

    await cartRepository.deleteManyItems({ cartId: cartRecord.id });

    return this.getCart(userId, sessionId);
  }

  /**
   * Sync guest local cart items into user cart upon login
   */
  static async syncCart(userId: string, guestItems: AddToCartInput[]): Promise<CartResponse> {
    for (const itemInput of guestItems) {
      try {
        await this.addToCart(userId, undefined, itemInput);
      } catch {
        // Skip items that are out of stock during sync without failing full login sync
      }
    }
    return this.getCart(userId, undefined);
  }
}
