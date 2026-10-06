import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import { Prisma } from '@/config/db.prisma';
import { CheckoutService } from '@/modules/order/checkout/checkout.service';

/**
 * Checkout prices delivery from the courier, one parcel per seller.
 *
 * It used to charge one hand-entered band fee to everyone, which was wrong in both
 * directions at once: the same fee for a 500 g jacket to Baneshwor as for a 9 kg
 * coat to Biratnagar, and one fee for a basket holding two sellers' goods when
 * that is two pickups. Neither could be reconciled against a courier invoice.
 *
 * What stays ours is the free-delivery threshold and the COD ceiling. Both now
 * apply to the courier's number rather than replacing it, so delivery given away
 * still costs what it always cost.
 */

const { mockPolicy, mockThresholdForAddress, mockCoverageForAddress, mockQuote, mockForZoneId } =
  vi.hoisted(() => ({
    mockPolicy: vi.fn(),
    mockThresholdForAddress: vi.fn(),
    mockCoverageForAddress: vi.fn(),
    mockQuote: vi.fn(),
    mockForZoneId: vi.fn(),
  }));

vi.mock('@/modules/platform-settings/platform-settings.service', () => ({
  PlatformSettingsService: class {
    getCommercePolicy = mockPolicy;
  },
  platformSettingsService: { getCommercePolicy: mockPolicy },
}));

vi.mock('@/modules/logistics/delivery-pricing.repository', () => ({
  UNRESOLVED_FREE_DELIVERY_THRESHOLD: 5000,
  deliveryPricingRepository: { thresholdForAddress: mockThresholdForAddress },
}));

vi.mock('@/modules/logistics/delivery-coverage.repository', () => ({
  deliveryCoverageRepository: { coverageForAddress: mockCoverageForAddress },
}));

vi.mock('@/modules/logistics/delivery-quote.service', () => ({
  DeliveryQuoteService: class {},
  deliveryQuoteService: { quote: mockQuote },
}));

vi.mock('@/modules/logistics/courier-destination.repository', () => ({
  courierDestinationRepository: { forZoneId: mockForZoneId },
  UnresolvableDestinationError: class UnresolvableDestinationError extends Error {},
}));

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ADDRESS_ID = '44444444-4444-4444-8444-444444444444';

/** The fields checkout must persist with every order. */
interface CreatedOrderArgs {
  shippingFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  absorbedShippingCost: Prisma.Decimal;
  deliveryPricingSource: string;
  codHandlingFee: Prisma.Decimal;
  amountToCollect: Prisma.Decimal | null;
  logisticsZoneId: string | null;
  totalBillableWeightKg: Prisma.Decimal;
}

interface LineSpec {
  vendorId: string;
  unitPrice: number;
  unitWeightKg: number;
  quantity?: number;
}

/**
 * The courier's answer: one fee per parcel it was asked about.
 *
 * Keyed by seller rather than a single number, because the bug being fixed here is
 * precisely a basket being priced as if it were one pickup.
 */
function courierQuotesBySeller(fees: Record<string, string>) {
  return (input: { parcels: { vendorId: string; declaredWeightKg: Prisma.Decimal }[] }) =>
    Promise.resolve({
      totalCourierFee: Object.values(fees).reduce(
        (total, fee) => total.plus(new Prisma.Decimal(fee)),
        new Prisma.Decimal(0),
      ),
      parcels: input.parcels.map((parcel) => ({
        ...parcel,
        goodsAmount: new Prisma.Decimal(0),
        deliveryFee: new Prisma.Decimal(fees[parcel.vendorId] ?? '0'),
        planId: 1,
        lineIds: [],
        cached: false,
        codPercentage: new Prisma.Decimal('0.01'),
      })),
      codPercentage: new Prisma.Decimal('0.01'),
      currency: 'NPR',
    });
}

function buildService(lines: LineSpec[]) {
  const products = lines.map((line, index) => ({
    id: `prod-${index + 1}`,
    name: `Product ${index + 1}`,
    price: line.unitPrice,
    discountedPrice: null,
    vendorId: line.vendorId,
    isActive: true,
    packageWeightKg: line.unitWeightKg,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
  }));

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
        items: lines.map((line, index) => ({
          id: `line-${index + 1}`,
          quantity: line.quantity ?? 1,
          inventory: {
            id: `inv-${index + 1}`,
            productId: `prod-${index + 1}`,
            quantity: 10,
            reservedQuantity: 0,
            size: 'M',
            colorVariantName: 'Black',
          },
        })),
      }),
      findCheckoutProducts: vi.fn().mockResolvedValue(products),
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
    {
      initiatePayment: vi.fn().mockResolvedValue({}),
      getPaymentGateway: vi.fn().mockReturnValue({
        init: vi.fn().mockResolvedValue({ redirectUrl: 'https://gateway.test/pay' }),
        createPaymentIntent: vi.fn().mockResolvedValue({ redirectUrl: 'https://gateway.test/pay' }),
      }),
    } as never,
    { findOrderById: vi.fn().mockResolvedValue(null) } as never,
    {
      notifyOrderStatus: vi.fn().mockResolvedValue(undefined),
      notifyNewOrderForAdminsAndVendors: vi.fn().mockResolvedValue(undefined),
    } as never,
  );

  return { service, createOrderWithReservation };
}

const oneJacket: LineSpec[] = [{ vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.5 }];

const input = { addressId: ADDRESS_ID, paymentMethod: 'COD' as const, idempotencyKey: 'k1' };

const orderArg = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls[0]![0] as unknown as CreatedOrderArgs;

describe('checkout prices delivery from the courier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockForZoneId.mockResolvedValue({
      cityExternalId: 79,
      zoneExternalId: 1326,
      cityName: 'Pokhara',
      zoneName: 'Pokhara',
    });
    mockQuote.mockImplementation(courierQuotesBySeller({ 'vendor-1': '150' }));
  });

  it('charges what the courier quoted and records where it came from', async () => {
    const { service, createOrderWithReservation } = buildService(oneJacket);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(150)).toBe(true);
    expect(data.deliveryPricingSource).toBe('COURIER_QUOTE');
    // The courier cost is recorded next to the customer charge, because a dispute
    // is about the difference between them.
    expect(data.courierFee.equals(150)).toBe(true);
  });

  // The case the whole exercise exists for.
  it('charges a fee per seller, not one for the basket', async () => {
    mockQuote.mockImplementation(courierQuotesBySeller({ 'vendor-1': '150', 'vendor-2': '210' }));

    const { service, createOrderWithReservation } = buildService([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.5 },
      { vendorId: 'vendor-2', unitPrice: 900, unitWeightKg: 0.9 },
    ]);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(360)).toBe(true);
    expect(data.courierFee.equals(360)).toBe(true);
  });

  it("sends one parcel per seller, merged across that seller's lines", async () => {
    const { service } = buildService([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.5 },
      { vendorId: 'vendor-1', unitPrice: 400, unitWeightKg: 0.2 },
      { vendorId: 'vendor-2', unitPrice: 900, unitWeightKg: 0.9 },
    ]);

    await service.checkout(USER_ID, input);

    const quoted = mockQuote.mock.calls[0]![0] as {
      parcels: { vendorId: string; declaredWeightKg: Prisma.Decimal }[];
    };
    expect(quoted.parcels).toHaveLength(2);
    expect(quoted.parcels[0]!.declaredWeightKg.toFixed(3)).toBe('0.700');
  });

  it('prices against the destination the address resolved to', async () => {
    const { service } = buildService(oneJacket);

    await service.checkout(USER_ID, input);

    const quoted = mockQuote.mock.calls[0]![0] as {
      recipientCityExternalId: number;
      recipientZoneExternalId: number;
      storeId: number;
    };
    expect(quoted.recipientZoneExternalId).toBe(1326);
    expect(quoted.recipientCityExternalId).toBe(79);
  });

  it('waives the customer fee at the threshold but still records what the courier cost', async () => {
    // The cart is one 1200 jacket, so a 1000 threshold waives delivery.
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(1000),
    });
    const { service, createOrderWithReservation } = buildService(oneJacket);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.shippingFee.equals(0)).toBe(true);
    expect(data.courierFee.equals(150)).toBe(true);
    // Nothing is charged for delivery, but the courier still costs 150 and still
    // charges 1% of the 1200 it collects. Both are ours.
    expect(data.codHandlingFee.toFixed(2)).toBe('12.00');
    expect(data.absorbedShippingCost.toFixed(2)).toBe('162.00');
  });

  it('adds the handling fee and tells the courier what to collect', async () => {
    const { service, createOrderWithReservation } = buildService(oneJacket);

    await service.checkout(USER_ID, input);

    // 1200 goods + 150 delivery = 1350 collected, and the courier's 1% of that is
    // 13.50. The customer pays 1363.50 and the courier is told to take 1350.
    const data = orderArg(createOrderWithReservation);
    expect(data.codHandlingFee.toFixed(2)).toBe('13.50');
    expect(data.amountToCollect!.toFixed(2)).toBe('1350.00');
    expect(data.totalAmount.toFixed(2)).toBe('1363.50');
  });

  it('tells the courier to collect nothing on a prepaid order', async () => {
    const { service, createOrderWithReservation } = buildService(oneJacket);

    await service.checkout(USER_ID, { ...input, paymentMethod: 'ESEWA' });

    const data = orderArg(createOrderWithReservation);
    expect(data.amountToCollect).toBeNull();
    expect(data.codHandlingFee.toFixed(2)).toBe('0.00');
  });

  it('refuses an address it cannot resolve, rather than quoting a wrong price', async () => {
    // The courier answers an unknown zone with a successful, wrong price, so the
    // only defence is refusing to ask.
    const { UnresolvableDestinationError } = await import(
      '@/modules/logistics/courier-destination.repository'
    );
    mockForZoneId.mockRejectedValue(
      new UnresolvableDestinationError(
        'We could not confirm delivery to this area. Please re-select your district so we can check.',
      ),
    );
    const { service, createOrderWithReservation } = buildService(oneJacket);

    // A 400 with something the customer can act on, not a 500 that reads as our
    // fault and tells them nothing about what to change.
    await expect(service.checkout(USER_ID, input)).rejects.toBeInstanceOf(AppError);
    expect(createOrderWithReservation).not.toHaveBeenCalled();
    expect(mockQuote).not.toHaveBeenCalled();
  });

  it('refuses to place the order when the courier will not quote', async () => {
    mockQuote.mockRejectedValue(new Error('courier unavailable'));

    const { service, createOrderWithReservation } = buildService(oneJacket);

    await expect(service.checkout(USER_ID, input)).rejects.toThrow('courier unavailable');
    expect(createOrderWithReservation).not.toHaveBeenCalled();
  });

  it('snapshots the parcel weight, zone and pricing source on the order', async () => {
    const { service, createOrderWithReservation } = buildService(oneJacket);

    await service.checkout(USER_ID, input);

    const data = orderArg(createOrderWithReservation);
    expect(data.totalBillableWeightKg.equals(0.5)).toBe(true);
    expect(data.logisticsZoneId).toBe('zone-1');
    expect(data.deliveryPricingSource).toBe('COURIER_QUOTE');
  });

  it('prices the courier on the declared weight, not a volumetric guess', async () => {
    // The courier has no volumetric input at all and prices what the seller
    // declares. Feeding it a computed maximum would charge more for packing than
    // the courier ever asked.
    const { service } = buildService([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.7, quantity: 3 },
    ]);

    await service.checkout(USER_ID, input);

    const quoted = mockQuote.mock.calls[0]![0] as {
      parcels: { declaredWeightKg: Prisma.Decimal }[];
    };
    expect(quoted.parcels[0]!.declaredWeightKg.toFixed(3)).toBe('2.100');
  });
});
