import { CodStatus, OrderStatus, PaymentMethod } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDeliverableZone } from '../../../../tests/support/delivery-zone';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import { logisticsService } from '@/modules/logistics/logistics.service';

describe('Logistics & 3PL Settlement Integration Tests', () => {
  let testUserId: string;
  let testAddressId: string;
  let testOrderId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test Logistics User',
        email: `logistics_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('password123'),
      },
    });
    testUserId = user.id;

    // Create test address
    // Dispatch refuses an address whose delivery coverage is unconfirmed, so the
    // fixture carries a real zone rather than none.
    const { zoneId } = await createDeliverableZone();
    const address = await prisma.address.create({
      data: {
        userId: testUserId,
        fullName: 'Ram Thapa',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Baneshwor',
        streetAddress: 'House 42, Baneshwor Height',
        logisticsZoneId: zoneId,
      },
    });
    testAddressId = address.id;

    // Create test order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: testUserId,
        addressId: testAddressId,
        subtotal: 5000,
        totalAmount: 5150,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.COD,
      },
    });
    testOrderId = order.id;

    // The order needs a line to ship.
    //
    // Dispatch now plans one consignment per seller parcel and refuses to book
    // anything when there are none. Without a line the order would otherwise be
    // marked HANDED_OVER with an empty tracking number - recorded as shipped, with
    // no courier ever picking it up and no invoice that could ever match it.
    const sellerUserId = (
      await prisma.user.create({
        data: {
          name: 'Logistics Seller',
          email: `logisticsseller_${Date.now()}_${Math.random()}@test.com`,
          password: await hashValue('password123'),
        },
      })
    ).id;

    const vendorId = (
      await prisma.vendorProfile.create({
        data: {
          userId: sellerUserId,
          phoneNumber: `98${Date.now()}`.slice(0, 10),
          shopName: `Logistics Shop ${Date.now()}`,
          panNumber: `P${Date.now()}`.slice(-10).toUpperCase(),
          citizenshipNumber: `C${Date.now()}`.slice(-14).toUpperCase(),
        },
      })
    ).id;

    const productId = (
      await prisma.product.create({
        data: {
          name: 'Logistics Test Tee',
          slug: `logistics-tee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          categoryId: (
            await prisma.category.create({
              data: { name: `LC-${Date.now()}`, slug: `lc-${Date.now()}` },
            })
          ).id,
          price: 5000,
          status: 'published',
          packageWeightKg: 0.5,
        },
      })
    ).id;

    const inventoryId = (
      await prisma.productInventory.create({
        data: {
          productId,
          size: 'M',
          colorVariantName: 'Black',
          sku: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          quantity: 25,
        },
      })
    ).id;

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        inventoryId,
        vendorId,
        productName: 'Logistics Test Tee',
        colorVariantName: 'Black',
        size: 'M',
        unitPrice: 5000,
        quantity: 1,
        subtotal: 5000,
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    if (testOrderId) {
      await prisma.orderTrackingEvent.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (testAddressId) {
      await prisma.address.deleteMany({ where: { id: testAddressId } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  it('dispatches order via Pathao 3PL adapter and generates tracking number', async () => {
    const result = await logisticsService.dispatchOrder({
      orderId: testOrderId,
      provider: 'PATHAO',
      notes: 'Fragile clothes package',
    });

    expect(result.courierName).toBe('Pathao Courier');
    expect(result.trackingNumber).toBeTruthy();
    expect(result.status).toBe(OrderStatus.HANDED_OVER);
    expect(result.codStatus).toBe(CodStatus.PENDING_COLLECTION);
    expect(result.trackingEvents.length).toBeGreaterThan(0);
    expect(result.trackingEvents[0]?.title).toContain('Pathao');
  });

  it('settles COD payment with 3PL bank statement reference', async () => {
    const settled = await logisticsService.markCodSettled(testOrderId, 'STMT-NCM-2026-08');

    expect(settled.codStatus).toBe(CodStatus.COD_SETTLED);
    expect(settled.codReference).toBe('STMT-NCM-2026-08');
    expect(settled.codSettledAt).toBeDefined();
  });
});
