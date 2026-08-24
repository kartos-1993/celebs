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
});
