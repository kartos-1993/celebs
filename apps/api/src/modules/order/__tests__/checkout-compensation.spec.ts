import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkoutService } from '../checkout/checkout.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Checkout Compensating Transaction (Saga Pattern)', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    process.env.KHALTI_SECRET_KEY = 'test-secret-key';
    process.env.KHALTI_BASE_URL = 'https://dev.khalti.com';

    const user = await prisma.user.create({
      data: {
        name: 'Saga Customer',
        email: `sagacustomer_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Saga Vendor',
        email: `sagavendor_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
      },
    });
    vendorUserId = vendorUser.id;

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `SagaShop_${Date.now()}_${Math.random().toString(36).slice(-5)}`,
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
        fullName: 'Saga Customer',
        phone: '9841111111',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Baneshwor',
        streetAddress: 'Main St',
      },
    });
    addressId = address.id;

    const category = await prisma.category.create({
      data: {
        name: `Saga Cat ${Date.now()}`,
        slug: `saga-cat-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Saga Tee',
        slug: `saga-tee-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Saga test product',
        price: 2000,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    productId = product.id;

    const inventory = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName: 'Black',
        size: 'L',
        sku: `SAGASKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 5,
        reservedQuantity: 0,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.KHALTI_SECRET_KEY;
    await prisma.idempotencyKey.deleteMany({ where: { userId } });
    await prisma.orderTrackingEvent.deleteMany({});
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

  it('rolls back stock reservation and marks order CANCELLED when payment initiation fails', async () => {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 2 } });

    // Mock Khalti initiate endpoint failing (gateway outage)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Khalti upstream gateway unavailable' }),
      }),
    );

    await expect(
      checkoutService.checkout(userId, {
        addressId,
        paymentMethod: 'KHALTI',
        idempotencyKey: `sagakey_${Date.now()}_fail`,
      }),
    ).rejects.toThrow(/Unable to initiate KHALTI payment/);

    // Verify compensating transaction:
    // 1. Reserved quantity must be rolled back to 0
    const inv = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(0);

    // 2. Order must be marked CANCELLED
    const cancelledOrder = await prisma.order.findFirst({
      where: { userId },
      include: { items: true, trackingEvents: true },
    });
    expect(cancelledOrder).not.toBeNull();
    expect(cancelledOrder?.status).toBe('CANCELLED');
    expect(cancelledOrder?.items[0]?.itemStatus).toBe('CANCELLED');
    expect(cancelledOrder?.trackingEvents.some((e) => e.status === 'CANCELLED')).toBe(true);
  });

  it('completes checkout successfully and keeps stock reserved when payment initiation succeeds', async () => {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 1 } });

    // Mock Khalti initiate succeeding
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          pidx: 'khalti_success_pidx_1',
          payment_url: 'https://test-pay.khalti.com/?pidx=khalti_success_pidx_1',
        }),
      }),
    );

    const result = await checkoutService.checkout(userId, {
      addressId,
      paymentMethod: 'KHALTI',
      idempotencyKey: `sagakey_${Date.now()}_success`,
    });

    expect(result.order.status).toBe('PENDING_PAYMENT');
    expect(result.payment?.paymentId).toBe('khalti_success_pidx_1');

    // Stock must remain reserved while awaiting customer payment
    const inv = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(1);

    // Payment record must be created in PENDING status
    const payment = await prisma.payment.findFirst({
      where: { orderId: result.order.id },
    });
    expect(payment).not.toBeNull();
    expect(payment?.status).toBe('PENDING');
    expect(payment?.gateway).toBe('KHALTI');
  });
});
