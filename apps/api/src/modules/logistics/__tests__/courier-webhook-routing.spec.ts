import { ConsignmentStatus, OrderStatus, PaymentMethod } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '@/app';
import prisma, { Prisma } from '@/config/db.prisma';

/**
 * A split order stores its parcel ids comma-joined on the order row, so an
 * exact order lookup by one parcel id can never match. The webhook must route
 * through the consignment row instead — this is the test that proves it.
 */
describe('courier webhook consignment routing', () => {
  const seedSplitOrder = async (parts: {
    orderStatus: OrderStatus;
    orderTracking: string;
    consignmentStatus: ConsignmentStatus;
  }) => {
    const customer = await prisma.user.create({
      data: {
        email: `wh-${Date.now()}-${Math.random()}@test.celebs.com`,
        name: 'Webhook Buyer',
        password: 'Password123!',
      },
    });
    const vendorUser = await prisma.user.create({
      data: {
        email: `wh-vendor-${Date.now()}-${Math.random()}@test.celebs.com`,
        name: 'Webhook Vendor',
        password: 'Password123!',
        role: 'VENDOR',
      },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser.id,
        shopName: `WH Shop ${Date.now()}`,
        phoneNumber: `986${Math.floor(1000000 + Math.random() * 9000000)}`,
        panNumber: `PAN-WH-${Date.now()}`,
        citizenshipNumber: `CIT-WH-${Date.now()}`,
      },
    });
    const address = await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: 'Webhook Buyer',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Thamel',
        streetAddress: 'Main Road',
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-WH-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId: customer.id,
        addressId: address.id,
        subtotal: new Prisma.Decimal('2000.00'),
        totalAmount: new Prisma.Decimal('2100.00'),
        paymentMethod: PaymentMethod.COD,
        status: parts.orderStatus,
        trackingNumber: parts.orderTracking,
      },
    });
    const consignment = await prisma.consignment.create({
      data: {
        orderId: order.id,
        vendorId: vendor.id,
        trackingNumber: 'WH-E2E-A',
        courierFee: new Prisma.Decimal('100.00'),
        status: parts.consignmentStatus,
        lineIds: [],
      },
    });

    return { order, consignment };
  };

  it('delivers a split-order parcel through its consignment row', async () => {
    await seedSplitOrder({
      orderStatus: OrderStatus.HANDED_OVER,
      orderTracking: 'WH-E2E-A, WH-E2E-B',
      consignmentStatus: ConsignmentStatus.HANDED_OVER,
    });

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ consignment_id: 'WH-E2E-A', event: 'Delivered' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(OrderStatus.DELIVERED);

    await expect(
      prisma.consignment
        .findFirstOrThrow({ where: { trackingNumber: 'WH-E2E-A' } })
        .then((c) => c.status),
    ).resolves.toBe(ConsignmentStatus.DELIVERED);
  });

  it('never regresses a delivered order or parcel on a stale event', async () => {
    const { order } = await seedSplitOrder({
      orderStatus: OrderStatus.DELIVERED,
      orderTracking: 'WH-E2E-A, WH-E2E-B',
      consignmentStatus: ConsignmentStatus.DELIVERED,
    });

    const response = await request(app)
      .post('/api/v1/logistics/webhook')
      .send({ consignment_id: 'WH-E2E-A', event: 'In Transit' });

    expect(response.status).toBe(200);

    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }).then((o) => o.status),
    ).resolves.toBe(OrderStatus.DELIVERED);
    await expect(
      prisma.consignment
        .findFirstOrThrow({ where: { trackingNumber: 'WH-E2E-A' } })
        .then((c) => c.status),
    ).resolves.toBe(ConsignmentStatus.DELIVERED);
  });
});
