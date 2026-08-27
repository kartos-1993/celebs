import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OrderService } from '../order.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Order Remediation & Financial Integrity Integration Tests', () => {
  const orderService = new OrderService();

  let userAId: string;
  let userBId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressAId: string;
  let addressBId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    // 1. Create Customer A & B
    const userA = await prisma.user.create({
      data: {
        name: 'Customer A',
        email: `customerA_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        name: 'Customer B',
        email: `customerB_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
      },
    });
    userBId = userB.id;

    // 2. Create Vendor User & Profile
    const vendorUser = await prisma.user.create({
      data: {
        name: 'Vendor Owner',
        email: `vendor_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
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

    // 3. Create Addresses for A and B
    const addressA = await prisma.address.create({
      data: {
        userId: userAId,
        fullName: 'Customer A FullName',
        phone: '9841111111',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Thamel',
        streetAddress: 'Chaksibari Marg',
      },
    });
    addressAId = addressA.id;

    const addressB = await prisma.address.create({
      data: {
        userId: userBId,
        fullName: 'Customer B FullName',
        phone: '9842222222',
        province: 'Bagmati',
        district: 'Kathmandu',
        cityArea: 'Patan',
        streetAddress: 'Kumaripati',
      },
    });
    addressBId = addressB.id;

    // 4. Create Category, Product, and Inventory
    const category = await prisma.category.create({
      data: {
        name: `Test Cat ${Date.now()}`,
        slug: `test-cat-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Integrity Test Hoodie',
        slug: `integrity-hoodie-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Test hoodie description',
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
        sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        quantity: 5,
        reservedQuantity: 0,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
    // Clean up
    await prisma.idempotencyKey.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.payment.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.orderItem.deleteMany({ where: { inventoryId } });
    await prisma.order.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.cartItem.deleteMany({ where: { inventoryId } });
    await prisma.cart.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.productInventory.deleteMany({ where: { id: inventoryId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.address.deleteMany({ where: { id: { in: [addressAId, addressBId] } } });
    await prisma.vendorProfile.deleteMany({ where: { id: vendorProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId, vendorUserId] } } });
  });

  it('A3: rejects User B attempting to use User A idempotency key with Conflict error', async () => {
    const key = `idemp_shared_${Date.now()}`;

    // Seed idempotency key for User A
    await prisma.idempotencyKey.create({
      data: {
        key,
        userId: userAId,
        statusCode: 201,
        responseBody: JSON.stringify({ secretAData: 'sensitive-order-data' }),
      },
    });

    // Populate User B cart
    const cartB = await prisma.cart.create({ data: { userId: userBId } });
    await prisma.cartItem.create({
      data: { cartId: cartB.id, inventoryId, quantity: 1 },
    });

    // User B tries to checkout using key of User A
    await expect(
      orderService.checkout(userBId, {
        addressId: addressBId,
        paymentMethod: 'COD',
        idempotencyKey: key,
      }),
    ).rejects.toThrow('Idempotency key already in use');
  });

  it('A4: prevents overselling with atomic conditional stock reservation inside transaction', async () => {
    // Set inventory quantity to 1
    await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { quantity: 1, reservedQuantity: 0 },
    });

    // Populate cart for A
    const cartA = await prisma.cart.create({ data: { userId: userAId } });
    await prisma.cartItem.create({
      data: { cartId: cartA.id, inventoryId, quantity: 1 },
    });

    // Populate cart for B
    const cartB = await prisma.cart.create({ data: { userId: userBId } });
    await prisma.cartItem.create({
      data: { cartId: cartB.id, inventoryId, quantity: 1 },
    });

    // Run 2 checkouts concurrently
    const [resA, resB] = await Promise.allSettled([
      orderService.checkout(userAId, {
        addressId: addressAId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp_a_${Date.now()}`,
      }),
      orderService.checkout(userBId, {
        addressId: addressBId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp_b_${Date.now()}`,
      }),
    ]);

    const successes = [resA, resB].filter((r) => r.status === 'fulfilled');
    const rejections = [resA, resB].filter((r) => r.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);

    const invAfter = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    expect(invAfter?.reservedQuantity).toBe(1);
  });

  it('A5: releases reserved stock when vendor marks order item as CANCELLED', async () => {
    // Create order with reserved stock
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${Date.now()}`,
        userId: userAId,
        addressId: addressAId,
        subtotal: 2000,
        totalAmount: 2150,
        status: OrderStatus.CONFIRMED,
        paymentMethod: PaymentMethod.COD,
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Integrity Test Hoodie',
            colorVariantName: 'Black',
            size: 'L',
            unitPrice: 2000,
            quantity: 2,
            subtotal: 4000,
            itemStatus: 'PENDING',
          },
        },
      },
      include: { items: true },
    });

    // Set reserved quantity to 2
    await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { reservedQuantity: 2 },
    });

    const orderItemId = order.items[0]!.id;

    // Vendor cancels item
    await orderService.updateOrderItemStatus(vendorProfileId, orderItemId, 'CANCELLED');

    const updatedInv = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    expect(updatedInv?.reservedQuantity).toBe(0);
  });

  it('A6: releases stale reservations for abandoned online payment orders', async () => {
    // Create stale PENDING_PAYMENT order (created 3 hours ago)
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000);

    const staleOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-STALE-${Date.now()}`,
        userId: userAId,
        addressId: addressAId,
        subtotal: 2000,
        totalAmount: 2150,
        status: OrderStatus.PENDING_PAYMENT,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: threeHoursAgo,
        updatedAt: threeHoursAgo,
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Integrity Test Hoodie',
            colorVariantName: 'Black',
            size: 'L',
            unitPrice: 2000,
            quantity: 2,
            subtotal: 4000,
            itemStatus: 'PENDING',
          },
        },
      },
    });

    await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { reservedQuantity: 2 },
    });

    const result = await orderService.releaseStaleReservations();
    expect(result.cancelledOrders).toBeGreaterThanOrEqual(1);

    const reapedOrder = await prisma.order.findUnique({ where: { id: staleOrder.id } });
    expect(reapedOrder?.status).toBe(OrderStatus.CANCELLED);

    const invAfter = await prisma.productInventory.findUnique({ where: { id: inventoryId } });
    expect(invAfter?.reservedQuantity).toBe(0);
  });

  it('A7: does not mark unpaid STRIPE order as COMPLETED upon delivery', async () => {
    // Create STRIPE order with no COMPLETED payment
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-UNPAID-${Date.now()}`,
        userId: userAId,
        addressId: addressAId,
        subtotal: 2000,
        totalAmount: 2150,
        status: OrderStatus.PACKED,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Integrity Test Hoodie',
            colorVariantName: 'Black',
            size: 'L',
            unitPrice: 2000,
            quantity: 1,
            subtotal: 2000,
            itemStatus: 'PACKED',
          },
        },
      },
      include: { items: true },
    });

    await prisma.productInventory.update({
      where: { id: inventoryId },
      data: { quantity: 5, reservedQuantity: 1 },
    });

    const orderItemId = order.items[0]!.id;

    // Transition to DELIVERED
    await orderService.updateOrderItemStatus(vendorProfileId, orderItemId, 'DELIVERED');

    const deliveredOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(deliveredOrder?.status).toBe(OrderStatus.DELIVERED);
    expect(deliveredOrder?.paymentStatus).toBe(PaymentStatus.PENDING); // MUST NOT BE COMPLETED
  });

  it('A8: shirt (Red / S, stock=2) checked out concurrently by User A and User B for qty=2 -> exactly 1 order placed, 1 rejected, no overselling', async () => {
    // 1. Create a Shirt with Red variant and Small size
    const category = await prisma.category.findFirst();
    const shirt = await prisma.product.create({
      data: {
        name: 'Classic Casual Shirt',
        brand: 'Celebs Apparel',
        slug: `shirt-red-s-${Date.now()}`,
        price: 1200,
        status: 'published',
        categoryId: category?.id || '',
        vendorId: vendorProfileId,
        colorVariants: [
          {
            name: 'Red',
            colorCode: '#FF0000',
            images: ['https://example.com/shirt-red.jpg'],
            stocks: [{ size: 'S', quantity: 2 }],
          },
        ],
      },
    });

    // 2. Initialize ProductInventory with exactly 2 stock
    const shirtInventory = await prisma.productInventory.create({
      data: {
        productId: shirt.id,
        colorVariantName: 'Red',
        size: 'S',
        sku: `SHIRT-RED-S-${Date.now()}`,
        quantity: 2,
        reservedQuantity: 0,
      },
    });

    // 3. User A adds 2 items of (Red / S) to their cart
    const cartA = await prisma.cart.create({ data: { userId: userAId } });
    await prisma.cartItem.create({
      data: {
        cartId: cartA.id,
        inventoryId: shirtInventory.id,
        quantity: 2,
      },
    });

    // 4. User B adds 2 items of (Red / S) to their cart
    const cartB = await prisma.cart.create({ data: { userId: userBId } });
    await prisma.cartItem.create({
      data: {
        cartId: cartB.id,
        inventoryId: shirtInventory.id,
        quantity: 2,
      },
    });

    // Verify both users currently have 2 items in their carts
    const verifyCartA = await prisma.cartItem.findFirst({ where: { cartId: cartA.id } });
    const verifyCartB = await prisma.cartItem.findFirst({ where: { cartId: cartB.id } });
    expect(verifyCartA?.quantity).toBe(2);
    expect(verifyCartB?.quantity).toBe(2);

    // 5. Both users attempt to checkout SIMULTANEOUSLY
    const [orderAAttempt, orderBAttempt] = await Promise.allSettled([
      orderService.checkout(userAId, {
        addressId: addressAId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp_simul_a_${Date.now()}`,
      }),
      orderService.checkout(userBId, {
        addressId: addressBId,
        paymentMethod: 'COD',
        idempotencyKey: `idemp_simul_b_${Date.now()}`,
      }),
    ]);

    const successes = [orderAAttempt, orderBAttempt].filter((r) => r.status === 'fulfilled');
    const rejections = [orderAAttempt, orderBAttempt].filter((r) => r.status === 'rejected');

    // Exactly 1 must succeed, exactly 1 must fail
    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);

    // The rejected request must be an AppError with 409 CONFLICT or insufficient stock message
    const rejectedReason = (rejections[0] as PromiseRejectedResult).reason;
    expect(rejectedReason.message).toMatch(/Insufficient stock for item/i);

    // 6. Verify Database Inventory State: MUST NOT OVERSELL
    const finalInventory = await prisma.productInventory.findUnique({
      where: { id: shirtInventory.id },
    });
    expect(finalInventory?.quantity).toBe(2);
    expect(finalInventory?.reservedQuantity).toBe(2);
    expect(finalInventory!.quantity - finalInventory!.reservedQuantity).toBe(0);

    // Verify Orders in DB: Only 1 order exists for this shirt inventory
    const placedOrderItems = await prisma.orderItem.findMany({
      where: { inventoryId: shirtInventory.id },
    });
    expect(placedOrderItems).toHaveLength(1);
    expect(placedOrderItems[0]?.quantity).toBe(2);

    // Clean up
    await prisma.orderItem.deleteMany({ where: { inventoryId: shirtInventory.id } });
    await prisma.order.deleteMany({ where: { id: placedOrderItems[0]?.orderId } });
    await prisma.cartItem.deleteMany({ where: { inventoryId: shirtInventory.id } });
    await prisma.cart.deleteMany({ where: { id: { in: [cartA.id, cartB.id] } } });
    await prisma.productInventory.delete({ where: { id: shirtInventory.id } });
    await prisma.product.delete({ where: { id: shirt.id } });
  });
});
