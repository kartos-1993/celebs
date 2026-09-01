import { CodStatus, DispatchMode, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  LogisticsRepository,
  logisticsRepository,
  UpdateDispatchedOrderData,
} from '../logistics.repository';
import { LogisticsService } from '../logistics.service';

import prisma, { Prisma } from '@/config/db.prisma';

type DispatchedOrderPayload = NonNullable<
  Prisma.PromiseReturnType<LogisticsRepository['findOrderForDispatch']>
>;
type UpdatedDispatchedOrderPayload = Prisma.PromiseReturnType<
  LogisticsRepository['updateDispatchedOrder']
>;

const createMockDispatchedOrder = (
  overrides: Partial<DispatchedOrderPayload> = {},
): DispatchedOrderPayload => ({
  id: 'order-123',
  orderNumber: 'ORD-123',
  userId: 'user-123',
  addressId: 'addr-123',
  subtotal: new Prisma.Decimal(1000),
  totalAmount: new Prisma.Decimal(1000),
  discountAmount: new Prisma.Decimal(0),
  shippingFee: new Prisma.Decimal(0),
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
  items: [{ vendorId: 'vendor-123' }],
  address: {
    id: 'addr-123',
    userId: 'user-123',
    fullName: 'Ram Bahadur',
    phone: '9841000000',
    altPhone: null,
    province: 'Bagmati',
    district: 'Kathmandu',
    cityArea: 'Thamel',
    streetAddress: 'Chaksibari Marg',
    landmark: null,
    label: 'Home',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
});

const createMockUpdatedOrder = (
  data: UpdateDispatchedOrderData,
  overrides: Partial<UpdatedDispatchedOrderPayload> = {},
): UpdatedDispatchedOrderPayload => ({
  ...createMockDispatchedOrder({ id: data.orderId }),
  status: OrderStatus.HANDED_OVER,
  dispatchMode: data.dispatchMode,
  courierProvider: data.courierProvider,
  courierName: data.courierName,
  trackingNumber: data.trackingNumber,
  trackingUrl: data.trackingUrl,
  codAmount: data.codAmount ? new Prisma.Decimal(Number(data.codAmount)) : null,
  codStatus: data.codStatus,
  estimatedDelivery: data.estimatedDelivery ?? null,
  trackingEvents: [
    {
      id: 'event-1',
      orderId: data.orderId,
      status: OrderStatus.HANDED_OVER,
      title: `Handed over to ${data.courierName}`,
      description: data.notes || `Dispatched via ${data.courierName}`,
      location: 'Kathmandu Fulfillment Center',
      source: 'ADMIN',
      timestamp: new Date(),
    },
  ],
  ...overrides,
});

describe('LogisticsRepository & LogisticsService Clean Architecture Suite', () => {
  let testOrderId: string;
  let vendorStoreId: string;

  beforeEach(async () => {
    // Create test fixtures
    const user = await prisma.user.create({
      data: {
        name: 'Logistics User',
        email: `logistics-${Date.now()}@example.com`,
        password: 'Password123!',
      },
    });

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Logistics Shop ${Date.now()}`,
        phoneNumber: `9800${Math.floor(100000 + Math.random() * 900000)}`,
        panNumber: `PAN${Date.now()}`,
        citizenshipNumber: `CIT${Date.now()}`,
      },
    });
    vendorStoreId = vendorProfile.id;

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        fullName: 'Ram Bahadur',
        phone: '9841000000',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Thamel',
        streetAddress: 'Chaksibari Marg',
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        userId: user.id,
        addressId: address.id,
        subtotal: 1000,
        totalAmount: 1000,
        paymentMethod: 'COD',
      },
    });
    testOrderId = order.id;
  });

  describe('LogisticsRepository', () => {
    it('should find order for dispatch with address and items', async () => {
      const order = await logisticsRepository.findOrderForDispatch(testOrderId);
      expect(order).not.toBeNull();
      expect(order?.id).toBe(testOrderId);
      expect(order?.address.fullName).toBe('Ram Bahadur');
    });

    it('should mark COD as settled', async () => {
      const updated = await logisticsRepository.markCodSettled(testOrderId, 'STMT-REF-12345');
      expect(updated.codStatus).toBe('COD_SETTLED');
      expect(updated.codReference).toBe('STMT-REF-12345');
      expect(updated.codSettledAt).not.toBeNull();
    });

    it('should add tracking event', async () => {
      const event = await logisticsRepository.addTrackingEvent(
        testOrderId,
        'HANDED_OVER',
        'Handed to courier',
        'Package was picked up',
        'Kathmandu HUB',
      );
      expect(event.id).toBeDefined();
      expect(event.title).toBe('Handed to courier');
      expect(event.orderId).toBe(testOrderId);
    });
  });

  describe('LogisticsService DI', () => {
    it('should dispatch manual courier orders through injected mock repository', async () => {
      const mockRepo: Partial<LogisticsRepository> = {
        findOrderForDispatch: async () =>
          createMockDispatchedOrder({
            id: testOrderId,
            totalAmount: new Prisma.Decimal(1000),
            paymentMethod: PaymentMethod.COD,
            items: [{ vendorId: vendorStoreId }],
            address: {
              id: 'addr-test',
              userId: 'user-test',
              fullName: 'Ram Bahadur',
              phone: '9841000000',
              altPhone: null,
              province: 'Bagmati',
              district: 'Kathmandu',
              cityArea: 'Thamel',
              streetAddress: 'Chaksibari Marg',
              landmark: null,
              label: 'Home',
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        updateDispatchedOrder: async (data: UpdateDispatchedOrderData) =>
          createMockUpdatedOrder(data, {
            id: data.orderId,
            status: OrderStatus.HANDED_OVER,
            trackingNumber: data.trackingNumber,
            courierName: data.courierName,
          }),
      };

      const service = new LogisticsService({ logisticsRepo: mockRepo });
      const result = await service.dispatchOrder(
        {
          orderId: testOrderId,
          provider: 'MANUAL',
          manualCourierName: 'FastExpress Nepal',
          manualTrackingNumber: 'FE-998877',
        },
        vendorStoreId,
      );

      expect(result.status).toBe('HANDED_OVER');
      expect(result.trackingNumber).toBe('FE-998877');
    });

    it('should reject dispatch if seller does not own any item in order', async () => {
      const mockRepo: Partial<LogisticsRepository> = {
        findOrderForDispatch: async () =>
          createMockDispatchedOrder({
            id: testOrderId,
            items: [{ vendorId: 'different-store-id' }],
          }),
      };

      const service = new LogisticsService({ logisticsRepo: mockRepo });
      await expect(
        service.dispatchOrder(
          {
            orderId: testOrderId,
            provider: 'MANUAL',
          },
          vendorStoreId,
        ),
      ).rejects.toThrow('You do not own any item in this order');
    });
  });
});
