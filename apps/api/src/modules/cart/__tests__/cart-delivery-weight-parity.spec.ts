import { afterAll, describe, expect, it } from 'vitest';

import { Prisma } from '@/config/db.prisma';
import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';

/**
 * Delivery is priced from ONE weight on both surfaces.
 *
 * Checkout bills the billable weight - mass versus volume, at the courier's
 * volumetric divisor. The cart priced the same delivery from the declared
 * weight alone, so a large, light product (a 40x30x20 cm box declares 0.5 kg
 * and occupies 4.8 kg of courier volume) landed in a cheaper band on the cart
 * than the one checkout charged. These tests pin the cart to the checkout
 * figure.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdProductIds: string[] = [];
const categoryIds: string[] = [];
const sessionIds: string[] = [];
const userIds: string[] = [];
const cityIds: string[] = [];

async function seedProduct(options: {
  price: number;
  weightKg: number;
  dimsCm?: [number, number, number];
}): Promise<string> {
  const category = await prisma.category.create({
    data: { name: `Weight Cart Cat ${stamp()}`, slug: `weight-cart-cat-${stamp()}` },
  });
  categoryIds.push(category.id);

  const product = await prisma.product.create({
    data: {
      name: `Weight Cart Tee ${stamp()}`,
      slug: `weight-cart-tee-${stamp()}`,
      brand: 'Celebs',
      price: options.price,
      status: 'published',
      categoryId: category.id,
      packageWeightKg: options.weightKg,
      packageLengthCm: options.dimsCm?.[0],
      packageWidthCm: options.dimsCm?.[1],
      packageHeightCm: options.dimsCm?.[2],
      colorVariants: [
        { name: 'Red', images: ['products/red-1.jpg'], stocks: [{ size: 'M', quantity: 20 }] },
      ],
    },
    select: { id: true },
  });
  createdProductIds.push(product.id);
  return product.id;
}

/** A user whose default address sits in a deliverable city. */
async function seedCustomerWithDefaultAddress() {
  const user = await prisma.user.create({
    data: {
      name: 'Weight Cart Customer',
      email: `weight-cart-${stamp()}@celebs.com.np`,
      password: 'hashed-not-used-here',
      isEmailVerified: true,
    },
  });
  userIds.push(user.id);

  const city = await prisma.logisticsCity.create({
    data: {
      name: `Weight Cart City ${stamp()}`,
      province: 'Bagmati',
      isValley: true,
      freeDeliveryThreshold: 2500,
      // Courier-synced, with the ids the courier prices on - the same shape the
      // cart fixture in cart-zone-pricing.spec.ts uses.
      source: 'COURIER',
      externalId: Math.floor(Math.random() * 900000) + 100000,
      syncedAt: new Date(),
    },
    select: { id: true, name: true },
  });
  cityIds.push(city.id);

  const zone = await prisma.logisticsZone.create({
    data: {
      cityId: city.id,
      externalId: Math.floor(Math.random() * 900000) + 100000,
      name: `Weight Cart Zone ${stamp()}`,
    },
    select: { id: true },
  });

  await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Home',
      fullName: 'Weight Cart Customer',
      phone: '9800000000',
      province: 'Bagmati',
      district: city.name,
      cityArea: 'Somewhere',
      streetAddress: 'House 1',
      isDefault: true,
      logisticsZoneId: zone.id,
    },
  });

  return { userId: user.id, cityId: city.id };
}

async function seedBand(cityId: string, fee: string, min: number, max: number) {
  await prisma.shippingRate.create({
    data: {
      cityId,
      minWeightKg: new Prisma.Decimal(min),
      maxWeightKg: new Prisma.Decimal(max),
      fee: new Prisma.Decimal(fee),
      codFee: new Prisma.Decimal(0),
    },
  });
}

async function cartForUser(userId: string, productId: string) {
  const sessionId = `weight-cart-${stamp()}`;
  sessionIds.push(sessionId);
  return CartService.addToCart(userId, sessionId, {
    productId,
    colorVariantName: 'Red',
    size: 'M',
    quantity: 1,
  });
}

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { sessionId: { in: sessionIds } } } });
  await prisma.cart.deleteMany({ where: { sessionId: { in: sessionIds } } });
  // A signed-in customer's cart is owned by the user, not the session, so it is
  // not covered by the filter above - and its CartItems block the product delete.
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.shippingRate.deleteMany({ where: { cityId: { in: cityIds } } });
  await prisma.logisticsZone.deleteMany({ where: { cityId: { in: cityIds } } });
  await prisma.logisticsCity.deleteMany({ where: { id: { in: cityIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('cart delivery pricing uses the same billable weight checkout bills', () => {
  it('prices a light-but-bulky parcel from its volumetric weight, not the declared one', async () => {
    // 40x30x20 cm is 4.8 kg volumetric at the 5000 divisor. Declared-weight
    // pricing shows the 100 band; the billable weight is in the 260 band.
    const productId = await seedProduct({ price: 1200, weightKg: 0.5, dimsCm: [40, 30, 20] });
    const { userId, cityId } = await seedCustomerWithDefaultAddress();
    await seedBand(cityId, '100', 0, 1);
    await seedBand(cityId, '260', 4, 5);

    const cart = await cartForUser(userId, productId);

    expect(cart.shippingFee).toBe(260);
    expect(cart.deliveryIsEstimate).toBe(false);
    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });

  it('still prices from the declared weight when it exceeds the volumetric one', async () => {
    // 4.5 kg declared with 10x10x10 cm (0.2 kg volumetric): the heavier of the
    // two drives the band. Volumetric-only pricing would show 100.
    const productId = await seedProduct({ price: 1200, weightKg: 4.5, dimsCm: [10, 10, 10] });
    const { userId, cityId } = await seedCustomerWithDefaultAddress();
    await seedBand(cityId, '100', 0, 1);
    await seedBand(cityId, '260', 4, 5);

    const cart = await cartForUser(userId, productId);

    expect(cart.shippingFee).toBe(260);
  });
});
