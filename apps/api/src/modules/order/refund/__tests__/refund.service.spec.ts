import {
  LedgerDirection,
  LedgerEntryType,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RefundService } from '../refund.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

/**
 * Cancelling a paid order has to return the money, and the two wallets need
 * different amounts of help doing it. What matters here is that the attempt is
 * recorded either way: a refund a person still has to finish in a merchant
 * dashboard is a real obligation, and losing it is how a customer waits forever
 * for money nobody is tracking.
 */

const user = async () =>
  prisma.user.create({
    data: {
      name: 'Buyer',
      email: `buyer-${Date.now()}-${Math.random()}@example.com`,
      password: await hashValue('Password123!'),
    },
  });

async function paidOrder(gateway: PaymentMethod, amount = 2500) {
  const customer = await user();
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: 'Ram Bahadur',
      phone: '9841000000',
      province: 'Bagmati',
      district: 'Kathmandu',
      cityArea: 'Thamel',
      streetAddress: 'Chaksibari Marg',
    },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-${Math.random()}`,
      userId: customer.id,
      addressId: address.id,
      subtotal: amount,
      totalAmount: amount,
      paymentMethod: gateway,
      paymentStatus: PaymentStatus.COMPLETED,
    },
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: customer.id,
      amount,
      gateway,
      transactionId: `PIDS-${Math.random().toString(36).slice(2)}`,
      status: PaymentStatus.COMPLETED,
    },
  });
  return { order, payment };
}

const gateways = (overrides: Record<PaymentMethod, { refund: (r: unknown) => Promise<unknown> }>) =>
  overrides as never;

describe('RefundService', () => {
  beforeEach(async () => {
    // Prune in FK-safe order; the shared setup truncates but a direct run does not.
    await prisma.orderItem.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.ledgerEntry.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.vendorProfile.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('returns the money and records what the gateway confirmed', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI, 2500);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED', providerRefundId: 'KHALTI-TXN-9' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refund?.status).toBe(RefundStatus.SUCCEEDED);
    expect(refund?.providerRefundId).toBe('KHALTI-TXN-9');
    expect(refund?.amount.toNumber()).toBe(2500);
    expect(refund?.gateway).toBe(PaymentMethod.KHALTI);
  });

  it('records the full amount that was paid, not the order total', async () => {
    const { order, payment } = await paidOrder(PaymentMethod.KHALTI, 1800);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refund?.amount.toNumber()).toBe(1800);
    expect(refund?.paymentId).toBe(payment.id);
  });

  // eSewa has no refund API. The obligation transfers to a person, so it has to
  // survive in the database with a message saying what to do.
  it('records a wallet with no refund API as needing a person', async () => {
    const { order } = await paidOrder(PaymentMethod.ESEWA);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: {
          refund: async () => ({
            status: 'REQUIRES_MANUAL_ACTION',
            message: 'Finish in the portal',
          }),
        },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refund?.status).toBe(RefundStatus.REQUIRES_MANUAL_ACTION);
    expect(refund?.message).toMatch(/portal/i);
  });

  it('keeps the reason the gateway gave when it refuses', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const service = new RefundService(
      gateways({
        KHALTI: {
          refund: async () => ({ status: 'FAILED', message: 'Amount exceeds refundable' }),
        },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refund?.status).toBe(RefundStatus.FAILED);
    expect(refund?.message).toMatch(/exceeds refundable/);
  });

  it('records who asked for the refund', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({
      orderId: order.id,
      initiatedBy: 'finance-user-7',
    });

    expect(refund?.initiatedBy).toBe('finance-user-7');
  });

  // Cancelling is retryable, and Khalti's refund API is not idempotent. A second
  // attempt must not ask the gateway to refund the same money twice.
  it('does not ask the gateway to refund the same payment twice', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const refundMock = vi.fn(async () => ({ status: 'SUCCEEDED' }));
    const service = new RefundService(
      gateways({
        KHALTI: { refund: refundMock },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });
    await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refundMock).toHaveBeenCalledOnce();
    expect(await prisma.refund.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('calls a non-idempotent gateway once when two cancellations race', async () => {
    // The gateway charges per call, not per intent: two concurrent cancellations
    // interleaving between a check and a create would pay the customer twice.
    // The advisory-locked claim serializes them; the loser is answered with the
    // winner's record and never reaches the gateway.
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const refundMock = vi.fn(async () => ({
      status: 'SUCCEEDED',
      providerRefundId: 'KHALTI-RACE',
    }));
    const service = new RefundService(
      gateways({
        KHALTI: { refund: refundMock },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const [first, second] = await Promise.all([
      service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' }),
      service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-2' }),
    ]);

    expect(refundMock).toHaveBeenCalledOnce();
    expect(second?.id).toBe(first?.id);
    expect(
      await prisma.refund.count({
        where: { orderId: order.id, status: { in: ['PENDING', 'SUCCEEDED'] } },
      }),
    ).toBe(1);
    expect(
      await prisma.ledgerEntry.count({
        where: { sourceType: 'REFUND', sourceId: first!.id },
      }),
    ).toBe(1);
  });

  it('returns the existing refund when a second attempt is made', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const first = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });
    const second = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(second?.id).toBe(first?.id);
  });

  // A refund that the gateway refused should be retryable, or one transient
  // failure would strand the customer's money permanently.
  it('allows a failed refund to be attempted again', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    const refundMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 'FAILED', message: 'Gateway timeout' })
      .mockResolvedValueOnce({ status: 'SUCCEEDED' });
    const service = new RefundService(
      gateways({
        KHALTI: { refund: refundMock },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const failed = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });
    expect(failed?.status).toBe(RefundStatus.FAILED);

    const retried = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });
    expect(retried?.status).toBe(RefundStatus.SUCCEEDED);
    expect(refundMock).toHaveBeenCalledTimes(2);
  });

  it('does nothing for a cash on delivery order, which was never charged', async () => {
    const { order } = await paidOrder(PaymentMethod.COD);
    const refundMock = vi.fn(async () => ({ status: 'SUCCEEDED' }));
    const service = new RefundService(
      gateways({
        KHALTI: { refund: refundMock },
        ESEWA: { refund: refundMock },
        COD: { refund: refundMock },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(refund).toBeNull();
    expect(refundMock).not.toHaveBeenCalled();
    expect(await prisma.refund.count()).toBe(0);
  });

  it('does nothing when the payment never completed', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI);
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { status: PaymentStatus.PENDING },
    });
    const refundMock = vi.fn(async () => ({ status: 'SUCCEEDED' }));
    const service = new RefundService(
      gateways({
        KHALTI: { refund: refundMock },
        ESEWA: { refund: refundMock },
        COD: { refund: refundMock },
      }),
    );

    expect(await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' })).toBeNull();
    expect(refundMock).not.toHaveBeenCalled();
  });

  // Money leaving the platform has to reach the ledger, or "what did we take" is
  // a number that quietly forgets the returns.
  it('records a completed refund in the ledger as money going out', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI, 2500);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    const refund = await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    const entry = await prisma.ledgerEntry.findFirstOrThrow({
      where: { sourceType: 'REFUND', sourceId: refund!.id },
    });
    expect(entry.type).toBe(LedgerEntryType.REFUND);
    expect(entry.direction).toBe(LedgerDirection.OUT);
    expect(entry.amount.toNumber()).toBe(2500);
    expect(entry.orderId).toBe(order.id);
  });

  // A refund still waiting on a person has not left the platform. Recording it
  // now would understate the money we actually hold.
  it('does not record a refund that still needs doing by hand', async () => {
    const { order } = await paidOrder(PaymentMethod.ESEWA, 2500);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'SUCCEEDED' }) },
        ESEWA: { refund: async () => ({ status: 'REQUIRES_MANUAL_ACTION' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(await prisma.ledgerEntry.count({ where: { type: LedgerEntryType.REFUND } })).toBe(0);
  });

  it('records a failed refund nowhere, because no money moved', async () => {
    const { order } = await paidOrder(PaymentMethod.KHALTI, 2500);
    const service = new RefundService(
      gateways({
        KHALTI: { refund: async () => ({ status: 'FAILED', message: 'nope' }) },
        ESEWA: { refund: async () => ({ status: 'FAILED' }) },
        COD: { refund: async () => ({ status: 'FAILED' }) },
      }),
    );

    await service.initiateRefund({ orderId: order.id, initiatedBy: 'admin-1' });

    expect(await prisma.ledgerEntry.count({ where: { type: LedgerEntryType.REFUND } })).toBe(0);
  });
});
