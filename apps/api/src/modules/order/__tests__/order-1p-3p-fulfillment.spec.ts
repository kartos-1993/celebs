import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ensurePlatformVendor,
  PLATFORM_VENDOR_ID,
  PLATFORM_VENDOR_NAME,
} from '@/common/constants/platform-vendor';
import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import { OrderService } from '@/modules/order/order.service';

describe('Order 1P & 3P Multi-Vendor Fulfillment & Isolation Tests', () => {
  const orderService = new OrderService();

  let customerId: string;
  let customerAddressId: string;
  let vendorAProfileId: string;
  let vendorBProfileId: string;
  let product1PId: string;
  let inventory1PId: string;
  let product3PAId: string;
  let inventory3PAId: string;
  let placedOrderId: string;

  beforeEach(async () => {
    const uid = Math.random().toString(36).substring(2, 8);

    // 1. Ensure 1P Platform Vendor exists
    const superadmin = await prisma.user.create({
      data: {
        name: 'Superadmin User',
        email: `superadmin_${Date.now()}_${uid}@test.com`,
        password: await hashValue('pass123'),
        role: 'SUPERADMIN',
      },
    });
    await ensurePlatformVendor(prisma, superadmin.id);

    // 2. Create 3P Vendor A
    const vendorAUser = await prisma.user.create({
      data: {
        name: 'Vendor A User',
        email: `vendorA_${Date.now()}_${uid}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
      },
    });
    const vendorAProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorAUser.id,
        shopName: `Vendor A Store ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `10-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorAProfileId = vendorAProfile.id;

    // 3. Create 3P Vendor B (Disjoint store)
    const vendorBUser = await prisma.user.create({
      data: {
        name: 'Vendor B User',
        email: `vendorB_${Date.now()}_${uid}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
      },
    });
    const vendorBProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorBUser.id,
        shopName: `Vendor B Store ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `20-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorBProfileId = vendorBProfile.id;

    // 4. Create Customer & Address
    const customer = await prisma.user.create({
      data: {
        name: 'Shopper User',
        email: `shopper_${Date.now()}_${uid}@test.com`,
        password: await hashValue('pass123'),
      },
    });
    customerId = customer.id;

    const address = await prisma.address.create({
      data: {
        userId: customerId,
        fullName: 'Shopper FullName',
        phone: '9841000000',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Durbarmarg',
        streetAddress: 'King Way',
      },
    });
    customerAddressId = address.id;

    // 5. Create Category
    const category = await prisma.category.create({
      data: {
        name: `Fashion ${uid}`,
        slug: `fashion-${Date.now()}-${uid}`,
      },
    });

    // 6. Create 1P Product & Inventory
    const prod1P = await prisma.product.create({
      data: {
        name: 'Celebs Flagship Jacket',
        slug: `flagship-jacket-${Date.now()}-${uid}`,
        description: '1P In-house premium jacket',
        price: 3000,
        vendorId: PLATFORM_VENDOR_ID,
        vendorName: PLATFORM_VENDOR_NAME,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    product1PId = prod1P.id;

    const inv1P = await prisma.productInventory.create({
      data: {
        productId: product1PId,
        colorVariantName: 'Charcoal',
        size: 'L',
        sku: `SKU-1P-${Date.now()}-${uid}`,
        quantity: 10,
        reservedQuantity: 0,
      },
    });
    inventory1PId = inv1P.id;

    // 7. Create 3P Product (Vendor A) & Inventory
    const prod3P = await prisma.product.create({
      data: {
        name: 'Vendor A Designer Pants',
        slug: `designer-pants-${Date.now()}-${uid}`,
        description: '3P Vendor trousers',
        price: 1800,
        vendorId: vendorAProfileId,
        vendorName: vendorAProfile.shopName,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });
    product3PAId = prod3P.id;

    const inv3PA = await prisma.productInventory.create({
      data: {
        productId: product3PAId,
        colorVariantName: 'Beige',
        size: '32',
        sku: `SKU-3PA-${Date.now()}-${uid}`,
        quantity: 10,
        reservedQuantity: 0,
      },
    });
    inventory3PAId = inv3PA.id;
  });

  async function populateCart() {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
    await prisma.cart.deleteMany({ where: { userId: customerId } });

    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.createMany({
      data: [
        { cartId: cart.id, inventoryId: inventory1PId, quantity: 1 },
        { cartId: cart.id, inventoryId: inventory3PAId, quantity: 1 },
      ],
    });
  }

  afterEach(async () => {
    if (placedOrderId) {
      await prisma.orderTrackingEvent.deleteMany({ where: { orderId: placedOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: placedOrderId } });
      await prisma.payment.deleteMany({ where: { orderId: placedOrderId } });
      await prisma.order.deleteMany({ where: { id: placedOrderId } });
      placedOrderId = '';
    }
    await prisma.orderItem.deleteMany({
      where: { inventoryId: { in: [inventory1PId, inventory3PAId] } },
    });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
    await prisma.cart.deleteMany({ where: { userId: customerId } });
    await prisma.productInventory.deleteMany({
      where: { id: { in: [inventory1PId, inventory3PAId] } },
    });
    await prisma.product.deleteMany({ where: { id: { in: [product1PId, product3PAId] } } });
  });

  it('should successfully place a mixed cart order (1P + 3P) with non-null foreign keys', async () => {
    await populateCart();
    const result = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-${Date.now()}-${Math.random()}`,
    });

    expect(result.order).toBeDefined();
    placedOrderId = result.order.id;

    // Fetch order items directly from DB to verify FK integrity
    const items = await prisma.orderItem.findMany({
      where: { orderId: placedOrderId },
      orderBy: { unitPrice: 'desc' },
    });

    expect(items).toHaveLength(2);
    // 1P Item has PLATFORM_VENDOR_ID
    expect(items[0]?.vendorId).toBe(PLATFORM_VENDOR_ID);
    // 3P Item has Vendor A's profile ID
    expect(items[1]?.vendorId).toBe(vendorAProfileId);
  });

  it('should redact items belonging to other vendors when 3P vendor accesses mixed order', async () => {
    await populateCart();
    const result = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-${Date.now()}-${Math.random()}`,
    });
    placedOrderId = result.order.id;

    // Vendor A queries the order
    const vendorAOrder = await orderService.getVendorOrderById(placedOrderId, vendorAProfileId);

    expect(vendorAOrder).toBeDefined();
    expect(vendorAOrder.id).toBe(placedOrderId);
    // Vendor A must ONLY see their own item (Vendor A Designer Pants), 1P item must be redacted
    expect(vendorAOrder.items).toHaveLength(1);
    expect(vendorAOrder.items![0]?.vendorId).toBe(vendorAProfileId);
    expect(vendorAOrder.items![0]?.productName).toBe('Vendor A Designer Pants');
  });

  it('should reject third-party Vendor B who has no items in the order with 404 Not Found', async () => {
    await populateCart();
    const result = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-${Date.now()}-${Math.random()}`,
    });
    placedOrderId = result.order.id;

    // Vendor B queries the order -> Expected 404
    await expect(orderService.getVendorOrderById(placedOrderId, vendorBProfileId)).rejects.toThrow(
      /Order not found/i,
    );
  });

  it('should return all items when platform admin queries mixed order', async () => {
    await populateCart();
    const result = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-${Date.now()}-${Math.random()}`,
    });
    placedOrderId = result.order.id;

    // Platform admin queries the order with isPlatform: true
    const adminOrder = await orderService.getVendorOrderById(placedOrderId, undefined, true);

    expect(adminOrder).toBeDefined();
    expect(adminOrder.items).toHaveLength(2);
  });

  it('should record correct audit source on tracking events for vendor vs platform fulfillment', async () => {
    // 1. Vendor A order (single 3P item)
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
    await prisma.cart.deleteMany({ where: { userId: customerId } });
    const cart3P = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({
      data: { cartId: cart3P.id, inventoryId: inventory3PAId, quantity: 1 },
    });

    const res3P = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-3p-${Date.now()}-${Math.random()}`,
    });
    const order3PId = res3P.order.id;
    placedOrderId = order3PId;

    const item3P = await prisma.orderItem.findFirst({ where: { orderId: order3PId } });
    expect(item3P).not.toBeNull();

    await orderService.updateOrderItemStatus(
      vendorAProfileId,
      item3P!.id,
      'PACKED',
      'TRK-NCM-001',
      'Nepal Can Move',
      false,
    );

    const vendorEvent = await prisma.orderTrackingEvent.findFirst({
      where: { orderId: order3PId, status: 'PACKED' },
    });
    expect(vendorEvent?.source).toBe('VENDOR');

    // 2. 1P order (single 1P item)
    await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
    await prisma.cart.deleteMany({ where: { userId: customerId } });
    const cart1P = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({
      data: { cartId: cart1P.id, inventoryId: inventory1PId, quantity: 1 },
    });

    const res1P = await orderService.checkout(customerId, {
      addressId: customerAddressId,
      paymentMethod: 'COD',
      idempotencyKey: `idemp-1p-${Date.now()}-${Math.random()}`,
    });
    const order1PId = res1P.order.id;

    const item1P = await prisma.orderItem.findFirst({ where: { orderId: order1PId } });
    expect(item1P).not.toBeNull();

    await orderService.updateOrderItemStatus(
      undefined,
      item1P!.id,
      'PACKED',
      'TRK-NCM-002',
      'Nepal Can Move',
      true,
    );

    const platformEvent = await prisma.orderTrackingEvent.findFirst({
      where: { orderId: order1PId, status: 'PACKED' },
    });
    expect(platformEvent?.source).toBe('PLATFORM');

    // Cleanup 1P order
    await prisma.orderTrackingEvent.deleteMany({ where: { orderId: order1PId } });
    await prisma.orderItem.deleteMany({ where: { orderId: order1PId } });
    await prisma.payment.deleteMany({ where: { orderId: order1PId } });
    await prisma.order.deleteMany({ where: { id: order1PId } });
  });
});
