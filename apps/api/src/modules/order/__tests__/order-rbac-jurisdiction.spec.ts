import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { hashValue } from '@/common/utils/bcrypt';
import { signJwtToken } from '@/common/utils/jwt';
import prisma from '@/config/db.prisma';

describe('Order RBAC Jurisdiction Gateways', () => {
  let vendorUserId: string;
  let vendorToken: string;
  let vendorProfileId: string;

  let adminUserId: string;
  let adminToken: string;

  let customerUserId: string;
  let addressId: string;
  let orderId: string;
  let orderItemId: string;

  beforeEach(async () => {
    // 1. Create Vendor User & Profile
    const vendorUser = await prisma.user.create({
      data: {
        name: 'Jurisdiction Vendor',
        email: `jvendor_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorUserId = vendorUser.id;

    const vendorSession = await prisma.session.create({
      data: {
        userId: vendorUserId,
        expiredAt: new Date(Date.now() + 86400000),
      },
    });
    vendorToken = signJwtToken({ userId: vendorUserId, sessionId: vendorSession.id });

    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `JurisdictionShop_${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorProfileId = vendorProfile.id;

    // 2. Create Admin User
    const adminUser = await prisma.user.create({
      data: {
        name: 'Jurisdiction Admin',
        email: `jadmin_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    adminUserId = adminUser.id;

    const adminSession = await prisma.session.create({
      data: {
        userId: adminUserId,
        expiredAt: new Date(Date.now() + 86400000),
      },
    });
    adminToken = signJwtToken({ userId: adminUserId, sessionId: adminSession.id });

    // 3. Create Customer, Category, Product, Inventory, Order, and OrderItem
    const customer = await prisma.user.create({
      data: {
        name: 'Jurisdiction Customer',
        email: `jcust_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        isEmailVerified: true,
      },
    });
    customerUserId = customer.id;

    const address = await prisma.address.create({
      data: {
        userId: customerUserId,
        fullName: 'Customer Juris',
        phone: '9841111111',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Lazimpat',
        streetAddress: 'Main Road',
      },
    });
    addressId = address.id;

    const category = await prisma.category.create({
      data: {
        name: `JCat ${Date.now()}`,
        slug: `jcat-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'J Product',
        slug: `jprod-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        price: 1800,
        vendorId: vendorProfileId,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });

    const inventory = await prisma.productInventory.create({
      data: {
        productId: product.id,
        colorVariantName: 'Blue',
        size: 'M',
        sku: `JSKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 10,
        reservedQuantity: 1,
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `CEL-JUR-${Date.now().toString().slice(-6)}`,
        userId: customerUserId,
        addressId,
        subtotal: 1800,
        shippingFee: 150,
        totalAmount: 1950,
        status: 'PENDING_PAYMENT',
        paymentMethod: 'KHALTI',
        paymentStatus: 'PENDING',
      },
    });
    orderId = order.id;

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        inventoryId: inventory.id,
        vendorId: vendorProfileId,
        productName: 'J Product',
        colorVariantName: 'Blue',
        size: 'M',
        unitPrice: 1800,
        quantity: 1,
        subtotal: 1800,
        itemStatus: 'PENDING',
      },
    });
    orderItemId = orderItem.id;
  });

  afterEach(async () => {
    const userIds = [vendorUserId, adminUserId, customerUserId].filter(Boolean);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    if (orderId) {
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.orderTrackingEvent.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.productInventory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    if (addressId) {
      await prisma.address.deleteMany({ where: { id: addressId } });
    }
    if (vendorProfileId) {
      await prisma.vendorProfile.deleteMany({ where: { id: vendorProfileId } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('allows vendor to update their own order item fulfillment stage', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/vendor/orders/items/${orderItemId}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        itemStatus: 'PACKED',
        courierPartner: 'Nepal Can Move',
        trackingNumber: 'NCM-TEST-123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
    expect(updated?.itemStatus).toBe('PACKED');
    expect(updated?.trackingNumber).toBe('NCM-TEST-123456');
  });

  it('strictly blocks vendor from platform payment override with PLATFORM_ACCESS_REQUIRED', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        status: 'COMPLETED',
        reference: 'Fake Vendor Slip',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('PLATFORM_ACCESS_REQUIRED');
    expect(res.body.message).toContain('restricted to platform administrators');
  });

  it('strictly blocks vendor from courier COD settlement with PLATFORM_ACCESS_REQUIRED', async () => {
    const res = await request(app)
      .post(`/api/v1/logistics/settle-cod/${orderId}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        reference: 'Fake COD Remittance',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('PLATFORM_ACCESS_REQUIRED');
  });

  it('allows platform admin to manually update payment status', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'COMPLETED',
        reference: 'Admin Verified Voucher #999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updated?.paymentStatus).toBe('COMPLETED');
  });
});
