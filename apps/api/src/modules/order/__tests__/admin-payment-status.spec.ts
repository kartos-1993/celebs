import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildEsewaSignature } from '../adapters/esewa.adapter';
import { checkoutService } from '../checkout/checkout.service';
import { paymentService } from '../payment/payment.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import { logisticsService } from '@/modules/logistics/logistics.service';

describe('Admin payment status management', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    // Dummy key so KhaltiAdapter builds request options; fetch is stubbed per test.
    process.env.KHALTI_SECRET_KEY = 'test-secret-key';
    const user = await prisma.user.create({
      data: {
        name: 'Pay Customer',
        email: `pay_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Pay Vendor',
        email: `payvendor_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
      },
    });
    vendorUserId = vendorUser.id;

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `PayShop_${Date.now()}_${Math.random().toString(36).slice(-5)}`,
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
        fullName: 'Pay Customer',
        phone: '9841111111',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Thamel',
        streetAddress: 'Chaksibari Marg',
      },
    });
    addressId = address.id;

    const category = await prisma.category.create({
      data: {
        name: `Pay Cat ${Date.now()}`,
        slug: `pay-cat-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Pay Test Tee',
        slug: `pay-tee-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Payment status test product',
        price: 1500,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    productId = product.id;

    const inventory = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName: 'White',
        size: 'M',
        sku: `PAYSKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 10,
        reservedQuantity: 0,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.KHALTI_SECRET_KEY;
    await prisma.idempotencyKey.deleteMany({ where: { userId } });
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

  async function checkoutCod() {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 1 } });
    const result = await checkoutService.checkout(userId, {
      addressId,
      paymentMethod: 'COD',
      idempotencyKey: `paykey_${Date.now()}_${Math.random()}`,
    });
    return result.order as { id: string };
  }

  /** Prepaid order seeded directly (wallet checkout covered by its own spec). */
  async function seedPrepaidOrder(gateway: 'ESEWA' | 'KHALTI' = 'ESEWA', transactionId?: string) {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-PRE-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId,
        addressId,
        subtotal: 1500,
        shippingFee: 150,
        totalAmount: 1650,
        status: 'PENDING_PAYMENT',
        paymentMethod: gateway,
        paymentStatus: 'PENDING',
        payments: {
          create: {
            userId,
            amount: 1650,
            currency: 'NPR',
            gateway,
            transactionId: transactionId || `txn-${Date.now()}`,
            status: 'PENDING',
          },
        },
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Pay Test Tee',
            colorVariantName: 'White',
            size: 'M',
            unitPrice: 1500,
            quantity: 1,
            subtotal: 1500,
            itemStatus: 'PENDING',
          },
        },
      },
    });
  }

  function stubFetchJson(payload: unknown, ok = true) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok,
        json: async () => payload,
      })),
    );
  }

  it('manual COMPLETED clears a prepaid PENDING and writes payment + timeline', async () => {
    const { id } = await seedPrepaidOrder();

    const updated = await paymentService.updatePaymentStatus(
      id,
      { status: 'COMPLETED', reference: 'BANK-VOUCHER-001' },
      'ADMIN:test@celebs.com.np',
    );

    expect(updated.paymentStatus).toBe('COMPLETED');

    const payment = await prisma.payment.findFirst({ where: { orderId: id } });
    expect(payment?.status).toBe('COMPLETED');

    const event = await prisma.orderTrackingEvent.findFirst({
      where: { orderId: id, title: 'Payment Confirmed' },
    });
    expect(event?.source).toBe('PLATFORM');
  });

  it('rejects illegal transitions (REFUND from PENDING, back to PENDING)', async () => {
    const { id } = await seedPrepaidOrder();

    await expect(
      paymentService.updatePaymentStatus(id, { status: 'REFUNDED', reference: 'X-1' }, 'ADMIN:t'),
    ).rejects.toThrow("Invalid payment status transition from 'PENDING' to 'REFUNDED'");

    await paymentService.updatePaymentStatus(
      id,
      { status: 'COMPLETED', reference: 'X-2' },
      'ADMIN:t',
    );

    const again = await paymentService.updatePaymentStatus(
      id,
      { status: 'COMPLETED', reference: 'X-3' },
      'ADMIN:t',
    );
    expect(again.paymentStatus).toBe('COMPLETED');

    const refunded = await paymentService.updatePaymentStatus(
      id,
      { status: 'REFUNDED', reference: 'BANK-REV-9' },
      'ADMIN:t',
    );
    expect(refunded.paymentStatus).toBe('REFUNDED');
  });

  it('COD settle flips paymentStatus to COMPLETED', async () => {
    const { id } = await checkoutCod();

    const before = await prisma.order.findUnique({ where: { id } });
    expect(before?.paymentStatus).toBe('PENDING');

    await logisticsService.markCodSettled(id, 'VOUCHER-123');

    const after = await prisma.order.findUnique({ where: { id } });
    expect(after?.paymentStatus).toBe('COMPLETED');
    expect(after?.codStatus).toBe('COD_SETTLED');
  });

  it('eSewa checkout creates PENDING_PAYMENT with a signed intent', async () => {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 1 } });

    const result = await checkoutService.checkout(userId, {
      addressId,
      paymentMethod: 'ESEWA',
      idempotencyKey: `paykey_${Date.now()}_${Math.random()}`,
    });

    expect(result.order.status).toBe('PENDING_PAYMENT');
    expect(result.payment).toMatchObject({ paymentId: result.order.id });
    expect(String(result.payment?.redirectUrl)).toContain('esewa.com.np');

    const payment = await prisma.payment.findFirst({ where: { orderId: result.order.id } });
    expect(payment?.status).toBe('PENDING');
    expect(payment?.transactionId).toBe(result.order.id);
  });

  it('checkout with callbackBase stores LAN-reachable wallet redirect targets', async () => {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 1 } });

    const result = await checkoutService.checkout(
      userId,
      {
        addressId,
        paymentMethod: 'ESEWA',
        idempotencyKey: `paykey_${Date.now()}_${Math.random()}`,
        callbackBase: 'http://192.168.1.20:3333',
      },
      '192.168.1.20:3333',
    );

    const fields = result.payment?.rawResponse as Record<string, string>;
    expect(fields.success_url).toBe(
      'http://192.168.1.20:3333/api/v1/orders/payments/esewa/success',
    );
    expect(fields.failure_url).toBe(
      'http://192.168.1.20:3333/api/v1/orders/payments/esewa/failure',
    );
  });

  it('checkout ignores a hostile callbackBase and falls back to env URLs', async () => {
    const cart = await prisma.cart.create({ data: { userId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, inventoryId, quantity: 1 } });

    const result = await checkoutService.checkout(
      userId,
      {
        addressId,
        paymentMethod: 'ESEWA',
        idempotencyKey: `paykey_${Date.now()}_${Math.random()}`,
        callbackBase: 'https://celebs.com.np.evil.com',
      },
      '192.168.1.20:3333',
    );

    const fields = result.payment?.rawResponse as Record<string, string>;
    expect(fields.success_url).not.toContain('evil.com');
  });

  it('confirmEsewaPayment completes on signed callback + COMPLETE status', async () => {
    const order = await seedPrepaidOrder('ESEWA', 'pending-txn');
    // Realistic intent: transactionId is the order id (adapter convention).
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { transactionId: order.id },
    });

    const fields = {
      total_amount: '1650.00',
      transaction_uuid: order.id,
      product_code: 'EPAYTEST',
    };
    const body = {
      ...fields,
      transaction_code: '0007G36',
      status: 'COMPLETE',
      signature: buildEsewaSignature(fields, '8gBm/:&EnhH.1/q'),
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    const dataBase64 = encodeURIComponent(Buffer.from(JSON.stringify(body)).toString('base64'));

    stubFetchJson({ status: 'COMPLETE', ref_id: '0007G36' });
    const { order: updated, verification } = await paymentService.confirmEsewaPayment(dataBase64);

    expect(verification.status).toBe('COMPLETED');
    expect(updated.paymentStatus).toBe('COMPLETED');
  });

  it('confirmEsewaPayment rejects tampered amounts', async () => {
    const order = await seedPrepaidOrder();
    const fields = {
      total_amount: '1.00',
      transaction_uuid: order.id,
      product_code: 'EPAYTEST',
    };
    const body = {
      ...fields,
      transaction_code: '0007G36',
      status: 'COMPLETE',
      signature: buildEsewaSignature(fields, '8gBm/:&EnhH.1/q'),
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    const dataBase64 = encodeURIComponent(Buffer.from(JSON.stringify(body)).toString('base64'));

    await expect(paymentService.confirmEsewaPayment(dataBase64)).rejects.toThrow(
      'Paid amount does not match',
    );
    const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
    expect(reloaded?.paymentStatus).toBe('PENDING');
  });

  it('confirmKhaltiPayment completes on Completed lookup with matching paisa', async () => {
    await seedPrepaidOrder('KHALTI', 'test-pidx-123');

    stubFetchJson({
      pidx: 'test-pidx-123',
      total_amount: 165000,
      status: 'Completed',
      transaction_id: 'khalti-txn-9',
      fee: 0,
      refunded: false,
    });

    const { order: updated, verification } =
      await paymentService.confirmKhaltiPayment('test-pidx-123');

    expect(verification.status).toBe('COMPLETED');
    expect(updated.paymentStatus).toBe('COMPLETED');
  });

  it('confirmKhaltiPayment holds on amount mismatch', async () => {
    const order = await seedPrepaidOrder('KHALTI', 'test-pidx-456');

    stubFetchJson({
      pidx: 'test-pidx-456',
      total_amount: 100,
      status: 'Completed',
      transaction_id: 'khalti-txn-1',
      fee: 0,
      refunded: false,
    });

    await expect(paymentService.confirmKhaltiPayment('test-pidx-456')).rejects.toThrow(
      'Paid amount does not match',
    );
    const reloaded = await prisma.order.findUnique({ where: { id: order.id } });
    expect(reloaded?.paymentStatus).toBe('PENDING');
  });
});
