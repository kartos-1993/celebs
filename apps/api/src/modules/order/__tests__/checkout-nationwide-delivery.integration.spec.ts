import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import { Prisma } from '@/config/db.prisma';
import { CheckoutService } from '@/modules/order/checkout/checkout.service';

const { mockPolicy, mockThresholdForAddress, mockActiveRates, mockCoverageForAddress, mockQuote } =
  vi.hoisted(() => ({
    mockPolicy: vi.fn(),
    mockThresholdForAddress: vi.fn(),
    mockActiveRates: vi.fn(),
    mockCoverageForAddress: vi.fn(),
    mockQuote: vi.fn(),
  }));

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

vi.mock('@/modules/logistics/delivery-quote.service', () => ({
  DeliveryQuoteService: class {},
  deliveryQuoteService: { quote: mockQuote },
}));

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ADDRESS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

interface CreatedOrderRecord {
  shippingFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  absorbedShippingCost: Prisma.Decimal;
  deliveryPricingSource: string;
  subtotal: Prisma.Decimal;
  items: Array<{ unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal }>;
}

interface LineConfig {
  vendorId: string;
  unitPrice: number;
  unitWeightKg: number;
  quantity?: number;
  /** Per-unit combo discount written on the cart line by POST /cart/combos. */
  appliedDiscount?: number;
}

function createCheckoutTestHarness(lines: LineConfig[]) {
  const products = lines.map((line, index) => ({
    id: `prod-${index + 1}`,
    name: `Test Product ${index + 1}`,
    price: line.unitPrice,
    discountedPrice: null,
    vendorId: line.vendorId,
    isActive: true,
    packageWeightKg: line.unitWeightKg,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
    categoryId: 'cat-1',
    subcategoryId: 'subcat-1',
  }));

  const createOrderWithReservation = vi.fn().mockResolvedValue({
    id: 'ord-test-1',
    orderNumber: 'ORD-TEST-1',
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
          appliedDiscount:
            line.appliedDiscount !== undefined ? new Prisma.Decimal(line.appliedDiscount) : null,
          inventory: {
            id: `inv-${index + 1}`,
            productId: `prod-${index + 1}`,
            quantity: 10,
            reservedQuantity: 0,
            size: 'M',
            colorVariantName: 'Navy',
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
        fullName: 'Ram Bahadur',
        phone: '9841234567',
        streetAddress: 'New Road Gate',
        cityArea: 'New Road',
        district: 'Kathmandu',
        province: 'Bagmati',
        isDefault: true,
        logisticsZoneId: 'zone-ktm',
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

describe('Checkout Nationwide Delivery & Rate-Card Decoupling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPolicy.mockResolvedValue({
      flatShippingFee: 100,
      codMaxLimit: 10000,
      vatPercent: 0,
    });

    mockActiveRates.mockResolvedValue([]);
  });

  it('succeeds with flat valley fee when delivering within Kathmandu valley without calling external courier API', async () => {
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-ktm',
      zoneId: 'zone-ktm',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(3000),
    });

    mockActiveRates.mockResolvedValue([
      {
        id: 'rate-valley',
        cityId: 'city-ktm',
        minWeightKg: new Prisma.Decimal(0),
        maxWeightKg: new Prisma.Decimal(10),
        fee: new Prisma.Decimal(100),
        codFee: new Prisma.Decimal(0),
        isActive: true,
      },
    ]);

    const { service, createOrderWithReservation } = createCheckoutTestHarness([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.5 },
    ]);

    await service.checkout(USER_ID, {
      addressId: ADDRESS_ID,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-valley-1',
    });

    expect(createOrderWithReservation).toHaveBeenCalledTimes(1);
    const orderPayload = createOrderWithReservation.mock.calls[0]![0] as CreatedOrderRecord;

    expect(orderPayload.shippingFee.toNumber()).toBe(100);
    expect(orderPayload.totalAmount.toNumber()).toBe(1300);
    expect(orderPayload.deliveryPricingSource).toBe('RATE_CARD');

    // Crucial: zero outbound calls to live courier quoting API at checkout
    expect(mockQuote).not.toHaveBeenCalled();
  });

  it('succeeds with outer-valley fee for remote district without requiring Pathao mapping', async () => {
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-jumla',
      zoneId: 'zone-jumla',
      cityName: 'Jumla',
      isValley: false,
      freeDeliveryThreshold: new Prisma.Decimal(5000),
    });

    // Outer-valley rate band: 150 NPR
    mockActiveRates.mockResolvedValue([
      {
        id: 'rate-outer',
        cityId: null,
        minWeightKg: new Prisma.Decimal(0),
        maxWeightKg: new Prisma.Decimal(10),
        fee: new Prisma.Decimal(150),
        codFee: new Prisma.Decimal(0),
        isActive: true,
      },
    ]);

    const { service, createOrderWithReservation } = createCheckoutTestHarness([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.8 },
    ]);

    await service.checkout(USER_ID, {
      addressId: ADDRESS_ID,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-outer-1',
    });

    expect(createOrderWithReservation).toHaveBeenCalledTimes(1);
    const orderPayload = createOrderWithReservation.mock.calls[0]![0] as CreatedOrderRecord;

    expect(orderPayload.shippingFee.toNumber()).toBe(150);
    expect(orderPayload.totalAmount.toNumber()).toBe(1350);
    expect(orderPayload.deliveryPricingSource).toBe('RATE_CARD');
    expect(mockQuote).not.toHaveBeenCalled();
  });

  it('completes checkout order successfully when external courier APIs are offline or unreachable', async () => {
    mockQuote.mockRejectedValue(new Error('Connection to courier timed out'));

    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-ktm',
      zoneId: 'zone-ktm',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(3000),
    });

    const { service, createOrderWithReservation } = createCheckoutTestHarness([
      { vendorId: 'vendor-1', unitPrice: 1500, unitWeightKg: 0.5 },
    ]);

    const result = await service.checkout(USER_ID, {
      addressId: ADDRESS_ID,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-offline-1',
    });

    expect(result.order.orderNumber).toBe('ORD-TEST-1');
    expect(createOrderWithReservation).toHaveBeenCalledTimes(1);
    const orderPayload = createOrderWithReservation.mock.calls[0]![0] as CreatedOrderRecord;
    expect(orderPayload.shippingFee.toNumber()).toBe(100);
    expect(orderPayload.totalAmount.toNumber()).toBe(1600);
  });

  it('waives delivery fee when order subtotal meets district free delivery threshold', async () => {
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-ktm',
      zoneId: 'zone-ktm',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(3000),
    });

    const { service, createOrderWithReservation } = createCheckoutTestHarness([
      { vendorId: 'vendor-1', unitPrice: 3500, unitWeightKg: 1.0 },
    ]);

    await service.checkout(USER_ID, {
      addressId: ADDRESS_ID,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-free-1',
    });

    expect(createOrderWithReservation).toHaveBeenCalledTimes(1);
    const orderPayload = createOrderWithReservation.mock.calls[0]![0] as CreatedOrderRecord;

    expect(orderPayload.shippingFee.toNumber()).toBe(0);
    expect(orderPayload.absorbedShippingCost.toNumber()).toBe(100);
    expect(orderPayload.totalAmount.toNumber()).toBe(3500);
  });

  it('charges the combo-discounted unit price carried on the cart line', async () => {
    // The cart line keeps the product price (1200) and carries a 200 per-unit
    // combo discount. Checkout must bill 1000 a unit through the same
    // line-price authority the cart renders from — the exact divergence the
    // review flagged (cart shows the discount, checkout charges full price) is
    // what this asserts against.
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-ktm',
      zoneId: 'zone-ktm',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: new Prisma.Decimal(3000),
    });

    const { service, createOrderWithReservation } = createCheckoutTestHarness([
      { vendorId: 'vendor-1', unitPrice: 1200, unitWeightKg: 0.5, appliedDiscount: 200 },
    ]);

    await service.checkout(USER_ID, {
      addressId: ADDRESS_ID,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-combo-1',
    });

    expect(createOrderWithReservation).toHaveBeenCalledTimes(1);
    const orderPayload = createOrderWithReservation.mock.calls[0]![0] as CreatedOrderRecord;

    expect(orderPayload.items[0]!.unitPrice.toNumber()).toBe(1000);
    expect(orderPayload.items[0]!.subtotal.toNumber()).toBe(1000);
    expect(orderPayload.subtotal.toNumber()).toBe(1000);
    expect(orderPayload.totalAmount.toNumber()).toBe(1100);
  });

  it('rejects checkout with resource not found when destination address does not exist', async () => {
    const { service } = createCheckoutTestHarness([]);

    // Override address repo to return null for unknown address
    (
      service as unknown as { addressRepo: { findAddressById: ReturnType<typeof vi.fn> } }
    ).addressRepo.findAddressById = vi.fn().mockResolvedValue(null);

    await expect(
      service.checkout(USER_ID, {
        addressId: 'unknown-address-id',
        paymentMethod: 'COD',
        idempotencyKey: 'idem-invalid-addr',
      }),
    ).rejects.toThrow(AppError);
  });
});
