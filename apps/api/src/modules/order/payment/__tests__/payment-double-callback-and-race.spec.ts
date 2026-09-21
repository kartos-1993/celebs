import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkoutService } from '../../checkout/checkout.service';
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

describe('Payment double callbacks, replay protection, and concurrency races', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Concurrency Customer',
        email: `pay_concur_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        isEmailVerified: true,
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Concurrency Vendor',
        email: `vendor_concur_${Date.now()}_${Math.random()}@test.com`,
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
        fullName: 'Concurrency Customer',
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
        name: `Cat Concur ${Date.now()}`,
        slug: `cat-concur-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Concurrency Tee',
        slug: `tee-concur-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Product for payment concurrency test',
        price: 2500,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    productId = product.id;

    const inventory = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName: 'Navy',
        size: 'M',
        sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 50,
        reservedQuantity: 1,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.idempotencyKey.deleteMany({ where: { userId } });
    await prisma.orderTrackingEvent.deleteMany({ where: { order: { userId } } });
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.orderItem.deleteMany({ where: { inventoryId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.cartItem.deleteMany({ where: { inventoryId } });
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.productInventory.deleteMany({ where: { id: inventoryId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.address.deleteMany({ where: { id: addressId } });
    await prisma.vendorProfile.deleteMany({ where: { id: vendorProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, vendorUserId] } } });
  });

  async function createOrder(
    gateway: 'ESEWA' | 'KHALTI',
    paymentStatus: 'PENDING' | 'COMPLETED' = 'PENDING',
    amount = 2650,
  ) {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-CONCUR-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId,
        addressId,
        subtotal: amount - 150,
        shippingFee: 150,
        totalAmount: amount,
        status: paymentStatus === 'COMPLETED' ? 'CONFIRMED' : 'PENDING_PAYMENT',
        paymentMethod: gateway,
        paymentStatus,
        payments: {
          create: {
            userId,
            amount,
            currency: 'NPR',
            gateway,
            transactionId: `${gateway.toLowerCase()}-intent-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            status: paymentStatus,
          },
        },
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Concurrency Tee',
            colorVariantName: 'Navy',
            size: 'M',
            unitPrice: amount - 150,
            quantity: 1,
            subtotal: amount - 150,
          },
        },
      },
      include: { payments: true, items: true },
    });
  }

  it('handles concurrent duplicate eSewa callbacks idempotently without duplicate records or errors', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 2650);
    const callbackData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '2650.00',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'COMPLETE', ref_id: 'ESEWA-REF-777' }),
      })),
    );

    // Concurrently invoke confirmEsewaPayment with identical payload
    const [resultA, resultB] = await Promise.all([
      paymentService.confirmEsewaPayment(callbackData),
      paymentService.confirmEsewaPayment(callbackData),
    ]);

    expect(resultA.order.paymentStatus).toBe('COMPLETED');
    expect(resultB.order.paymentStatus).toBe('COMPLETED');

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, trackingEvents: true },
    });

    expect(finalOrder.paymentStatus).toBe('COMPLETED');
    expect(finalOrder.status).toBe('CONFIRMED');
    // Idempotency: must have exactly 1 payment record and 1 confirmation tracking event
    expect(finalOrder.payments.length).toBe(1);
    const confirmationEvents = finalOrder.trackingEvents.filter(
      (e) => e.title === 'Payment Confirmed',
    );
    expect(confirmationEvents.length).toBe(1);
  });

  it('handles concurrent duplicate Khalti return callbacks idempotently without duplicate records', async () => {
    const order = await createOrder('KHALTI', 'PENDING', 2650);
    const pidx = order.payments[0]!.transactionId!;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'Completed',
          total_amount: 265000,
          transaction_id: 'KHALTI-TXN-999',
          fee: 0,
          refunded: false,
        }),
      })),
    );

    const [resultA, resultB] = await Promise.all([
      paymentService.confirmKhaltiPayment(pidx),
      paymentService.confirmKhaltiPayment(pidx),
    ]);

    expect(resultA.order.paymentStatus).toBe('COMPLETED');
    expect(resultB.order.paymentStatus).toBe('COMPLETED');

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true, trackingEvents: true },
    });

    expect(finalOrder.paymentStatus).toBe('COMPLETED');
    expect(finalOrder.status).toBe('CONFIRMED');
    expect(finalOrder.payments.length).toBe(1);
    const confirmationEvents = finalOrder.trackingEvents.filter(
      (e) => e.title === 'Payment Confirmed',
    );
    expect(confirmationEvents.length).toBe(1);
  });

  it('rejects cross-order payment reference replay across different orders', async () => {
    const orderA = await createOrder('KHALTI', 'PENDING', 2650);
    const orderB = await createOrder('KHALTI', 'PENDING', 2650);
    const pidxA = orderA.payments[0]!.transactionId!;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'Completed',
          total_amount: 265000,
          transaction_id: 'KHALTI-TXN-A',
          fee: 0,
          refunded: false,
        }),
      })),
    );

    // Confirm Order A via its pidx
    await paymentService.confirmKhaltiPayment(pidxA);

    // Replay attempt: Order B's status must NOT be modified by Order A's pidx
    const freshOrderB = await prisma.order.findUniqueOrThrow({
      where: { id: orderB.id },
    });
    expect(freshOrderB.paymentStatus).toBe('PENDING');
    expect(freshOrderB.status).toBe('PENDING_PAYMENT');

    // Trying to verify an unknown or fabricated pidx for Order B must fail
    await expect(paymentService.confirmKhaltiPayment(`foreign-pidx-${Date.now()}`)).rejects.toThrow(
      /Unknown Khalti payment reference/,
    );
  });

  it('preserves refund state when admin refund races against late callback', async () => {
    const order = await createOrder('ESEWA', 'COMPLETED', 2650);
    const callbackData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '2650.00',
    });

    // Admin issues refund
    await paymentService.updatePaymentStatus(order.id, {
      status: 'REFUNDED',
      reference: 'Admin full refund',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'COMPLETE', ref_id: 'LATE-ESEWA-REF' }),
      })),
    );

    // Late callback arrives trying to mark it COMPLETED again
    // Must be rejected by payment state machine transition rules
    await expect(paymentService.confirmEsewaPayment(callbackData)).rejects.toThrow(
      /Invalid payment status transition from 'REFUNDED' to 'COMPLETED'/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('REFUNDED');
  });

  it('guarantees single order creation when double checkout tap occurs with identical idempotency key', async () => {
    // Setup cart for user
    await prisma.cart.create({
      data: {
        userId,
        items: {
          create: {
            inventoryId,
            quantity: 2,
          },
        },
      },
      include: { items: true },
    });

    // Mock payment gateway initiate so network call does not block
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          pidx: `khalti-initiate-${Date.now()}`,
          payment_url: 'https://test-pay.khalti.com/?pidx=123',
        }),
      })),
    );

    const idempotencyKey = `double-tap-key-${Date.now()}`;
    const checkoutInput = {
      addressId,
      paymentMethod: 'COD' as const,
      idempotencyKey,
    };

    // Simulate rapid double tap: two concurrent checkout calls with identical idempotencyKey
    const [responseA, responseB] = await Promise.all([
      checkoutService.checkout(userId, checkoutInput),
      checkoutService.checkout(userId, checkoutInput),
    ]);

    // Both must return successfully referencing the exact same order
    expect(responseA.order.id).toBeDefined();
    expect(responseB.order.id).toBeDefined();
    expect(responseA.order.id).toBe(responseB.order.id);

    // Exactly 1 order must exist in the database for this idempotency key
    const orders = await prisma.order.findMany({
      where: { userId },
    });
    expect(orders.length).toBe(1);

    // Reserved quantity should be accurately incremented for exactly 1 order (2 items)
    const inventory = await prisma.productInventory.findUniqueOrThrow({
      where: { id: inventoryId },
    });
    // Initial was 1, added 2 => total reserved should be 3
    expect(inventory.reservedQuantity).toBe(3);
  });
});
