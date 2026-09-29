import { afterAll, describe, expect, it } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS, resolveShippingFee } from '@celebs/shared-types';

import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';
import { UNRESOLVED_FREE_DELIVERY_THRESHOLD } from '@/modules/logistics/delivery-pricing.repository';

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
    expect(cart.shippingFee).toBe(
      resolveShippingFee(1200, COMMERCE_POLICY_DEFAULTS, UNRESOLVED_FREE_DELIVERY_THRESHOLD),
    );
    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });

  it('quotes the conservative threshold, because the destination is unknown', async () => {
    const productId = await seedProduct(1000);
    const cart = await cartFor(productId, 3);

    expect(cart.subtotal).toBe(3000);
    // The cart has no address yet, so it cannot claim the lower in-valley
    // threshold. Quoting the higher one means it never advertises free delivery
    // the server would then decline to grant - the same bug as promising it and
    // charging for it. Checkout re-quotes against the real zone.
    expect(cart.shippingFee).toBe(
      resolveShippingFee(3000, COMMERCE_POLICY_DEFAULTS, UNRESOLVED_FREE_DELIVERY_THRESHOLD),
    );
    expect(cart.shippingFee).toBe(150);
  });

  it('waives delivery once the cart clears even the conservative threshold', async () => {
    const productId = await seedProduct(1000);
    const cart = await cartFor(productId, 5);

    expect(cart.subtotal).toBe(5000);
    expect(cart.shippingFee).toBe(0);
  });

  it('keeps total equal to subtotal plus fee', async () => {
    const productId = await seedProduct(750);
    const cart = await cartFor(productId, 2);

    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });
});
