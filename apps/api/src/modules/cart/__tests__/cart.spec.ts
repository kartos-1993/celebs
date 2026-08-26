import { describe, expect, it } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';

describe('Cart Integration Test Suite', () => {
  it('should execute full cart lifecycle: create, add, update, remove, clear', async () => {
    const sessionId = `test-session-${Date.now()}`;

    // 1. Create Category in PostgreSQL
    const category = await prisma.category.create({
      data: {
        name: 'Denim Test Category',
        slug: `denim-test-${Date.now()}`,
      },
    });

    // 2. Create Product in PostgreSQL Prisma
    const product = await prisma.product.create({
      data: {
        name: 'Test Denim Jacket',
        brand: 'Celebs',
        slug: `test-denim-jacket-${Date.now()}`,
        price: 1500,
        status: 'published',
        categoryId: category.id,
        colorVariants: [
          {
            name: 'Blue',
            colorCode: '#0000FF',
            images: ['https://example.com/jacket.jpg'],
            stocks: [{ size: 'L', quantity: 10 }],
          },
        ],
      },
    });

    const productId = product.id;

    // 3. Add item to Cart
    const cartResult1 = await CartService.addToCart(undefined, sessionId, {
      productId,
      colorVariantName: 'Blue',
      size: 'L',
      quantity: 2,
    });

    expect(cartResult1.items).toHaveLength(1);
    expect(cartResult1.items[0]?.quantity).toBe(2);

    const cartItemId = cartResult1.items[0]!.id;

    // 4. Update Item Quantity
    const cartResult2 = await CartService.updateCartItemQuantity(
      undefined,
      sessionId,
      cartItemId,
      4,
    );

    expect(cartResult2.items[0]?.quantity).toBe(4);

    // 5. Remove Item
    const cartResult3 = await CartService.removeCartItem(undefined, sessionId, cartItemId);
    expect(cartResult3.items).toHaveLength(0);

    // 6. Clear Cart
    await CartService.addToCart(undefined, sessionId, {
      productId,
      colorVariantName: 'Blue',
      size: 'L',
      quantity: 1,
    });

    const clearedCart = await CartService.clearCart(undefined, sessionId);
    expect(clearedCart.items).toHaveLength(0);
  });

  it('should reject adding non-existent product variant with NOT_FOUND', async () => {
    const sessionId = `test-session-invalid-${Date.now()}`;

    await expect(
      CartService.addToCart(undefined, sessionId, {
        productId: 'non-existent-product-id-123',
        colorVariantName: 'Red',
        size: 'M',
        quantity: 1,
      }),
    ).rejects.toThrow(AppError);
  });

  it('should batch-sync guest items: merge duplicates, merge with existing cart item', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Sync Tester',
        email: `sync-tester-${Date.now()}@test.local`,
        password: 'not-a-real-hash',
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Sync Test Category', slug: `sync-test-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Sync Test Tee',
        brand: 'Celebs',
        slug: `sync-test-tee-${Date.now()}`,
        price: 500,
        status: 'published',
        categoryId: category.id,
        colorVariants: [
          { name: 'Blue', stocks: [{ size: 'L', quantity: 10 }] },
          { name: 'Red', stocks: [{ size: 'M', quantity: 10 }] },
        ],
      },
    });

    // Existing user cart already holds 1x Blue/L
    await CartService.addToCart(user.id, undefined, {
      productId: product.id,
      colorVariantName: 'Blue',
      size: 'L',
      quantity: 1,
    });

    // Guest cart: duplicate Blue/L entries (1+2) must merge with existing -> 4 total;
    // Red/M is a new line.
    const result = await CartService.syncCart(user.id, [
      { productId: product.id, colorVariantName: 'Blue', size: 'L', quantity: 2 },
      { productId: product.id, colorVariantName: 'Blue', size: 'L', quantity: 1 },
      { productId: product.id, colorVariantName: 'Red', size: 'M', quantity: 1 },
    ]);

    expect(result.items).toHaveLength(2);
    const blue = result.items.find((i) => i.colorVariantName === 'Blue');
    const red = result.items.find((i) => i.colorVariantName === 'Red');
    expect(blue?.quantity).toBe(4);
    expect(red?.quantity).toBe(1);

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it('should silently skip out-of-stock guest items while syncing the rest', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Sync OOS Tester',
        email: `sync-oos-${Date.now()}@test.local`,
        password: 'not-a-real-hash',
      },
    });

    const category = await prisma.category.create({
      data: { name: 'Sync OOS Category', slug: `sync-oos-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Sync OOS Hoodie',
        brand: 'Celebs',
        slug: `sync-oos-hoodie-${Date.now()}`,
        price: 900,
        status: 'published',
        categoryId: category.id,
        colorVariants: [{ name: 'Black', stocks: [{ size: 'S', quantity: 2 }] }],
      },
    });

    // Black/S only has stock 2; guest asks for 5 -> skipped. Green/XL variant
    // does not exist in JSON either but sync materializes it with default qty.
    const result = await CartService.syncCart(user.id, [
      { productId: product.id, colorVariantName: 'Black', size: 'S', quantity: 5 },
      { productId: product.id, colorVariantName: 'Green', size: 'XL', quantity: 1 },
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.colorVariantName).toBe('Green');

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});
