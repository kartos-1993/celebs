import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/config/db.prisma';
import { CheckoutService } from '@/modules/order/checkout/checkout.service';

/**
 * Checkout prices delivery from the rate card against the parcel's actual
 * billable weight.
 *
 * Until now it charged one flat platform fee to everyone. That number had nothing
 * to do with how far the parcel travels or how heavy it is, so a 500 g jacket to
 * Baneshwor paid the same as a 9 kg coat to Biratnagar — and the courier invoice
 * for either one had nothing we could reconcile against.
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

/** The fields checkout must persist with every order. */
interface CreatedOrderArgs {
  shippingFee: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  absorbedShippingCost: Prisma.Decimal;
  deliveryPricingSource: string;
  matchedShippingRateId: string | null;
  logisticsZoneId: string | null;
  totalBillableWeightKg: Prisma.Decimal;
}

const rate = (over: Record<string, unknown> = {}) => ({
  id: 'rate-1',
  cityId: null,
  minWeightKg: new Prisma.Decimal(0),
  maxWeightKg: new Prisma.Decimal(10),
  fee: new Prisma.Decimal(80),
  codFee: new Prisma.Decimal(0),
  isActive: true,
  ...over,
});

/** One jacket of `unitWeightKg`, so the test controls the parcel weight exactly. */
function buildService(unitWeightKg: number, quantity = 1) {
  const product = {
    id: 'prod-1',
    name: 'Jacket',
    price: 1200,
    discountedPrice: null,
    vendorId: 'vendor-1',
    isActive: true,
    packageWeightKg: unitWeightKg,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
  };

  const createOrderWithReservation = vi.fn().mockResolvedValue({
    id: 'order-1',
    orderNumber: 'ORD-1',
    items: [],
    vendorId: 'vendor-1',
  });

  const service = new CheckoutService(
    {
      findIdempotencyKey: vi.fn().mockResolvedValue(null),
      findCartWithItemsByUserId: vi.fn().mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            id: 'line-1',
            quantity,
            inventory: {
              id: 'inv-1',
              productId: product.id,
              quantity: 10,
              reservedQuantity: 0,
              size: 'M',
              colorVariantName: 'Black',
            },
          },
        ],
      }),
      findCheckoutProducts: vi.fn().mockResolvedValue([product]),
      createOrderWithReservation,
      updateIdempotencyKeyResponse: vi.fn().mockResolvedValue(undefined),
    } as never,
    {
      findAddressById: vi.fn().mockResolvedValue({
        id: ADDRESS_ID,
        isDefault: true,
        logisticsZoneId: 'zone-1',
      }),
    } as never,
    { createPayment: vi.fn().mockResolvedValue({}) } as never,
    { initiatePayment: vi.fn().mockResolvedValue({}) } as never,
    { findOrderById: vi.fn().mockResolvedValue(null) } as never,
    {
      notifyOrderStatus: vi.fn().mockResolvedValue(undefined),
      notifyNewOrderForAdminsAndVendors: vi.fn().mockResolvedValue(undefined),
    } as never,
  );

  return { service, createOrderWithReservation };
}

const input = { addressId: ADDRESS_ID, paymentMethod: 'COD' as const, idempotencyKey: 'k1' };

const orderArg = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls[0]![0] as unknown as CreatedOrderArgs;

describe('checkout prices delivery from the rate card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Below the threshold, so the fee is actually charged and visible.
    mockPolicy.mockResolvedValue({ codMaxLimit: 5000, flatShippingFee: 150 });
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(2500),
    });
    mockCoverageForAddress.mockResolvedValue({
      status: 'COVERED',
      isValley: true,
      zoneId: 'zone-1',
      zoneName: 'Baneshwor',
      cityName: 'Kathmandu',
      needsZoneSelection: false,
    });
    mockActiveRates.mockResolvedValue([
      rate({ id: 'light', maxWeightKg: new Prisma.Decimal(1) }),
      rate({
        id: 'heavy',
        minWeightKg: new Prisma.Decimal(1),
        maxWeightKg: new Prisma.Decimal(10),
      }),
    ]);
  });

  it('charges the light band for a light parcel instead of the flat fee', async () => {
    const { service, createOrderWithReservation } = buildService(0.5);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(80)).toBe(true);
    expect(data.deliveryPricingSource).toBe('RATE_CARD');
    expect(data.matchedShippingRateId).toBe('light');
  });

  it('charges the heavier band for a heavier parcel', async () => {
    // The whole point of a rate card: a 4 kg parcel must not cost the same as a
    // 500 g one. Same cart, same threshold, different parcel.
    mockActiveRates.mockResolvedValue([
      rate({ id: 'light', maxWeightKg: new Prisma.Decimal(1) }),
      rate({ id: 'heavy', minWeightKg: new Prisma.Decimal(1), fee: new Prisma.Decimal(240) }),
    ]);
    const { service, createOrderWithReservation } = buildService(4);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(240)).toBe(true);
    expect(data.matchedShippingRateId).toBe('heavy');
  });

  it('falls back to the platform fee when the card has no band for the parcel', async () => {
    // A gap in the rate card must never price a shipment at zero.
    mockActiveRates.mockResolvedValue([
      rate({ minWeightKg: new Prisma.Decimal(20), maxWeightKg: new Prisma.Decimal(30) }),
    ]);
    const { service, createOrderWithReservation } = buildService(4);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(150)).toBe(true);
    expect(data.deliveryPricingSource).toBe('FALLBACK');
    expect(data.matchedShippingRateId).toBeNull();
  });

  it('waives the customer fee at the threshold but still records what it cost us', async () => {
    // The cart is one 1200 jacket, so a 1000 threshold waives delivery.
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(1000),
    });
    mockActiveRates.mockResolvedValue([rate({ fee: new Prisma.Decimal(80) })]);
    const { service, createOrderWithReservation } = buildService(0.5);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(0)).toBe(true);
    expect(data.courierFee.equals(80)).toBe(true);
    expect(data.absorbedShippingCost.equals(80)).toBe(true);
  });

  it('snapshots the parcel weight, zone and pricing rule on the order', async () => {
    const { service, createOrderWithReservation } = buildService(0.5);

    await service.checkout(USER_ID, input);

    // A courier is billed on the weight and zone we quoted, so both have to be
    // recorded rather than re-derived later from a product that may have changed.
    const data = orderArg(createOrderWithReservation);
    expect(data.totalBillableWeightKg.equals(0.5)).toBe(true);
    expect(data.logisticsZoneId).toBe('zone-1');
    expect(data.deliveryPricingSource).toBe('RATE_CARD');
  });

  it('records the parcel weight exactly, to the stored precision', async () => {
    // 0.7 kg x 3 items is 2.0999999999999996 as a double. The snapshot and the
    // band lookup both have to see 2.100.
    mockActiveRates.mockResolvedValue([
      rate({ id: 'light', maxWeightKg: new Prisma.Decimal(2.1) }),
      rate({ id: 'heavy', minWeightKg: new Prisma.Decimal(2.1) }),
    ]);
    const { service, createOrderWithReservation } = buildService(0.7, 3);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.totalBillableWeightKg.toFixed(3)).toBe('2.100');
    // Exactly on the boundary belongs to the higher, more expensive band.
    expect(data.matchedShippingRateId).toBe('heavy');
  });
});
