import { afterAll, describe, expect, it } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS, resolveShippingFee } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';

/**
 * The cart states the delivery fee and total the server would charge, so the
 * app has an authoritative figure to display and reconcile against rather than
 * one it derived from its own constants.
 *
 * Checkout remains the authority — it recomputes from the database and refuses
 * if anything disagrees — but a shopper must not be shown a different number
 * here than they are charged there, which is what the old hardcoded copies
 * allowed.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdProductIds: string[] = [];
const categoryIds: string[] = [];
const sessionIds: string[] = [];

async function seedProduct(price: number): Promise<string> {
  const category = await prisma.category.create({
    data: { name: `Cart Pricing Cat ${stamp()}`, slug: `cart-pricing-cat-${stamp()}` },
  });
  categoryIds.push(category.id);

  const product = await prisma.product.create({
    data: {
      name: `Cart Pricing Tee ${stamp()}`,
      slug: `cart-pricing-tee-${stamp()}`,
      brand: 'Celebs',
      price,
      status: 'published',
      categoryId: category.id,
      colorVariants: [
        { name: 'Red', images: ['products/red-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
      ],
    },
    select: { id: true },
  });
  createdProductIds.push(product.id);
  return product.id;
}

async function cartFor(productId: string, quantity: number) {
  const sessionId = `cart-pricing-${stamp()}`;
  sessionIds.push(sessionId);
  return CartService.addToCart(undefined, sessionId, {
    productId,
    colorVariantName: 'Red',
    size: 'M',
    quantity,
  });
}

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { sessionId: { in: sessionIds } } } });
  await prisma.cart.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
});

describe('cart states the delivery fee and total it would be charged', () => {
  it('charges the flat fee below the free-delivery threshold', async () => {
    const productId = await seedProduct(1200);
    const cart = await cartFor(productId, 1);

    expect(cart.subtotal).toBe(1200);
    expect(cart.shippingFee).toBe(resolveShippingFee(1200, COMMERCE_POLICY_DEFAULTS) as number);
    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });

  it('waives the fee exactly on the threshold, matching checkout', async () => {
    const productId = await seedProduct(1000);
    const cart = await cartFor(productId, 3);

    expect(cart.subtotal).toBe(3000);
    // The boundary the app and server used to disagree on.
    expect(cart.shippingFee).toBe(0);
    expect(cart.total).toBe(3000);
  });

  it('keeps total equal to subtotal plus fee', async () => {
    const productId = await seedProduct(750);
    const cart = await cartFor(productId, 2);

    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });
});
