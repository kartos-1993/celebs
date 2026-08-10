import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';
import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';
import { cartRepository } from './cart.repository';
import { Prisma } from '@prisma/client';
import { ProductModel } from '@/db/models/product.model';
import { InventoryService } from '../inventory/inventory.service';

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
   * Get hydrated Cart with live MongoDB product details & stock checks
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

    // Collect product IDs for batch lookup in MongoDB
    const productIds = Array.from(
      new Set(cartWithItems.items.map((item) => item.inventory.productId)),
    );

    const products = await ProductModel.find({
      _id: { $in: productIds },
    }).exec();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

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

      const price = product?.discountedPrice || product?.price || 0;
      const discountedPrice =
        product?.discountedPrice && product.discountedPrice < product.price
          ? product.discountedPrice
          : undefined;

      // Color variant image lookup
      let variantImage = product?.mainImages?.[0] || '';
      if (product && product.colorVariants) {
        const variant = product.colorVariants.find(
          (v) => v.name.toLowerCase() === item.inventory.colorVariantName.toLowerCase(),
        );
        if (variant && variant.images && variant.images.length > 0) {
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
        productBrand: product?.brand,
        price: product?.price || 0,
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
    logger.info(
      { userId, sessionId, productId, colorVariantName, size, quantity },
      '[CartService.addToCart] Starting item addition',
    );

    // 1. Validate Product Existence
    const product = await ProductModel.findById(productId).exec();
    if (!product) {
      logger.error({ productId }, '[CartService.addToCart] Product not found in MongoDB');
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 2. Find or Create Inventory record in PostgreSQL
    const stockInfo = await InventoryService.findOrCreateInventory(
      productId,
      colorVariantName,
      size,
    );
    logger.info({ stockInfo }, '[CartService.addToCart] Inventory stock lookup complete');

    // 3. Get Cart
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);
    logger.info(
      { cartId: cartRecord.id, userId: cartRecord.userId, sessionId: cartRecord.sessionId },
      '[CartService.addToCart] Cart record resolved',
    );

    // Check existing item in cart
    const existingCart = await cartRepository.findUniqueWithItems(cartRecord.id);
    const existingItem = existingCart?.items.find((i) => i.inventoryId === stockInfo.inventoryId);

    const targetQuantity = (existingItem?.quantity || 0) + quantity;

    if (stockInfo.availableQuantity < targetQuantity) {
      logger.warn(
        { availableStock: stockInfo.availableQuantity, targetQuantity },
        '[CartService.addToCart] Stock insufficient',
      );
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
