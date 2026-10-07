import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { coreOrderRepository } from '../../core/order.repository';
import { CoreOrderService } from '../../core/order.service';
import { paymentService } from '../payment.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';
import { notificationService } from '@/modules/notification/notification.service';

describe('Payment concurrency and lifecycle state transitions', () => {
  let userId: string;
  let vendorUserId: string;
  let vendorProfileId: string;
  let addressId: string;
  let productId: string;
  let inventoryId: string;

  beforeEach(async () => {
    stubRefundService.initiateRefund.mockClear();
    const user = await prisma.user.create({
      data: {
        name: 'Payment Lifecycle Customer',
        email: `pay_lifecycle_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        isEmailVerified: true,
      },
    });
    userId = user.id;

    const vendorUser = await prisma.user.create({
      data: {
        name: 'Payment Lifecycle Vendor',
        email: `pay_vendor_${Date.now()}_${Math.random()}@test.com`,
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
        fullName: 'Payment Customer',
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
        name: `Cat ${Date.now()}`,
        slug: `cat-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Lifecycle Tee',
        slug: `tee-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
        description: 'Product for lifecycle test',
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
        quantity: 20,
        reservedQuantity: 1,
      },
    });
    inventoryId = inventory.id;
  });

  afterEach(async () => {
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

  async function createTestOrder(paymentStatus: 'PENDING' | 'COMPLETED' = 'PENDING') {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId,
        addressId,
        subtotal: 2000,
        shippingFee: 100,
        totalAmount: 2100,
        status: paymentStatus === 'COMPLETED' ? 'CONFIRMED' : 'PENDING_PAYMENT',
        paymentMethod: 'ESEWA',
        paymentStatus,
        payments: {
          create: {
            userId,
            amount: 2100,
            currency: 'NPR',
            gateway: 'ESEWA',
            transactionId: `txn-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            status: paymentStatus,
          },
        },
        items: {
          create: {
            inventoryId,
            vendorId: vendorProfileId,
            productName: 'Lifecycle Tee',
            colorVariantName: 'Black',
            size: 'L',
            unitPrice: 2000,
            quantity: 1,
            subtotal: 2000,
          },
        },
      },
      include: { payments: true, items: true },
    });
  }

  it('prevents illegal state transitions when competing status updates race concurrently', async () => {
    const order = await createTestOrder('PENDING');

    // Two competing updates race: one tries to complete the payment, one tries to fail it
    const [resCompleted, resFailed] = await Promise.allSettled([
      paymentService.updatePaymentStatus(order.id, {
        status: 'COMPLETED',
        reference: 'ref-complete',
      }),
      paymentService.updatePaymentStatus(order.id, { status: 'FAILED', reference: 'ref-fail' }),
    ]);

    // Reload order from database
    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    // Money safety invariant: A COMPLETED payment must NEVER be overwritten by a racing FAILED update
    expect(finalOrder.paymentStatus).toBe('COMPLETED');
    expect(resCompleted.status).toBe('fulfilled');
    expect(resFailed.status).toBe('rejected');
    expect(finalOrder.payments[0]?.status).toBe('COMPLETED');
  });

  // Cancelling now asks a gateway to return the money. These tests are about the
  // cancellation, not about how a wallet refunds, which refund.service.spec.ts
  // covers directly - so the refund is stubbed here rather than being allowed to
  // reach the network from a unit test.
  const stubRefundService = {
    initiateRefund: vi.fn(async () => ({
      id: 'refund-stub',
      status: 'SUCCEEDED',
      amount: { toNumber: () => 2000 },
      gateway: 'KHALTI',
      initiatedBy: 'admin',
      providerRefundId: 'KHALTI-TXN-1',
      message: null,
    })),
  };

  const orderServiceWithStubbedRefund = () =>
    new CoreOrderService(coreOrderRepository, notificationService, stubRefundService as never);

  it('records a refund against the cancelled order instead of marking the payment refunded', async () => {
    const order = await createTestOrder('COMPLETED');
    const service = orderServiceWithStubbedRefund();

    const result = await service.cancelOrder(userId, order.id);

    expect(result.status).toBe('CANCELLED');
    expect(stubRefundService.initiateRefund).toHaveBeenCalledOnce();
    expect(stubRefundService.initiateRefund).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: order.id, reason: 'ORDER_CANCELLED' }),
    );
  });

  it('still allows cancelling a handed-over order, because the state machine does', async () => {
    // The machine lists HANDED_OVER -> CANCELLED as legal: a parcel can be
    // recalled before it is out for delivery. The old hardcoded denylist
    // refused it; the machine is the authority now.
    const order = await createTestOrder('COMPLETED');
    await prisma.order.update({ where: { id: order.id }, data: { status: 'HANDED_OVER' } });

    const result = await orderServiceWithStubbedRefund().cancelOrder(userId, order.id);

    expect(result.status).toBe('CANCELLED');
  });

  it('refuses to cancel a delivered order instead of writing an illegal transition', async () => {
    const order = await createTestOrder('COMPLETED');
    await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });

    await expect(orderServiceWithStubbedRefund().cancelOrder(userId, order.id)).rejects.toThrow(
      /Invalid order status transition from 'DELIVERED' to 'CANCELLED'/,
    );

    expect(stubRefundService.initiateRefund).not.toHaveBeenCalled();
  });

  it('refuses to cancel a returned order instead of resurrecting it', async () => {
    const order = await createTestOrder('COMPLETED');
    await prisma.order.update({ where: { id: order.id }, data: { status: 'RETURNED' } });

    await expect(orderServiceWithStubbedRefund().cancelOrder(userId, order.id)).rejects.toThrow(
      /Invalid order status transition from 'RETURNED' to 'CANCELLED'/,
    );

    expect(stubRefundService.initiateRefund).not.toHaveBeenCalled();
  });

  it('does not claim the payment was refunded before the gateway says so', async () => {
    const order = await createTestOrder('COMPLETED');

    await orderServiceWithStubbedRefund().cancelOrder(userId, order.id);

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { paymentStatus: true },
    });

    // The money has not come back yet, so the order must not say it has.
    expect(updatedOrder.paymentStatus).not.toBe('REFUNDED');
  });

  it('does not write a REFUNDED payment row, because no money has moved', async () => {
    const order = await createTestOrder('COMPLETED');

    await orderServiceWithStubbedRefund().cancelOrder(userId, order.id);

    const refundedRows = await prisma.payment.count({
      where: { orderId: order.id, status: 'REFUNDED' },
    });
    expect(refundedRows).toBe(0);
  });

  it('handles duplicate callback confirmation idempotently without duplicate side-effects', async () => {
    const order = await createTestOrder('PENDING');

    // First completion
    const firstResult = await paymentService.updatePaymentStatus(order.id, {
      status: 'COMPLETED',
      reference: 'idempotent-ref',
    });
    expect(firstResult.paymentStatus).toBe('COMPLETED');

    // Second completion with identical parameters
    const secondResult = await paymentService.updatePaymentStatus(order.id, {
      status: 'COMPLETED',
      reference: 'idempotent-ref',
    });
    expect(secondResult.paymentStatus).toBe('COMPLETED');

    // Ensure we do not produce runaway payment rows
    const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments.length).toBe(1);
  });
});
