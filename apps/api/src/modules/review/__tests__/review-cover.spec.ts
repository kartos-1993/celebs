import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import { resolveCover } from '@/modules/product/product-presenters';
import { reviewRepository } from '@/modules/review/review.repository';

/**
 * The "review this" tile must show the same picture the storefront shows.
 *
 * `findToReviewItemsByUser` used to emit `productImage: mainImages?.[0] ?? ''`
 * while its Prisma `select` never loaded `colorVariants`. That made the
 * canonical fallback unreachable, so any product that keeps its pictures in its
 * colour galleries and has no `mainImages` rendered a BLANK tile — the one
 * place where the shopper is being asked to rate an item and cannot see it.
 *
 * The expectation is stated as an agreement with `resolveCover` on the same
 * stored input, so this pins the DELEGATION rather than a second copy of the
 * precedence that could drift from the storefront's.
 *
 * The fixture is seeded per test (not in `beforeAll`) because the shared setup
 * TRUNCATEs every public table in a global `beforeEach`.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRODUCT_SELECT = { id: true, mainImages: true, colorVariants: true } as const;

interface SeededProduct {
  id: string;
  mainImages: string[] | null;
  colorVariants: unknown;
}

const ids = {
  order: '',
  address: '',
  customer: '',
  vendorProfile: '',
  vendorUser: '',
  products: [] as string[],
};

let withMain: SeededProduct;
let galleryOnly: SeededProduct;

beforeEach(async () => {
  const password = await hashValue('pass123');

  const customer = await prisma.user.create({
    data: { name: 'To Review Cover', email: `to-review-${stamp()}@test.local`, password },
  });
  ids.customer = customer.id;

  const vendorUser = await prisma.user.create({
    data: { name: 'To Review Vendor', email: `to-review-v-${stamp()}@test.local`, password },
  });
  ids.vendorUser = vendorUser.id;

  const vendorProfile = await prisma.vendorProfile.create({
    data: {
      userId: vendorUser.id,
      shopName: `ToReviewShop_${stamp()}`,
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
      citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'APPROVED',
    },
  });
  ids.vendorProfile = vendorProfile.id;

  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: 'To Review Cover',
      phone: '9841111111',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'Lazimpat',
      streetAddress: 'Main Road',
    },
  });
  ids.address = address.id;

  const category = await prisma.category.create({
    data: { name: `To Review Cat ${stamp()}`, slug: `to-review-cat-${stamp()}` },
  });

  const makeProduct = async (input: {
    mainImages?: string[];
    colorVariants: Array<Record<string, unknown>>;
  }): Promise<SeededProduct> => {
    const product = await prisma.product.create({
      data: {
        name: `To Review Tee ${stamp()}`,
        slug: `to-review-tee-${stamp()}`,
        price: 1500,
        vendorId: vendorProfile.id,
        categoryId: category.id,
        status: 'PUBLISHED',
        mainImages: input.mainImages,
        colorVariants: input.colorVariants as never,
      },
      select: PRODUCT_SELECT,
    });
    ids.products.push(product.id);
    return product;
  };

  withMain = await makeProduct({
    mainImages: ['products/review-shared-cover.jpg'],
    colorVariants: [
      { name: 'Red', images: ['products/review-red-1.jpg'], stocks: [{ size: 'M', quantity: 5 }] },
    ],
  });

  galleryOnly = await makeProduct({
    colorVariants: [
      {
        name: 'Green',
        images: ['products/review-green-1.jpg'],
        stocks: [{ size: 'M', quantity: 5 }],
      },
    ],
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `CEL-TO-REVIEW-${stamp()}`,
      userId: customer.id,
      addressId: address.id,
      subtotal: 3000,
      shippingFee: 0,
      totalAmount: 3000,
      status: 'DELIVERED',
      paymentMethod: 'KHALTI',
      paymentStatus: 'COMPLETED',
    },
  });
  ids.order = order.id;

  for (const product of [withMain, galleryOnly]) {
    const inventory = await prisma.productInventory.create({
      data: {
        productId: product.id,
        colorVariantName: 'Red',
        size: 'M',
        sku: `TRSKU-${stamp()}`,
        quantity: 10,
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        inventoryId: inventory.id,
        vendorId: vendorProfile.id,
        productName: 'To Review Tee',
        colorVariantName: 'Red',
        size: 'M',
        unitPrice: 1500,
        quantity: 1,
        subtotal: 1500,
        itemStatus: 'DELIVERED',
      },
    });
  }
});

afterEach(async () => {
  if (ids.order) {
    await prisma.orderItem.deleteMany({ where: { orderId: ids.order } });
    await prisma.order.deleteMany({ where: { id: ids.order } });
  }
});

describe('to-review tile image — the storefront cover, not a blank one', () => {
  it('uses mainImages[0] for a product that has one', async () => {
    const { items } = await reviewRepository.findToReviewItemsByUser(ids.customer);
    const line = items.find((i) => i.productId === withMain.id);
    expect(line?.productImage).toBe('products/review-shared-cover.jpg');
  });

  it('falls back to the colour gallery for a product with no mainImages', async () => {
    const { items } = await reviewRepository.findToReviewItemsByUser(ids.customer);
    const line = items.find((i) => i.productId === galleryOnly.id);
    // Was '' before: the select never loaded colorVariants, so the canonical
    // fallback could not resolve and the tile rendered blank.
    expect(line?.productImage).toBe('products/review-green-1.jpg');
  });

  it('agrees with resolveCover on the same stored input for both products', async () => {
    const { items } = await reviewRepository.findToReviewItemsByUser(ids.customer);
    for (const product of [withMain, galleryOnly]) {
      const line = items.find((i) => i.productId === product.id);
      expect(line?.productImage).toBe(
        resolveCover(product.mainImages, product.colorVariants) ?? '',
      );
    }
  });

  it('never emits a blank tile for a product that has a picture somewhere', async () => {
    const { items } = await reviewRepository.findToReviewItemsByUser(ids.customer);
    for (const line of items) {
      expect(line.productImage).not.toBe('');
    }
  });
});
