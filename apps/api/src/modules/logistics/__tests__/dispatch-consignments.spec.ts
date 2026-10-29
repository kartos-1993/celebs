import { CodStatus, DispatchMode, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsignmentRepository, CreateConsignmentRecord } from '../consignment.repository';
import type { DeliveryCoverageRepository } from '../delivery-coverage.repository';
import type { LogisticsRepository, UpdateDispatchedOrderData } from '../logistics.repository';
import { LogisticsService } from '../logistics.service';

import { Prisma } from '@/config/db.prisma';

/**
 * Split dispatch test suite: verifies that order dispatch breaks multi-seller orders
 * into individual seller consignments with exact collectible allocation and strict CAS.
 *
 * Invariants tested:
 * 1. An order with items from N distinct sellers produces N distinct Consignment records.
 * 2. On COD orders: sum(consignment.amountToCollect) === order.totalAmount.
 * 3. On prepaid orders: every consignment has amountToCollect = 0 and codAmount = 0.
 * 4. Idempotency / CAS: an order already marked HANDED_OVER cannot be re-dispatched.
 * 5. Deterministic sorting: consignments are generated in sorted vendorId order.
 */
describe('LogisticsService - Split Consignment Dispatch', () => {
  const testOrderId = 'order-multi-seller-123';
  const sellerA = 'vendor-aaa';
  const sellerB = 'vendor-bbb';

  const mockAddress = {
    id: 'addr-1',
    userId: 'user-1',
    fullName: 'Hari Prasad',
    phone: '9841234567',
    altPhone: null,
    province: 'Bagmati',
    district: 'Kathmandu',
    cityArea: 'Lazimpat',
    streetAddress: 'Main Road',
    landmark: null,
    logisticsZoneId: 'zone-ktm',
    deliveryZoneId: null,
    label: 'Home',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMultiSellerOrder = (overrides: Record<string, unknown> = {}) => ({
    id: testOrderId,
    orderNumber: 'CEL-261009-000001',
    userId: 'user-1',
    addressId: 'addr-1',
    subtotal: new Prisma.Decimal('3000.00'),
    totalAmount: new Prisma.Decimal('3393.60'),
    discountAmount: new Prisma.Decimal('0.00'),
    shippingFee: new Prisma.Decimal('360.00'),
    courierFee: new Prisma.Decimal('360.00'),
    codHandlingFee: new Prisma.Decimal('33.60'),
    absorbedShippingCost: new Prisma.Decimal('0.00'),
    deliveryPricingSource: 'COURIER_QUOTE' as const,
    matchedShippingRateId: null,
    logisticsZoneId: 'zone-ktm',
    totalBillableWeightKg: new Prisma.Decimal('2.400'),
    status: OrderStatus.CONFIRMED,
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.PENDING,
    paymentId: null,
    codAmount: null,
    codStatus: CodStatus.NOT_APPLICABLE,
    codReference: null,
    codSettledAt: null,
    dispatchMode: DispatchMode.MANUAL,
    courierProvider: null,
    courierName: null,
    trackingNumber: null,
    trackingUrl: null,
    estimatedDelivery: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    address: mockAddress,
    items: [
      {
        id: 'item-1',
        vendorId: sellerA,
        quantity: 2,
        unitPrice: new Prisma.Decimal('1000.00'),
        unitWeightKg: new Prisma.Decimal('0.450'),
      },
      {
        id: 'item-2',
        vendorId: sellerB,
        quantity: 1,
        unitPrice: new Prisma.Decimal('1000.00'),
        unitWeightKg: new Prisma.Decimal('1.500'),
      },
    ],
    consignments: [],
    ...overrides,
  });

  let mockLogisticsRepo: Partial<LogisticsRepository>;
  let mockCoverageRepo: Partial<DeliveryCoverageRepository>;
  let mockConsignmentRepo: Partial<ConsignmentRepository>;
  let createdConsignments: CreateConsignmentRecord[];
  let updatedOrderData: UpdateDispatchedOrderData | null;

  beforeEach(() => {
    createdConsignments = [];
    updatedOrderData = null;

    mockCoverageRepo = {
      coverageForAddress: vi.fn().mockResolvedValue({ status: 'COVERED', cityName: 'Kathmandu' }),
    };

    mockConsignmentRepo = {
      createConsignments: vi.fn().mockImplementation(async (records: CreateConsignmentRecord[]) => {
        createdConsignments = records;
        return { count: records.length };
      }),
      findByOrderId: vi.fn().mockImplementation(async () => createdConsignments as never),
    };

    mockLogisticsRepo = {
      findOrderForDispatch: vi.fn().mockResolvedValue(createMultiSellerOrder()),
      updateDispatchedOrder: vi.fn().mockImplementation(async (data: UpdateDispatchedOrderData) => {
        updatedOrderData = data;
        return {
          id: data.orderId,
          status: OrderStatus.HANDED_OVER,
          trackingNumber: data.trackingNumber,
          courierName: data.courierName,
          consignments: createdConsignments,
        } as never;
      }),
    };
  });

  it('creates separate consignments for each seller in a multi-seller order', async () => {
    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
    });

    const result = await service.dispatchOrder({
      orderId: testOrderId,
      provider: 'MANUAL',
      manualCourierName: 'Pathao Courier',
      manualTrackingNumber: 'PTH-112233',
    });

    expect(mockConsignmentRepo.createConsignments).toHaveBeenCalled();
    expect(createdConsignments).toHaveLength(2);

    // Sorted deterministically by vendorId
    expect(createdConsignments[0]!.vendorId).toBe(sellerA);
    expect(createdConsignments[1]!.vendorId).toBe(sellerB);

    // Sum of amounts to collect matches order.totalAmount
    const totalAllocated = createdConsignments.reduce(
      (sum, c) => sum.add(c.amountToCollect),
      new Prisma.Decimal(0),
    );
    expect(totalAllocated.toFixed(2)).toBe('3393.60');

    // Both consignments have valid lineIds attached
    expect(createdConsignments[0]!.lineIds).toEqual(['item-1']);
    expect(createdConsignments[1]!.lineIds).toEqual(['item-2']);

    expect(result.status).toBe('HANDED_OVER');
    expect(updatedOrderData).not.toBeNull();
  });

  it('allocates zero collectible and zero codAmount for prepaid multi-seller orders', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(
      createMultiSellerOrder({
        paymentMethod: PaymentMethod.KHALTI,
        paymentStatus: PaymentStatus.COMPLETED,
        totalAmount: new Prisma.Decimal('3360.00'),
      }),
    );

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
    });

    await service.dispatchOrder({
      orderId: testOrderId,
      provider: 'MANUAL',
      manualCourierName: 'Pathao Courier',
      manualTrackingNumber: 'PTH-PREPAID-1',
    });

    expect(createdConsignments).toHaveLength(2);
    for (const c of createdConsignments) {
      expect(c.amountToCollect.toFixed(2)).toBe('0.00');
      expect(c.codAmount).toBeNull();
    }
  });

  it('refuses to re-dispatch an order that has already been dispatched (CAS guard)', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(
      createMultiSellerOrder({
        status: OrderStatus.HANDED_OVER,
        trackingNumber: 'EXISTING-WAYBILL',
      }),
    );

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
    });

    await expect(
      service.dispatchOrder({
        orderId: testOrderId,
        provider: 'MANUAL',
        manualCourierName: 'Pathao Courier',
        manualTrackingNumber: 'PTH-DUPLICATE',
      }),
    ).rejects.toThrow(/already been dispatched|cannot be dispatched/i);

    expect(mockConsignmentRepo.createConsignments).not.toHaveBeenCalled();
  });

  it('dispatches multi-seller order via automated Pathao courier adapter', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(createMultiSellerOrder());

    const mockPathaoClient = {
      createOrder: vi.fn().mockImplementation(async (input: { merchantOrderId: string }) => ({
        consignmentId: `PT-${input.merchantOrderId}`,
        merchantOrderId: input.merchantOrderId,
        deliveryFee: new Prisma.Decimal('160.00'),
        trackingUrl: `https://pathao.com/track/?consignment_id=PT-${input.merchantOrderId}`,
        orderStatus: 'Pending',
        raw: {},
      })),
    };

    const mockDestRepo = {
      forZoneId: vi.fn().mockResolvedValue({
        cityExternalId: 79,
        zoneExternalId: 1326,
        cityName: 'Kathmandu',
        zoneName: 'Lazimpat',
      }),
    };

    const mockTokens = {
      getToken: vi.fn().mockResolvedValue('test-mock-token'),
    };

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
      destinationRepo: mockDestRepo as never,
      pathaoClient: mockPathaoClient as never,
      tokenProvider: mockTokens as never,
    });

    const result = await service.dispatchOrder({
      orderId: testOrderId,
      provider: 'PATHAO',
    });

    expect(result).toBeDefined();
    expect(mockPathaoClient.createOrder).toHaveBeenCalledTimes(2);

    expect(createdConsignments).toHaveLength(2);
    expect(createdConsignments[0]?.trackingNumber).toBe('PT-CEL-261009-000001-1');
    expect(createdConsignments[1]?.trackingNumber).toBe('PT-CEL-261009-000001-2');
    expect(createdConsignments[0]?.courierProvider).toBe('PATHAO');
    expect(createdConsignments[0]?.courierName).toBe('Pathao Courier');
  });

  it('records actual courier fee from Pathao and posts courier fee ledger entries', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(createMultiSellerOrder());

    const mockPathaoClient = {
      createOrder: vi.fn().mockImplementation(async (input: { merchantOrderId: string }) => ({
        consignmentId: `PT-${input.merchantOrderId}`,
        merchantOrderId: input.merchantOrderId,
        deliveryFee: new Prisma.Decimal('160.00'),
        trackingUrl: `https://pathao.com/track/?consignment_id=PT-${input.merchantOrderId}`,
        orderStatus: 'Pending',
        raw: {},
      })),
    };

    const mockDestRepo = {
      forZoneId: vi.fn().mockResolvedValue({
        cityExternalId: 79,
        zoneExternalId: 1326,
        cityName: 'Kathmandu',
        zoneName: 'Lazimpat',
      }),
    };

    const mockTokens = {
      getToken: vi.fn().mockResolvedValue('test-mock-token'),
    };

    const mockPostCourierFee = vi.fn().mockResolvedValue(undefined);

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
      destinationRepo: mockDestRepo as never,
      pathaoClient: mockPathaoClient as never,
      tokenProvider: mockTokens as never,
      postCourierFeeEntriesFn: mockPostCourierFee,
    });

    await service.dispatchOrder({
      orderId: testOrderId,
      provider: 'PATHAO',
    });

    // Courier fee on consignment should reflect actual courier quote (160), not estimated (180)
    expect(createdConsignments[0]?.courierFee.toFixed(2)).toBe('160.00');
    expect(createdConsignments[1]?.courierFee.toFixed(2)).toBe('160.00');

    // Ledger posting should be called for both consignments with their tracking numbers
    expect(mockPostCourierFee).toHaveBeenCalledTimes(2);
    expect(mockPostCourierFee).toHaveBeenCalledWith({
      orderId: testOrderId,
      courier: 'Pathao Courier',
      consignmentId: 'PT-CEL-261009-000001-1',
      amount: expect.objectContaining({ toFixed: expect.any(Function) }),
    });
  });

  it('rejects seller dispatch when seller owns no items in order', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(createMultiSellerOrder());

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
    });

    await expect(
      service.dispatchOrder({ orderId: testOrderId, provider: 'PATHAO' }, 'unrelated-vendor-id'),
    ).rejects.toThrow('You do not own any item in this order');
  });

  it('permits platform operator dispatch across any seller items when actorStoreId is null', async () => {
    mockLogisticsRepo.findOrderForDispatch = vi.fn().mockResolvedValue(createMultiSellerOrder());

    const service = new LogisticsService({
      logisticsRepo: mockLogisticsRepo,
      coverageRepo: mockCoverageRepo,
      consignmentRepo: mockConsignmentRepo,
    });

    // actorStoreId is null for platform admin
    const result = await service.dispatchOrder({ orderId: testOrderId, provider: 'MANUAL' }, null);

    expect(result).toBeDefined();
    expect(result.status).toBe(OrderStatus.HANDED_OVER);
  });
});
