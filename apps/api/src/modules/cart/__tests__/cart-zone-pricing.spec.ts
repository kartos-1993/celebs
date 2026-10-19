import { afterAll, describe, expect, it } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS } from '@celebs/shared-types';

import { Prisma } from '@/config/db.prisma';
import prisma from '@/config/db.prisma';
import { CartService } from '@/modules/cart/cart.service';

/**
 * The cart shows a shopper what they will pay. Checkout prices delivery against
 * the destination zone and the parcel's actual weight, so a cart that quotes a
 * flat platform fee is showing a number the customer will not be charged.
 *
 * When the customer already has a default address with a delivery zone, the cart
 * quotes against that zone, so the figure on screen is the figure on the invoice.
 * When there is no zone yet it still quotes conservatively, but now says so, so
 * the app can label it rather than presenting an estimate as a price.
 */

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdProductIds: string[] = [];
const categoryIds: string[] = [];
const sessionIds: string[] = [];
const userIds: string[] = [];
const cityIds: string[] = [];
const rateIds: string[] = [];

async function seedProduct(price: number, weightKg = 0.5): Promise<string> {
  const category = await prisma.category.create({
    data: { name: `Zone Cart Cat ${stamp()}`, slug: `zone-cart-cat-${stamp()}` },
  });
  categoryIds.push(category.id);

  const product = await prisma.product.create({
    data: {
      name: `Zone Cart Tee ${stamp()}`,
      slug: `zone-cart-tee-${stamp()}`,
      brand: 'Celebs',
      price,
      status: 'published',
      categoryId: category.id,
      packageWeightKg: weightKg,
      colorVariants: [
        { name: 'Red', images: ['products/red-1.jpg'], stocks: [{ size: 'M', quantity: 20 }] },
      ],
    },
    select: { id: true },
  });
  createdProductIds.push(product.id);
  return product.id;
}

/** A user whose default address sits in a deliverable zone. */
async function seedCustomerWithDefaultAddress(options: {
  freeDeliveryThreshold: number;
  isValley: boolean;
}) {
  const user = await prisma.user.create({
    data: {
      name: 'Zone Cart Customer',
      email: `zone-cart-${stamp()}@celebs.com.np`,
      password: 'hashed-not-used-here',
      isEmailVerified: true,
    },
  });
  userIds.push(user.id);

  const city = await prisma.logisticsCity.create({
    data: {
      name: `Zone Cart City ${stamp()}`,
      province: 'Bagmati',
      isValley: options.isValley,
      freeDeliveryThreshold: options.freeDeliveryThreshold,
      // An active zone on an active city is what makes this a destination; the
      // courier-sync fields mirror how production rows arrive.
      source: 'COURIER',
      externalId: Math.floor(Math.random() * 900000) + 100000,
      syncedAt: new Date(),
    },
    select: { id: true, name: true },
  });
  cityIds.push(city.id);
  const districtName = city.name;

  const zone = await prisma.logisticsZone.create({
    data: {
      cityId: city.id,
      externalId: Math.floor(Math.random() * 900000) + 100000,
      name: `Zone Cart Zone ${stamp()}`,
    },
    select: { id: true },
  });

  await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Home',
      fullName: 'Zone Cart Customer',
      phone: '9800000000',
      province: 'Bagmati',
      district: districtName,
      cityArea: 'Somewhere',
      streetAddress: 'House 1',
      isDefault: true,
      logisticsZoneId: zone.id,
    },
  });

  return { userId: user.id, cityId: city.id };
}

async function seedRate(cityId: string | null, fee: string, min: number, max: number) {
  const rate = await prisma.shippingRate.create({
    data: {
      cityId,
      minWeightKg: new Prisma.Decimal(min),
      maxWeightKg: new Prisma.Decimal(max),
      fee: new Prisma.Decimal(fee),
      codFee: new Prisma.Decimal(0),
    },
    select: { id: true },
  });
  rateIds.push(rate.id);
}

async function cartForUser(userId: string, productId: string, quantity: number) {
  const sessionId = `zone-cart-${stamp()}`;
  sessionIds.push(sessionId);
  return CartService.addToCart(userId, sessionId, {
    productId,
    colorVariantName: 'Red',
    size: 'M',
    quantity,
  });
}

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { sessionId: { in: sessionIds } } } });
  await prisma.cart.deleteMany({ where: { sessionId: { in: sessionIds } } });
  // A signed-in customer's cart is owned by the user, not the session, so it is
  // not covered by the filter above. These rows reference inventory, and an
  // inventory row blocks the product delete below.
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.shippingRate.deleteMany({ where: { id: { in: rateIds } } });
  await prisma.logisticsZone.deleteMany({ where: { cityId: { in: cityIds } } });
  await prisma.logisticsCity.deleteMany({ where: { id: { in: cityIds } } });
  await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
  await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('cart quotes against the default address when it can', () => {
  it('uses the destination threshold rather than the conservative one', async () => {
    // 3000 clears the in-valley threshold of 2500 but not the outside-valley
    // 5000. A cart quoting the higher number would promise a 150 fee that
    // checkout then waives.
    const productId = await seedProduct(1000, 0.5);
    const { userId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });

    const cart = await cartForUser(userId, productId, 3);

    expect(cart.subtotal).toBe(3000);
    expect(cart.freeDeliveryThreshold).toBe(2500);
    expect(cart.shippingFee).toBe(0);
    expect(cart.deliveryIsEstimate).toBe(false);
  });

  it('still charges when the cart is below its own zone threshold', async () => {
    const productId = await seedProduct(1200, 0.5);
    const { userId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });

    const cart = await cartForUser(userId, productId, 1);

    expect(cart.shippingFee).toBe(COMMERCE_POLICY_DEFAULTS.flatShippingFee);
  });

  it('prices from the destination rate card, preferring the district band over the general one', async () => {
    // The cart is quoted against the customer's own zone, so the band that
    // prices it is the destination's. A general band may stand behind it, but
    // the district one answers first.
    const productId = await seedProduct(1200, 4);
    const { userId, cityId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });
    // Same weight bracket, two prices: only the district band may apply.
    await seedRate(null, '180', 4, 5);
    await seedRate(cityId, '260', 4, 5);

    const cart = await cartForUser(userId, productId, 1);

    expect(cart.shippingFee).toBe(260);
    // Not the general band, and not the platform flat fee.
    expect(cart.shippingFee).not.toBe(180);
    expect(cart.shippingFee).not.toBe(COMMERCE_POLICY_DEFAULTS.flatShippingFee);
  });

  it('quotes against the district on the default address, not a general one', async () => {
    // Measured: 0.9 kg is 150 to Pokhara and 210 to Bardibas. A cart that priced
    // without a district would show one city the other's answer.
    const productId = await seedProduct(1200, 0.5);
    const { userId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });

    const cart = await cartForUser(userId, productId, 1);

    // The fixture's zone resolves (active zone on an active city), so the quote
    // is against a real destination rather than the conservative fallback.
    expect(cart.deliveryIsEstimate).toBe(false);
  });

  it('charges the flat policy fee when no band matches the parcel weight', async () => {
    const productId = await seedProduct(1200, 4);
    const { userId, cityId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });
    // A band covering 8-10 kg, and a 4 kg parcel: it must not price it.
    await seedRate(cityId, '240', 8, 10);

    const cart = await cartForUser(userId, productId, 1);

    // A band whose weight does not match must never price the parcel; the
    // fallback is the platform's flat fee, and pricing the band's 240 would be
    // quoting a number no rule actually produces.
    expect(cart.shippingFee).toBe(COMMERCE_POLICY_DEFAULTS.flatShippingFee);
    expect(cart.shippingFee).not.toBe(240);
    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });

  it('flags the quote as an estimate when there is no address yet', async () => {
    const productId = await seedProduct(1000, 0.5);
    const sessionId = `zone-cart-anon-${stamp()}`;
    sessionIds.push(sessionId);

    const cart = await CartService.addToCart(undefined, sessionId, {
      productId,
      colorVariantName: 'Red',
      size: 'M',
      quantity: 3,
    });

    // No destination, so the conservative threshold is still the honest quote -
    // but the app has to be able to label it rather than presenting it as final.
    expect(cart.freeDeliveryThreshold).toBe(5000);
    expect(cart.deliveryIsEstimate).toBe(true);
  });

  it('ignores an address whose zone is inactive rather than quoting a dead zone', async () => {
    const productId = await seedProduct(1000, 0.5);
    const { userId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });
    await prisma.logisticsCity.updateMany({
      where: { id: { in: cityIds } },
      data: { isActive: false },
    });

    const cart = await cartForUser(userId, productId, 3);

    // An inactive destination is not a destination. The conservative threshold
    // and the estimate flag are both the honest answer.
    expect(cart.freeDeliveryThreshold).toBe(5000);
    expect(cart.deliveryIsEstimate).toBe(true);

    await prisma.logisticsCity.updateMany({
      where: { id: { in: cityIds } },
      data: { isActive: true },
    });
  });

  it('judges the subtotal against a threshold that carries paisa', async () => {
    // 2499.50 is the reason the threshold is Decimal. The boundary must fall
    // between a 2499.50 cart and a 2499.49 one, not at a rounded whole rupee.
    //
    // Two customers, because addToCart increments an existing cart: a second call
    // for the same user would be the same order with more items in it, not a
    // smaller one.
    const onThreshold = await seedProduct(1249.75, 0.5);
    const justUnder = await seedProduct(1249.49, 0.5);

    const atCustomer = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2499.5,
      isValley: true,
    });
    const belowCustomer = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2499.5,
      isValley: true,
    });

    const exact = await cartForUser(atCustomer.userId, onThreshold, 2);
    expect(exact.subtotal).toBe(2499.5);
    expect(exact.freeDeliveryThreshold).toBe(2499.5);
    // Exactly on the threshold, so delivery is waived.
    expect(exact.shippingFee).toBe(0);

    const under = await cartForUser(belowCustomer.userId, justUnder, 2);
    expect(under.subtotal).toBe(2498.98);
    // One paisa below the threshold, so it is still charged.
    expect(under.shippingFee).toBeGreaterThan(0);
  });

  it('keeps total equal to subtotal plus fee', async () => {
    const productId = await seedProduct(750, 0.5);
    const { userId } = await seedCustomerWithDefaultAddress({
      freeDeliveryThreshold: 2500,
      isValley: true,
    });

    const cart = await cartForUser(userId, productId, 2);

    expect(cart.total).toBe(cart.subtotal + cart.shippingFee);
  });
});
