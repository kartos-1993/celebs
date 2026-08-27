import { randomUUID } from 'node:crypto';

import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';
import { AppError, ErrorCode, generateSheinStyleSku, HTTPSTATUS } from '@celebs/shared-utils';

import { InventoryService } from '../inventory/inventory.service';

import { cartRepository } from './cart.repository';

import prisma, { Prisma } from '@/config/db.prisma';

export class CartService {
  /**
   * Helper to resolve or create a Cart record in PostgreSQL
   */
  private static async getOrCreateCartRecord(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      // No identifier for anonymous guest — create ephemeral in-memory empty cart response
      // Caller handles Set-Cookie issuance; do not fall back to shared guest-session-default
      throw new AppError(
        'Either userId or sessionId is required to access cart',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }
    if (sessionId) {
      // Harden against shared default value even if callers bypass controller validation
      if (sessionId === 'guest-session-default' || sessionId.trim().length < 8) {
        throw new AppError(
          'Invalid session identifier',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR,
        );
      }
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
   * Add or increment an item in the cart with stock verification.
   *
   * Hot path: product existence (1 query) + atomic CTE upsert (1 query) +
   * hydrated response. The CTE resolves-or-creates the inventory row and
   * performs the stock-checked upsert in a single round trip, so concurrent
   * adds can never oversell via check-then-write races.
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
      select: { id: true },
    });

    if (!product) {
      throw new AppError('Product not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 2. Get Cart
    const cartRecord = await this.getOrCreateCartRecord(userId, sessionId);

    // 3. Atomic resolve-inventory + stock-checked upsert (single round trip)
    const result = await this.upsertCartItemAtomic({
      cartId: cartRecord.id,
      productId,
      colorVariantName,
      size,
      quantity,
    });

    if (!result) {
      // Failure path only — resolve precise numbers for the client-facing error.
      const stock = await InventoryService.findOrCreateInventory(productId, colorVariantName, size);
      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_inventoryId: { cartId: cartRecord.id, inventoryId: stock.inventoryId },
        },
        select: { quantity: true },
      });
      const targetQuantity = (existing?.quantity ?? 0) + quantity;
      throw new AppError(
        `Requested quantity (${targetQuantity}) exceeds available stock (${stock.availableQuantity})`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    return this.getCart(userId, sessionId);
  }

  /**
   * Single-statement inventory resolution + stock-checked cart item upsert.
   *
   * Returns the post-write availability on success, or null when the write
   * was rejected because requested total exceeded available stock.
   */
  private static async upsertCartItemAtomic(args: {
    cartId: string;
    productId: string;
    colorVariantName: string;
    size: string;
    quantity: number;
  }): Promise<{ availableStock: number } | null> {
    const { cartId, productId, colorVariantName, size, quantity } = args;

    const rows = await prisma.$queryRaw<Array<{ avail: number }>>`
      WITH inv_ins AS (
        INSERT INTO "ProductInventory"
          ("id", "product_id", "color_variant_name", "size", "sku", "quantity", "reserved_quantity", "createdAt", "updatedAt")
        SELECT
          ${randomUUID()},
          ${productId},
          ${colorVariantName},
          ${size},
          ${generateSheinStyleSku({ brandPrefix: 'c' })},
          COALESCE((
            SELECT (s ->> 'quantity')::int
            FROM "Product" p,
                 jsonb_array_elements(p."colorVariants") v,
                 jsonb_array_elements(v -> 'stocks') s
            WHERE p."id" = ${productId}
              AND lower(v ->> 'name') = lower(${colorVariantName})
              AND lower(s ->> 'size') = lower(${size})
            LIMIT 1
          ), 10),
          0,
          now(),
          now()
        WHERE EXISTS (SELECT 1 FROM "Product" WHERE "id" = ${productId})
        ON CONFLICT ("product_id", "color_variant_name", "size") DO NOTHING
        RETURNING "id", ("quantity" - "reserved_quantity") AS avail
      ),
      inv AS (
        SELECT "id", avail FROM inv_ins
        UNION ALL
        SELECT pi."id", pi."quantity" - pi."reserved_quantity" AS avail
        FROM "ProductInventory" pi
        WHERE pi."product_id" = ${productId}
          AND pi."color_variant_name" = ${colorVariantName}
          AND pi."size" = ${size}
        LIMIT 1
      ),
      item AS (
        INSERT INTO "CartItem"
          ("id", "cart_id", "inventory_id", "quantity", "createdAt", "updatedAt")
        SELECT ${randomUUID()}, ${cartId}, inv."id", ${quantity}, now(), now()
        FROM inv
        WHERE inv.avail >= ${quantity}
        ON CONFLICT ("cart_id", "inventory_id") DO UPDATE
          SET "quantity" = "CartItem"."quantity" + EXCLUDED."quantity",
              "updatedAt" = now()
          WHERE (
            -- CTEs are not referenceable inside DO UPDATE; re-read live stock.
            SELECT pi2."quantity" - pi2."reserved_quantity"
            FROM "ProductInventory" pi2
            WHERE pi2."id" = EXCLUDED."inventory_id"
          ) >= "CartItem"."quantity" + EXCLUDED."quantity"
        RETURNING "inventory_id"
      )
      SELECT inv.avail AS avail
      FROM item
      JOIN inv ON inv."id" = item."inventory_id"
    `;

    const row = rows[0];
    return row ? { availableStock: Number(row.avail) } : null;
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
   * Sync guest local cart items into user cart upon login.
   *
   * Batched: instead of replaying addToCart per item (~17 round trips each),
   * this resolves products, inventories, cart, and existing items in bulk and
   * performs ONE stock-checked bulk upsert — roughly 9 queries total
   * regardless of guest item count. Out-of-stock items are skipped silently,
   * matching the previous per-item try/catch behavior.
   */
  static async syncCart(userId: string, guestItems: AddToCartInput[]): Promise<CartResponse> {
    if (guestItems.length === 0) {
      return this.getCart(userId, undefined);
    }

    // 1. Bulk-validate products; drop unknown ones silently.
    const productIds = Array.from(new Set(guestItems.map((g) => g.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validProductIds = new Set(products.map((p) => p.id));

    // Merge duplicate variants within the guest list into single requests.
    interface MergedRequest {
      productId: string;
      colorVariantName: string;
      size: string;
      requestedQuantity: number;
      inventoryId?: string;
      availableQuantity?: number;
    }
    const mergedRequests = new Map<string, MergedRequest>();
    for (const g of guestItems) {
      if (!validProductIds.has(g.productId)) continue;
      const key = `${g.productId}|${g.colorVariantName}|${g.size}`;
      const acc = mergedRequests.get(key);
      if (acc) {
        acc.requestedQuantity += g.quantity;
      } else {
        mergedRequests.set(key, {
          productId: g.productId,
          colorVariantName: g.colorVariantName,
          size: g.size,
          requestedQuantity: g.quantity,
        });
      }
    }
    if (mergedRequests.size === 0) {
      return this.getCart(userId, undefined);
    }

    // 2. Bulk-resolve existing inventories.
    const inventories = await prisma.productInventory.findMany({
      where: {
        OR: Array.from(mergedRequests.values()).map((r) => ({
          productId: r.productId,
          colorVariantName: r.colorVariantName,
          size: r.size,
        })),
      },
      select: {
        id: true,
        productId: true,
        colorVariantName: true,
        size: true,
        quantity: true,
        reservedQuantity: true,
      },
    });
    const invMap = new Map(
      inventories.map((i) => [`${i.productId}|${i.colorVariantName}|${i.size}`, i]),
    );

    // 3. Materialize any missing inventory rows (rare legacy path).
    for (const [key, req] of mergedRequests) {
      const existing = invMap.get(key);
      if (existing) {
        req.inventoryId = existing.id;
        req.availableQuantity = existing.quantity - existing.reservedQuantity;
      } else {
        const created = await InventoryService.findOrCreateInventory(
          req.productId,
          req.colorVariantName,
          req.size,
        );
        req.inventoryId = created.inventoryId;
        req.availableQuantity = created.availableQuantity;
      }
    }

    // 4. Cart + existing items in two round trips.
    const cartRecord = await this.getOrCreateCartRecord(userId, undefined);
    const wantedInventoryIds = Array.from(
      new Set(Array.from(mergedRequests.values()).map((r) => r.inventoryId!)),
    );
    const existingItems = await prisma.cartItem.findMany({
      where: { cartId: cartRecord.id, inventoryId: { in: wantedInventoryIds } },
      select: { inventoryId: true, quantity: true },
    });
    const existingQty = new Map(existingItems.map((i) => [i.inventoryId, i.quantity]));

    // 5. Stock-check merges; skip items that would exceed availability.
    const upserts: Array<{ inventoryId: string; quantity: number }> = [];
    for (const req of mergedRequests.values()) {
      const targetQuantity = (existingQty.get(req.inventoryId!) ?? 0) + req.requestedQuantity;
      if ((req.availableQuantity ?? 0) < targetQuantity || targetQuantity <= 0) continue;
      upserts.push({ inventoryId: req.inventoryId!, quantity: targetQuantity });
    }

    // 6. One statement writes every accepted item.
    if (upserts.length > 0) {
      const rowIds = upserts.map(() => randomUUID());
      await prisma.$executeRaw`
        INSERT INTO "CartItem" ("id", "cart_id", "inventory_id", "quantity", "createdAt", "updatedAt")
        SELECT b.id, ${cartRecord.id}, b.inv, b.qty, now(), now()
        FROM unnest(
          ${rowIds}::text[],
          ${upserts.map((u) => u.inventoryId)}::text[],
          ${upserts.map((u) => u.quantity)}::int[]
        ) AS b(id, inv, qty)
        ON CONFLICT ("cart_id", "inventory_id") DO UPDATE
          SET "quantity" = EXCLUDED."quantity",
              "updatedAt" = now()
      `;
    }

    return this.getCart(userId, undefined);
  }
}
