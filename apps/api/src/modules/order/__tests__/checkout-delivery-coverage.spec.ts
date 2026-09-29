import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import { CheckoutService } from '@/modules/order/checkout/checkout.service';

/**
 * Checkout is the last point at which an undeliverable order can be stopped
 * cheaply. After this, the customer has paid and the courier will refuse the
 * parcel, so the check belongs here as well as at dispatch.
 */

const { mockPolicy, mockThresholdForAddress, mockCoverageForAddress } = vi.hoisted(() => ({
  mockPolicy: vi.fn(),
  mockThresholdForAddress: vi.fn(),
  mockCoverageForAddress: vi.fn(),
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

const USER_ID = '33333333-3333-4333-8333-333333333333';
const ADDRESS_ID = '44444444-4444-4444-8444-444444444444';

const covered = {
  status: 'COVERED',
  isValley: true,
  zoneId: 'zone-1',
  zoneName: 'Kathmandu',
  cityName: 'Kathmandu',
  needsZoneSelection: false,
};

function buildService() {
  const product = {
    id: 'prod-1',
    name: 'Jacket',
    price: 1200,
    discountedPrice: null,
    vendorId: 'vendor-1',
    isActive: true,
    packageWeightKg: 0.5,
    packageLengthCm: null,
    packageWidthCm: null,
    packageHeightCm: null,
  };

  const createOrderWithReservation = vi
    .fn()
    .mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1', items: [], vendorId: 'vendor-1' });

  const service = new CheckoutService(
    {
      findIdempotencyKey: vi.fn().mockResolvedValue(null),
      findCartWithItemsByUserId: vi.fn().mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            id: 'line-1',
            quantity: 1,
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
      findAddressById: vi
        .fn()
        .mockResolvedValue({ id: ADDRESS_ID, isDefault: true, logisticsZoneId: 'zone-1' }),
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

const baseInput = { addressId: ADDRESS_ID, paymentMethod: 'COD' as const, idempotencyKey: 'k1' };

describe('checkout refuses an address it cannot deliver to', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicy.mockResolvedValue({ codMaxLimit: 5000, flatShippingFee: 150 });
    mockThresholdForAddress.mockResolvedValue({
      cityId: 'city-1',
      zoneId: 'zone-1',
      cityName: 'Kathmandu',
      isValley: true,
      freeDeliveryThreshold: 2500,
      absorbedCost: 0,
    });
    mockCoverageForAddress.mockResolvedValue(covered);
  });

  it('completes a normal covered order', async () => {
    const { service, createOrderWithReservation } = buildService();
    await service.checkout(USER_ID, baseInput);
    expect(createOrderWithReservation).toHaveBeenCalled();
  });

  it('refuses an address the courier does not serve', async () => {
    mockCoverageForAddress.mockResolvedValue({
      ...covered,
      status: 'UNCOVERED',
      cityName: 'Nowhere',
      isValley: false,
      needsZoneSelection: true,
    });
    const { service, createOrderWithReservation } = buildService();

    await expect(service.checkout(USER_ID, baseInput)).rejects.toThrow(AppError);
    expect(createOrderWithReservation).not.toHaveBeenCalled();
  });

  // The dangerous case: an address written before the picker existed. Blocking it
  // is wrong (we may simply not know yet), but letting it through is worse - it
  // becomes a paid order to a place no courier was ever asked about.
  it('refuses an address whose coverage we cannot confirm', async () => {
    mockCoverageForAddress.mockResolvedValue({
      ...covered,
      status: 'UNVERIFIED',
      needsZoneSelection: true,
    });
    const { service, createOrderWithReservation } = buildService();

    await expect(service.checkout(USER_ID, baseInput)).rejects.toThrow(AppError);
    expect(createOrderWithReservation).not.toHaveBeenCalled();
  });

  it('asks the customer to reselect their district, not to accept the blame', async () => {
    mockCoverageForAddress.mockResolvedValue({
      ...covered,
      status: 'UNVERIFIED',
      needsZoneSelection: true,
    });
    const { service } = buildService();

    // The message must not read as "you entered something wrong" for a state
    // that is our own gap.
    await expect(service.checkout(USER_ID, baseInput)).rejects.toThrow(
      /re-select|reselect|choose/i,
    );
  });
});
