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
  overrideSignature?: string;
}): string {
  const product_code = fields.product_code ?? 'EPAYTEST';
  const secretKey = fields.secretKey ?? ESEWA_TEST_SECRET;
  const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${product_code}`;
  const signature =
    fields.overrideSignature ??
    crypto.createHmac('sha256', secretKey).update(message).digest('base64');

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

describe('Payment gateway forgery and tampering defenses', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Tampering Security Customer',
        email: `tamper_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        isEmailVerified: true,
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Tampering Security Vendor',
        email: `vendor_tamper_${Date.now()}_${Math.random()}@test.com`,
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
        fullName: 'Tampering Security Customer',
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
        name: `Cat Tamper ${Date.now()}`,
        slug: `cat-tamper-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Tampering Security Tee',
        slug: `tee-tamper-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Product for tampering test',
        price: 3000,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    productId = product.id;

    const inventory = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName: 'Red',
        size: 'L',
        sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 25,
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
    amount = 3150,
  ) {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-TAMPER-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
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
            transactionId: `${gateway.toLowerCase()}-tamper-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            status: paymentStatus,
          },
        },
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Tampering Security Tee',
            colorVariantName: 'Red',
            size: 'L',
            unitPrice: amount - 150,
            quantity: 1,
            subtotal: amount - 150,
          },
        },
      },
      include: { payments: true, items: true },
    });
  }

  it('rejects eSewa callback when signature does not match canonical payload fields', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 3150);
    const tamperedData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '3150.00',
      overrideSignature: 'INVALID_BASE64_SIGNATURE_FORGED_BY_ATTACKER==',
    });

    await expect(paymentService.confirmEsewaPayment(tamperedData)).rejects.toThrow(
      /eSewa signature mismatch — possible tampering/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('rejects eSewa callback signed with a forged or unauthorized secret key', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 3150);
    const forgedSecretData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '3150.00',
      secretKey: 'attacker-unauthorized-secret-key',
    });

    await expect(paymentService.confirmEsewaPayment(forgedSecretData)).rejects.toThrow(
      /eSewa signature mismatch — possible tampering/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
  });

  it('rejects eSewa callback when merchant product code does not match configuration', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 3150);
    const wrongMerchantData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '3150.00',
      product_code: 'WRONG_MERCHANT_ACCOUNT',
    });

    await expect(paymentService.confirmEsewaPayment(wrongMerchantData)).rejects.toThrow(
      /eSewa merchant code mismatch/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
  });

  it('rejects eSewa callback referencing a non-existent or foreign transaction UUID', async () => {
    const foreignData = createEsewaCallbackData({
      transaction_uuid: '00000000-0000-0000-0000-000000000000',
      total_amount: '3150.00',
    });

    await expect(paymentService.confirmEsewaPayment(foreignData)).rejects.toThrow(
      /Order not found/,
    );
  });

  it('rejects eSewa confirmation when paid amount is tampered below order total', async () => {
    const order = await createOrder('ESEWA', 'PENDING', 3150);
    // Attacker signs payload for NPR 10.00 using valid key, attempting to settle NPR 3150 order
    const underpaidData = createEsewaCallbackData({
      transaction_uuid: order.id,
      total_amount: '10.00',
    });

    await expect(paymentService.confirmEsewaPayment(underpaidData)).rejects.toThrow(
      /Paid amount does not match order total — held for review/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('rejects Khalti payment verification when gateway returned amount does not match order total', async () => {
    const order = await createOrder('KHALTI', 'PENDING', 3150);
    const pidx = order.payments[0]!.transactionId!;

    // Mock Khalti lookup returning NPR 50 (5000 paisa) instead of NPR 3150 (315000 paisa)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          status: 'Completed',
          total_amount: 5000,
          transaction_id: 'KHALTI-TXN-UNDERPAID',
          fee: 0,
          refunded: false,
        }),
      })),
    );

    await expect(paymentService.confirmKhaltiPayment(pidx)).rejects.toThrow(
      /Paid amount does not match order total — held for review/,
    );

    const freshOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(freshOrder.paymentStatus).toBe('PENDING');
    expect(freshOrder.status).toBe('PENDING_PAYMENT');
  });

  it('rejects Khalti payment confirmation for unknown transaction reference pidx', async () => {
    await expect(
      paymentService.confirmKhaltiPayment('unknown-pidx-does-not-exist'),
    ).rejects.toThrow(/Unknown Khalti payment reference/);
  });
});
