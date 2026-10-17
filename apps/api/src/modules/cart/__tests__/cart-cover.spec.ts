import { afterAll, describe, expect, it } from 'vitest';

import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';
import { resolveCover } from '@/modules/product/utils/product-image.util';

/**
 * A cart row must show the SAME picture as the storefront card, the PDP, the
 * admin list and the order email for that product.
 *
 * The canonical order is owned by exactly one function,
 * `product/utils/product-image.util.resolveCover`:
 *
 *   cover = mainImages[0] ?? first colour variant's first image
 *
 * `CartService.getCart` used to start at `mainImages[0]` and then OVERWRITE it
 * with the line's own colour gallery — the exact inverse — so a product with a
 * shared cover plus per-colour galleries showed its shared cover everywhere in
 * the app and a different picture inside the cart.
 *
 * These tests pin the DELEGATION, not a mirrored copy: expectations are stated
 * as an agreement with `resolveCover` on the same stored input, so a future
 * change to the canonical order moves the cart with it instead of quietly
 * forking a second one.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRODUCT_SELECT = { id: true, mainImages: true, colorVariants: true } as const;

const createdProductIds: string[] = [];
const sessionIds: string[] = [];

interface SeededProduct {
  id: string;
  mainImages: string[] | null;
  colorVariants: unknown;
}

/** One product per call so each case owns an isolated cover answer. */
async function seedProduct(input: {
  mainImages?: string[];
  colorVariants: Array<Record<string, unknown>>;
}): Promise<SeededProduct> {
  const product = await prisma.product.create({
    data: {
      name: `Cover Contract Tee ${stamp()}`,
      slug: `cover-contract-tee-${stamp()}`,
      brand: 'Celebs',
      price: 1200,
      status: 'published',
      categoryId: (
        await prisma.category.create({
          data: { name: `Cover Cat ${stamp()}`, slug: `cover-cat-${stamp()}` },
        })
      ).id,
      mainImages: input.mainImages,
      colorVariants: input.colorVariants as never,
    },
    select: PRODUCT_SELECT,
  });
  createdProductIds.push(product.id);
  return product;
}

/** Adds one line to a throwaway guest cart and returns that line. */
async function addLine(
  productId: string,
  colorVariantName: string,
): Promise<{ image: string; cover?: string; colorVariantName: string }> {
  const sessionId = `cart-cover-${stamp()}`;
  sessionIds.push(sessionId);
  const cart = await CartService.addToCart(undefined, sessionId, {
    productId,
    colorVariantName,
    size: 'M',
    quantity: 1,
  });
  return cart.items[0]!;
}

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { sessionId: { in: sessionIds } } } });
  await prisma.cart.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
});

describe('cart line image — one canonical cover, delegated not mirrored', () => {
  it('prefers mainImages[0] over the line colour gallery (the old inverse bug)', async () => {
    const product = await seedProduct({
      mainImages: ['products/shared-cover.jpg', 'products/shared-second.jpg'],
      colorVariants: [
        { name: 'Red', images: ['products/red-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
        { name: 'Blue', images: ['products/blue-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
      ],
    });

    const line = await addLine(product.id, 'Red');

    expect(line.colorVariantName).toBe('Red');
    // NOT 'products/red-1.jpg' — that was the defect.
    expect(line.image).toBe('products/shared-cover.jpg');
    expect(line.cover).toBe('products/shared-cover.jpg');
  });

  it('agrees with resolveCover for every line colour, not just the first', async () => {
    const product = await seedProduct({
      mainImages: ['products/canonical.jpg'],
      colorVariants: [
        { name: 'Red', images: ['products/red-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
        { name: 'Blue', images: ['products/blue-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
        {
          name: 'Green',
          images: ['products/green-1.jpg'],
          stocks: [{ size: 'M', quantity: 5 }],
        },
      ],
    });

    const canonical = resolveCover(product.mainImages, product.colorVariants);

    for (const color of ['Red', 'Blue', 'Green']) {
      const line = await addLine(product.id, color);
      expect(line.image).toBe(canonical);
    }
  });

  it('falls back to the FIRST colour gallery when the product has no mainImages', async () => {
    const product = await seedProduct({
      colorVariants: [
        { name: 'Red', images: ['products/first-red.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
        { name: 'Blue', images: ['products/blue-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
      ],
    });

    // The line asks for Blue; the canonical fallback is the FIRST colour's
    // first image, not the line's own gallery.
    const line = await addLine(product.id, 'Blue');
    expect(line.image).toBe('products/first-red.jpg');
    expect(line.cover).toBe('products/first-red.jpg');
  });

  it('leaves cover undefined and image empty for a product with no picture at all', async () => {
    const product = await seedProduct({
      colorVariants: [{ name: 'Red', stocks: [{ size: 'M', quantity: 5 }] }],
    });

    const line = await addLine(product.id, 'Red');
    expect(line.cover).toBeUndefined();
    expect(line.image).toBe('');
  });

  it('skips blank mainImages entries and keeps the colour fallback reachable', async () => {
    const product = await seedProduct({
      mainImages: ['   '],
      colorVariants: [
        { name: 'Red', images: ['products/real-red.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
      ],
    });

    const line = await addLine(product.id, 'Red');
    expect(line.cover).toBe('products/real-red.jpg');
  });
});
