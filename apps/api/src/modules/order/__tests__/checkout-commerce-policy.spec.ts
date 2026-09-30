import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS, isCodAllowed, resolveShippingFee } from '@celebs/shared-types';
import { AppError } from '@celebs/shared-utils';

import { Prisma } from '@/config/db.prisma';
import { CheckoutService } from '@/modules/order/checkout/checkout.service';

/**
 * Checkout is the authority on money, so these assertions pin the two rules it
 * must never get wrong: what the delivery fee is, and when cash on delivery is
 * refused. Both numbers are now read from the commerce policy rather than
 * hardcoded, so a change in the admin panel moves them without a deploy.
 */

const { mockPolicy, mockThresholdForAddress, mockActiveRates, mockCoverageForAddress } = vi.hoisted(
  () => ({
    mockPolicy: vi.fn(),
    mockThresholdForAddress: vi.fn(),
    mockActiveRates: vi.fn(),
    mockCoverageForAddress: vi.fn(),
  }),
);

vi.mock('@/modules/platform-settings/platform-settings.service', () => ({
  PlatformSettingsService: class {
    getCommercePolicy = mockPolicy;
  },
  platformSettingsService: { getCommercePolicy: mockPolicy },
}));

vi.mock('@/modules/logistics/delivery-pricing.repository', () => ({
  UNRESOLVED_FREE_DELIVERY_THRESHOLD: 5000,
  deliveryPricingRepository: {
    thresholdForAddress: mockThresholdForAddress,
    activeRates: mockActiveRates,
  },
}));

vi.mock('@/modules/logistics/delivery-coverage.repository', () => ({
  deliveryCoverageRepository: { coverageForAddress: mockCoverageForAddress },
}));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ADDRESS_ID = '44444444-4444-4444-8444-444444444444';

function buildService(overrides: {
  subtotal: number;
  quantity?: number;
  product?: Record<string, unknown>;
}) {
  const product = {
    id: 'prod-1',
    name: 'Jacket',
    price: overrides.subtotal,
    discountedPrice: null,
    vendorId: 'vendor-1',
    isActive: true,
    packageWeightKg: 0.5,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
    ...overrides.product,
  };

  // The cart line carries an inventory reference and a quantity; the service
  // resolves product rows through its own batched lookup.
  const cartItem = {
    id: 'line-1',
    quantity: overrides.quantity ?? 1,
    inventory: {
      id: 'inv-1',
      productId: product.id,
      quantity: 10,
      reservedQuantity: 0,
      size: 'M',
      colorVariantName: 'Black',
    },
  };

  const createOrderWithReservation = vi.fn().mockResolvedValue({ id: 'order-1' });

  const service = new CheckoutService(
    {
      findIdempotencyKey: vi.fn().mockResolvedValue(null),
      findCartWithItemsByUserId: vi.fn().mockResolvedValue({ id: 'cart-1', items: [cartItem] }),
      findCheckoutProducts: vi.fn().mockResolvedValue([product]),
      createOrderWithReservation,
      updateIdempotencyKeyResponse: vi.fn().mockResolvedValue(undefined),
    } as never,
    {
      findAddressById: vi.fn().mockResolvedValue({ id: ADDRESS_ID, isDefault: true }),
    } as never,
    { createPayment: vi.fn().mockResolvedValue({}) } as never,
    { initiatePayment: vi.fn().mockResolvedValue({}) } as never,
    { findOrderById: vi.fn().mockResolvedValue(null) } as never,
    { sendOrderPlaced: vi.fn().mockResolvedValue(undefined) } as never,
    { getCommercePolicy: mockPolicy } as never,
  );

  return { service, createOrderWithReservation };
}

const baseInput = {
  addressId: ADDRESS_ID,
  paymentMethod: 'COD' as const,
  idempotencyKey: 'key-1',
};

describe('checkout charges from the commerce policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicy.mockResolvedValue({ ...COMMERCE_POLICY_DEFAULTS });
    // No rate bands, so these assertions stay about the policy fallback fee.
    // Rate-card pricing has its own spec.
    mockActiveRates.mockResolvedValue([]);
    // A default zone threshold of 3000 keeps the original assertions meaningful;
    // the per-zone cases override it.
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(3000),
      absorbedCost: 0,
    });
    mockCoverageForAddress.mockResolvedValue({
      status: 'COVERED',
      isValley: true,
      zoneId: 'zone-1',
      zoneName: 'Kathmandu',
      cityName: 'Kathmandu',
      needsZoneSelection: false,
    });
  });

  it('waives delivery on the threshold, matching what the app displays', async () => {
    // The app used `>=` and the server `>`, so a cart sitting exactly on the
    // threshold was promised free delivery and then billed for it.
    const { service, createOrderWithReservation } = buildService({ subtotal: 3000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    expect(call?.shippingFee.toNumber()).toBe(0);
  });

  it('charges the flat fee below the threshold', async () => {
    const { service, createOrderWithReservation } = buildService({ subtotal: 2000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    expect(call?.shippingFee.toNumber()).toBe(150);
  });

  it('follows what an admin changed, with no code change', async () => {
    // The threshold is the zone's, so an admin raising the out-of-valley
    // promise changes the charge without a deploy.
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-2',
      zoneId: 'zone-2',
      cityName: 'Biratnagar',
      isValley: false,
      freeDeliveryThreshold: new Prisma.Decimal(8000),
      absorbedCost: 0,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 4000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    expect(call?.shippingFee.toNumber()).toBe(150);
  });

  it('follows a changed fallback fee when no rate band matches', async () => {
    mockPolicy.mockResolvedValue({ codMaxLimit: 9000, flatShippingFee: 250 });
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(9000),
      absorbedCost: 0,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 4000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    expect(call?.shippingFee.toNumber()).toBe(250);
  });

  it('honours a zero flat fee set by an admin', async () => {
    mockPolicy.mockResolvedValue({
      codMaxLimit: 5000,
      freeShippingThreshold: 3000,
      flatShippingFee: 0,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 500 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    expect(call?.shippingFee.toNumber()).toBe(0);
  });

  it('refuses cash on delivery above the configured ceiling', async () => {
    mockPolicy.mockResolvedValue({
      codMaxLimit: 1000,
      freeShippingThreshold: 3000,
      flatShippingFee: 150,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 2000 });

    await expect(service.checkout(USER_ID, baseInput)).rejects.toThrow(AppError);
    expect(createOrderWithReservation).not.toHaveBeenCalled();
  });

  it('allows cash on delivery exactly on the ceiling', async () => {
    // The ceiling applies to the order TOTAL, so a 2000 subtotal below the
    // free-delivery threshold becomes 2150 with delivery.
    mockPolicy.mockResolvedValue({
      codMaxLimit: 2150,
      freeShippingThreshold: 3000,
      flatShippingFee: 150,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 2000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    expect(createOrderWithReservation).toHaveBeenCalled();
  });

  it('measures the ceiling against the total, not the subtotal', async () => {
    // Same subtotal as the test above, ceiling one rupee lower. Delivery pushes
    // the total over it, so cash on delivery must be refused.
    mockPolicy.mockResolvedValue({
      codMaxLimit: 2149,
      freeShippingThreshold: 3000,
      flatShippingFee: 150,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 2000 });

    await expect(service.checkout(USER_ID, baseInput)).rejects.toThrow(AppError);
    expect(createOrderWithReservation).not.toHaveBeenCalled();
  });

  it('reads the policy once per checkout', async () => {
    const { service } = buildService({ subtotal: 2000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    expect(mockPolicy).toHaveBeenCalledTimes(1);
  });

  it('agrees with the shared rule the app calls', () => {
    // Guards against checkout re-deriving its own comparison and drifting from
    // the display rule again.
    const policy = COMMERCE_POLICY_DEFAULTS;
    expect(resolveShippingFee(3000, policy, 3000)).toBe(0);
    expect(isCodAllowed(5000, policy)).toBe(true);
    expect(isCodAllowed(5001, policy)).toBe(false);
  });

  // The threshold is the destination's, not a platform-wide number: delivery
  // outside the valley costs the courier far more, so the promise starts higher.
  it('applies the threshold of the destination zone, not a global one', async () => {
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-2',
      zoneId: 'zone-2',
      cityName: 'Biratnagar',
      isValley: false,
      freeDeliveryThreshold: new Prisma.Decimal(5000),
      absorbedCost: 0,
    });
    const { service, createOrderWithReservation } = buildService({ subtotal: 3000 });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const call = createOrderWithReservation.mock.calls[0]?.[0];
    // 3000 clears the valley threshold but not the out-of-valley one.
    expect(call?.shippingFee.toNumber()).toBe(150);
  });

  it('snapshots the billable weight onto the order item', async () => {
    // A courier quote is derived from weight, and a product's weight can change
    // after the order is placed. The weight that was paid for has to ship.
    // 1200 x 3 keeps the order under the COD ceiling so checkout completes.
    const { service, createOrderWithReservation } = buildService({
      subtotal: 1200,
      quantity: 3,
      product: { packageWeightKg: 1.2 },
    });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const item = createOrderWithReservation.mock.calls[0]?.[0]?.items?.[0];
    expect(item?.unitWeightKg.toNumber()).toBe(1.2);
    // 1.2 kg x 3 units
    expect(item?.billableWeightKg.toNumber()).toBeCloseTo(3.6, 3);
  });

  it('never snapshots a zero weight for a product that never had one', async () => {
    // The pre-existing default of 0.3 kg sat below the 0.5 kg every courier
    // enforces, so a legacy product must still be quoted, not rejected.
    const { service, createOrderWithReservation } = buildService({
      subtotal: 2000,
      product: { packageWeightKg: null },
    });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const item = createOrderWithReservation.mock.calls[0]?.[0]?.items?.[0];
    expect(item?.unitWeightKg.toNumber()).toBe(0.5);
    expect(item?.billableWeightKg.toNumber()).toBe(0.5);
  });

  it('uses volumetric weight when a bulky product outweighs its mass', async () => {
    const { service, createOrderWithReservation } = buildService({
      subtotal: 2000,
      product: {
        packageWeightKg: 0.6,
        packageLengthCm: 50,
        packageWidthCm: 30,
        packageHeightCm: 10,
      },
    });

    await service.checkout(USER_ID, baseInput).catch(() => undefined);

    const item = createOrderWithReservation.mock.calls[0]?.[0]?.items?.[0];
    // 50 x 30 x 10 / 5000 = 3 kg, which beats 0.6 kg of mass
    expect(item?.billableWeightKg.toNumber()).toBeCloseTo(3, 3);
  });
});
