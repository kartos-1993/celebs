import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';

interface ComboFixture {
  uid: string;
  sessionId: string;
  categoryId: string;
  productAId: string;
  productBId: string;
  productCId: string;
  bundlePercentId: string;
  bundleFixedId: string;
  bundleSingleId: string;
  bundleInactiveId: string;
  bundleWithOptionalId: string;
  bundleDefaultQtyId: string;
}

async function createFixture(): Promise<ComboFixture> {
  const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const category = await prisma.category.create({
    data: { name: 'Combo Test Category', slug: `combo-test-${uid}` },
  });

  const mkProduct = (
    label: string,
    price: number,
    discountedPrice: number | null,
    variantName: string,
    size: string,
  ) =>
    prisma.product.create({
      data: {
        name: `Combo ${label} ${uid}`,
        brand: 'Celebs',
        slug: `combo-${label.toLowerCase()}-${uid}`,
        price,
        discountedPrice,
        status: 'published',
        categoryId: category.id,
        colorVariants: [
          {
            name: variantName,
            colorCode: '#000000',
            images: [`https://example.com/${label.toLowerCase()}.jpg`],
            stocks: [{ size, quantity: 10 }],
          },
        ],
      },
    });

  const productA = await mkProduct('Alpha', 1000, null, 'Black', 'M');
  const productB = await mkProduct('Beta', 500, 400, 'Black', 'L');
  const productC = await mkProduct('Gamma', 300, null, 'White', 'S');

  const bundlePercent = await prisma.comboBundle.create({
    data: {
      title: `Percent Combo ${uid}`,
      slug: `percent-combo-${uid}`,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
      items: { create: [{ productId: productA.id }, { productId: productB.id }] },
    },
  });

  const bundleFixed = await prisma.comboBundle.create({
    data: {
      title: `Fixed Combo ${uid}`,
      slug: `fixed-combo-${uid}`,
      discountType: 'FIXED_AMOUNT',
      discountValue: 300,
      isActive: true,
      items: { create: [{ productId: productA.id }, { productId: productB.id }] },
    },
  });

  const bundleInactive = await prisma.comboBundle.create({
    data: {
      title: `Inactive Combo ${uid}`,
      slug: `inactive-combo-${uid}`,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: false,
      items: { create: [{ productId: productA.id }] },
    },
  });

  const bundleSingle = await prisma.comboBundle.create({
    data: {
      title: `Single Combo ${uid}`,
      slug: `single-combo-${uid}`,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
      items: { create: [{ productId: productA.id }] },
    },
  });

  const bundleWithOptional = await prisma.comboBundle.create({
    data: {
      title: `Optional Combo ${uid}`,
      slug: `optional-combo-${uid}`,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
      items: {
        create: [{ productId: productA.id }, { productId: productC.id, isRequired: false }],
      },
    },
  });

  const bundleDefaultQty = await prisma.comboBundle.create({
    data: {
      title: `Default Qty Combo ${uid}`,
      slug: `default-qty-combo-${uid}`,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      isActive: true,
      items: { create: [{ productId: productA.id, defaultQuantity: 2 }] },
    },
  });

  return {
    uid,
    sessionId: `combo-session-${uid}`,
    categoryId: category.id,
    productAId: productA.id,
    productBId: productB.id,
    productCId: productC.id,
    bundlePercentId: bundlePercent.id,
    bundleFixedId: bundleFixed.id,
    bundleSingleId: bundleSingle.id,
    bundleInactiveId: bundleInactive.id,
    bundleWithOptionalId: bundleWithOptional.id,
    bundleDefaultQtyId: bundleDefaultQty.id,
  };
}

async function cleanupFixture(fixture: ComboFixture) {
  await prisma.cart.deleteMany({ where: { sessionId: fixture.sessionId } });
  await prisma.productInventory.deleteMany({
    where: { productId: { in: [fixture.productAId, fixture.productBId, fixture.productCId] } },
  });
  await prisma.comboBundle.deleteMany({
    where: {
      id: {
        in: [
          fixture.bundlePercentId,
          fixture.bundleFixedId,
          fixture.bundleSingleId,
          fixture.bundleInactiveId,
          fixture.bundleWithOptionalId,
          fixture.bundleDefaultQtyId,
        ],
      },
    },
  });
  await prisma.product.deleteMany({
    where: { id: { in: [fixture.productAId, fixture.productBId, fixture.productCId] } },
  });
  await prisma.category.deleteMany({ where: { id: fixture.categoryId } });
}

describe('Combo Cart — POST /cart/combos contract (PostgreSQL)', () => {
  let fixture: ComboFixture;

  beforeEach(async () => {
    fixture = await createFixture();
  });

  afterEach(async () => {
    await cleanupFixture(fixture);
  });

  it('adds a percentage combo with prorated per-unit discounts on every line', async () => {
    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundlePercentId,
      items: [
        { productId: fixture.productAId, colorVariantName: 'Black', size: 'M' },
        { productId: fixture.productBId, colorVariantName: 'Black', size: 'L' },
      ],
    });

    expect(cart.items).toHaveLength(2);

    const lineA = cart.items.find((item) => item.productId === fixture.productAId)!;
    const lineB = cart.items.find((item) => item.productId === fixture.productBId)!;

    // A: 10% of list 1000 → 100 off → 900. B: 10% of list 500 → 50 off,
    // stacked on its 400 sale price → 350.
    expect(lineA.unitPrice).toBe(900);
    expect(lineA.appliedDiscount).toBe(100);
    expect(lineB.unitPrice).toBe(350);
    expect(lineB.appliedDiscount).toBe(50);
    expect(lineB.discountedPrice).toBe(400);

    expect(cart.subtotal).toBe(1250);
    expect(cart.itemCount).toBe(2);

    const rows = await prisma.cartItem.findMany({
      where: { cart: { sessionId: fixture.sessionId } },
      include: { inventory: { select: { productId: true } } },
    });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.comboBundleId).toBe(fixture.bundlePercentId);
      expect(row.discountSource).toBe('COMBO');
    }
    const rowByProduct = new Map(rows.map((row) => [row.inventory.productId, row]));
    expect(Number(rowByProduct.get(fixture.productAId)!.appliedDiscount)).toBe(100);
    expect(Number(rowByProduct.get(fixture.productBId)!.appliedDiscount)).toBe(50);
  });

  it('fixed-amount combo splits the value per line then per unit', async () => {
    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundleFixedId,
      items: [
        { productId: fixture.productAId, colorVariantName: 'Black', size: 'M' },
        { productId: fixture.productBId, colorVariantName: 'Black', size: 'L', quantity: 2 },
      ],
    });

    const lineA = cart.items.find((item) => item.productId === fixture.productAId)!;
    const lineB = cart.items.find((item) => item.productId === fixture.productBId)!;

    // 300 over 2 lines → 150 per line; B carries 2 units → 75 per unit.
    expect(lineA.appliedDiscount).toBe(150);
    expect(lineA.unitPrice).toBe(850);
    expect(lineB.appliedDiscount).toBe(75);
    expect(lineB.unitPrice).toBe(325);
    expect(lineB.quantity).toBe(2);
    expect(cart.subtotal).toBe(850 + 650);
  });

  it('applies the bundle item defaultQuantity when the payload omits quantity', async () => {
    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundleDefaultQtyId,
      items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(2);
    expect(cart.items[0]!.appliedDiscount).toBe(100);
    expect(cart.items[0]!.unitPrice).toBe(900);
    expect(cart.subtotal).toBe(1800);
  });

  it('allows omitting optional bundle items', async () => {
    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundleWithOptionalId,
      items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.productId).toBe(fixture.productAId);
  });

  it('rejects an unknown bundle with a 404', async () => {
    await expect(
      CartService.addComboToCart(undefined, fixture.sessionId, {
        comboBundleId: '00000000-0000-0000-0000-000000000000',
        items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      statusCode: HTTPSTATUS.NOT_FOUND,
    });
  });

  it('rejects an inactive bundle', async () => {
    await expect(
      CartService.addComboToCart(undefined, fixture.sessionId, {
        comboBundleId: fixture.bundleInactiveId,
        items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.VALIDATION_ERROR,
      statusCode: HTTPSTATUS.BAD_REQUEST,
    });
  });

  it('rejects a product that is not part of the bundle', async () => {
    await expect(
      CartService.addComboToCart(undefined, fixture.sessionId, {
        comboBundleId: fixture.bundlePercentId,
        items: [
          { productId: fixture.productAId, colorVariantName: 'Black', size: 'M' },
          { productId: fixture.productCId, colorVariantName: 'White', size: 'S' },
        ],
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.VALIDATION_ERROR });
  });

  it('rejects a payload missing a required bundle item', async () => {
    await expect(
      CartService.addComboToCart(undefined, fixture.sessionId, {
        comboBundleId: fixture.bundlePercentId,
        items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.VALIDATION_ERROR });
  });

  it('rejects the whole add when one line lacks stock and writes nothing', async () => {
    await expect(
      CartService.addComboToCart(undefined, fixture.sessionId, {
        comboBundleId: fixture.bundlePercentId,
        items: [
          { productId: fixture.productAId, colorVariantName: 'Black', size: 'M', quantity: 11 },
          { productId: fixture.productBId, colorVariantName: 'Black', size: 'L' },
        ],
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.VALIDATION_ERROR });

    const cart = await CartService.getCart(undefined, fixture.sessionId);
    expect(cart.items).toHaveLength(0);
  });

  it('merges a repeated combo add into one line with the same per-unit discount', async () => {
    const input = {
      comboBundleId: fixture.bundleSingleId,
      items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
    };

    await CartService.addComboToCart(undefined, fixture.sessionId, input);
    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, input);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(2);
    expect(cart.items[0]!.appliedDiscount).toBe(100);
    expect(cart.items[0]!.unitPrice).toBe(900);
    expect(cart.subtotal).toBe(1800);
  });

  it('refuses a plain add onto a combo line and keeps the line untouched', async () => {
    await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundleSingleId,
      items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
    });

    const error = await CartService.addToCart(undefined, fixture.sessionId, {
      productId: fixture.productAId,
      colorVariantName: 'Black',
      size: 'M',
      quantity: 1,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toMatch(/combo/i);

    const cart = await CartService.getCart(undefined, fixture.sessionId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(1);
    expect(cart.items[0]!.appliedDiscount).toBe(100);
  });

  it('lets a combo add take over a plain line', async () => {
    await CartService.addToCart(undefined, fixture.sessionId, {
      productId: fixture.productAId,
      colorVariantName: 'Black',
      size: 'M',
      quantity: 1,
    });

    const cart = await CartService.addComboToCart(undefined, fixture.sessionId, {
      comboBundleId: fixture.bundleSingleId,
      items: [{ productId: fixture.productAId, colorVariantName: 'Black', size: 'M' }],
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(2);
    expect(cart.items[0]!.appliedDiscount).toBe(100);
    expect(cart.items[0]!.unitPrice).toBe(900);

    const row = await prisma.cartItem.findFirst({
      where: { cart: { sessionId: fixture.sessionId } },
    });
    expect(row!.comboBundleId).toBe(fixture.bundleSingleId);
    expect(row!.discountSource).toBe('COMBO');
  });
});
