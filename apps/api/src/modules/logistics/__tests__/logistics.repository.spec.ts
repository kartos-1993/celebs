import { beforeEach, describe, expect, it } from 'vitest';

import {
  LogisticsRepository,
  logisticsRepository,
  UpdateDispatchedOrderData,
} from '../logistics.repository';
import { LogisticsService } from '../logistics.service';

import prisma from '@/config/db.prisma';

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
      const mockRepo = {
        findOrderForDispatch: async () => ({
          id: testOrderId,
          totalAmount: 1000,
          paymentMethod: 'COD',
          items: [{ vendorId: vendorStoreId }],
          address: {
            fullName: 'Ram Bahadur',
            phone: '9841000000',
            streetAddress: 'Chaksibari Marg',
            cityArea: 'Thamel',
            district: 'Kathmandu',
          },
        }),
        updateDispatchedOrder: async (data: UpdateDispatchedOrderData) => ({
          id: data.orderId,
          status: 'HANDED_OVER',
          trackingNumber: data.trackingNumber,
          courierName: data.courierName,
        }),
      } as unknown as LogisticsRepository;

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
      const mockRepo = {
        findOrderForDispatch: async () => ({
          id: testOrderId,
          items: [{ vendorId: 'different-store-id' }],
        }),
      } as unknown as LogisticsRepository;

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
