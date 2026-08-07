import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/db/index.js';
import { logisticsService } from '../../src/modules/logistics/logistics.service.js';
import { OrderStatus, PaymentMethod, CodStatus } from '@prisma/client';

describe('Logistics & 3PL Settlement Integration Tests', () => {
  let testUserId: string;
  let testAddressId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test Logistics User',
        email: `logistics_${Date.now()}@test.com`,
        password: 'password123',
      },
    });
    testUserId = user.id;

    // Create test address
    const address = await prisma.address.create({
      data: {
        userId: testUserId,
        fullName: 'Ram Thapa',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Baneshwor',
        streetAddress: 'House 42, Baneshwor Height',
      },
    });
    testAddressId = address.id;

    // Create test order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-LOG-${Date.now()}`,
        userId: testUserId,
        addressId: testAddressId,
        subtotal: 5000,
        totalAmount: 5150,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.COD,
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testOrderId) {
      await prisma.orderTrackingEvent.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    }
    if (testAddressId) {
      await prisma.address.delete({ where: { id: testAddressId } });
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  it('dispatches order via Nepal Can Move 3PL adapter and generates tracking number', async () => {
    const result = await logisticsService.dispatchOrder({
      orderId: testOrderId,
      provider: 'NEPAL_CAN_MOVE',
      notes: 'Fragile clothes package',
    });

    expect(result.courierName).toBe('Nepal Can Move');
    expect(result.trackingNumber).toMatch(/^NCM-\d{6}$/);
    expect(result.status).toBe(OrderStatus.HANDED_OVER);
    expect(result.codStatus).toBe(CodStatus.PENDING_COLLECTION);
    expect(result.trackingEvents.length).toBeGreaterThan(0);
    expect(result.trackingEvents[0].title).toContain('Nepal Can Move');
  });

  it('settles COD payment with 3PL bank statement reference', async () => {
    const settled = await logisticsService.markCodSettled(testOrderId, 'STMT-NCM-2026-08');

    expect(settled.codStatus).toBe(CodStatus.COD_SETTLED);
    expect(settled.codReference).toBe('STMT-NCM-2026-08');
    expect(settled.codSettledAt).toBeDefined();
  });
});
