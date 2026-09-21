import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { paymentService } from '../payment.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

const ESEWA_TEST_SECRET = '8gBm/:&EnhH.1/q';

function createEsewaCallbackData(fields: {
  transaction_uuid: string;
  total_amount: string;
  product_code?: string;
  secretKey?: string;
}): string {
  const product_code = fields.product_code ?? 'EPAYTEST';
  const secretKey = fields.secretKey ?? ESEWA_TEST_SECRET;
  const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${product_code}`;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
  const payload = {
    transaction_code: `ESEWA-${Date.now()}`,
    status: 'COMPLETE',
    total_amount: fields.total_amount,
    transaction_uuid: fields.transaction_uuid,
    product_code,
    signature,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
  };
  return encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'));
}

describe('Payment gateway outage handling, late payments, and reconciliation edge cases', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Outage Customer',
        email: `pay_outage_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        isEmailVerified: true,
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Outage Vendor',
        email: `vendor_outage_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorUserId = vendorUser.id;

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `Shop_${Date.now()}_${Math.random().toString(36).slice(-5)}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorProfileId = vendorProfile.id;

    const address = await prisma.address.create({
      data: {
        userId,
        fullName: 'Outage Customer',
        phone: '9841000000',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Durbarmarg',
        streetAddress: 'Main St',
      },
    });
    addressId = address.id;

    const category = await prisma.category.create({
      data: {
        name: `Cat Outage ${Date.now()}`,
        slug: `cat-outage-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Outage Tee',
        slug: `tee-outage-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Product for payment outage test',
        price: 1800,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    productId = product.id;

    const inventory = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName: 'Olive',
        size: 'S',
        sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 30,
        reservedQuantity: 1,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.orderTrackingEvent.deleteMany({ where: { order: { userId } } });
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.orderItem.deleteMany({ where: { inventoryId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.productInventory.deleteMany({ where: { id: inventoryId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.address.deleteMany({ where: { id: addressId } });
    await prisma.vendorProfile.deleteMany({ where: { id: vendorProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, vendorUserId] } } });
  });

  async function createOrder(
    gateway: 'ESEWA' | 'KHALTI',
    paymentStatus: 'PENDING' | 'COMPLETED' = 'PENDING',
    orderStatus: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' = 'PENDING_PAYMENT',
    amount = 1950,
  ) {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-OUTAGE-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId,
        addressId,
        subtotal: amount - 150,
        shippingFee: 150,
        totalAmount: amount,
        status: orderStatus,
        paymentMethod: gateway,
        paymentStatus,
        payments: {
          create: {
            userId,
            amount,
            currency: 'NPR',
            gateway,
            transactionId: `${gateway.toLowerCase()}-outage-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            status: paymentStatus,
          },
        },
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Outage Tee',
            colorVariantName: 'Olive',
            size: 'S',
            unitPrice: amount - 150,
            quantity: 1,
            subtotal: amount - 150,
          },
        },
      },
      include: { payments: true, items: true },
    });
  }

  it('leaves order in PENDING status when eSewa verification endpoint returns HTTP 500', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 'PENDING_PAYMENT', 1950);
    const callbackData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '1950.00',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      })),
    );

    const result = await paymentService.confirmEsewaPayment(callbackData);

    expect(result.verification.status).toBe('PENDING');

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('leaves order in PENDING status when Khalti lookup endpoint times out or encounters a network error', async () => {
    const order = await createOrder('KHALTI', 'PENDING', 'PENDING_PAYMENT', 1950);
    const pidx = order.payments[0]!.transactionId!;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Connection timeout to Khalti gateway');
      }),
    );

    const result = await paymentService.confirmKhaltiPayment(pidx);

    expect(result.verification.status).toBe('PENDING');

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('transitions payment status to FAILED when Khalti reports user cancellation', async () => {
    const order = await createOrder('KHALTI', 'PENDING', 'PENDING_PAYMENT', 1950);
    const pidx = order.payments[0]!.transactionId!;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'User canceled',
          total_amount: 195000,
          transaction_id: null,
          fee: 0,
          refunded: false,
        }),
      })),
    );

    const result = await paymentService.confirmKhaltiPayment(pidx);

    expect(result.verification.status).toBe('FAILED');

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('FAILED');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('transitions payment status to FAILED when Khalti reports an expired payment session', async () => {
    const order = await createOrder('KHALTI', 'PENDING', 'PENDING_PAYMENT', 1950);
    const pidx = order.payments[0]!.transactionId!;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'Expired',
          total_amount: 195000,
          transaction_id: null,
          fee: 0,
          refunded: false,
        }),
      })),
    );

    const result = await paymentService.confirmKhaltiPayment(pidx);

    expect(result.verification.status).toBe('FAILED');

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('FAILED');
  });

  it('records late payment and creates audit tracking event when payment arrives for a CANCELLED order without altering order cancellation', async () => {
    // Stale order was cancelled by reservation cleanup worker
    const order = await createOrder('ESEWA', 'PENDING', 'CANCELLED', 1950);
    const callbackData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '1950.00',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'COMPLETE', ref_id: 'LATE-SETTLED-REF' }),
      })),
    );

    const result = await paymentService.confirmEsewaPayment(callbackData);

    expect(result.verification.status).toBe('COMPLETED');

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, trackingEvents: true },
    });

    // Money tracking: payment must be recorded as COMPLETED so money is accounted for
    expect(freshOrder.paymentStatus).toBe('COMPLETED');
    // Safety guarantee: order MUST remain CANCELLED (stock was released, cannot fulfill without stock)
    expect(freshOrder.status).toBe('CANCELLED');

    // Audit trail: must have tracking event documenting late payment on cancelled order
    const lateEvent = freshOrder.trackingEvents.find((e) =>
      e.title.toLowerCase().includes('late payment'),
    );
    expect(lateEvent).toBeDefined();
    expect(lateEvent?.description).toContain('cancelled');
  });
});
