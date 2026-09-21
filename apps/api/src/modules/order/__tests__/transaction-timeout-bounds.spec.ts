import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkoutRepository } from '../checkout/checkout.repository';
import { fulfillmentRepository } from '../fulfillment/fulfillment.repository';

import prisma from '@/config/db.prisma';

describe('Order Transaction Timeout and Connection Pool Bounds', () => {
  let transactionSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Intercept $transaction without breaking actual execution if invoked
    transactionSpy = vi.spyOn(prisma, '$transaction');
  });

  afterEach(() => {
    transactionSpy.mockRestore();
  });

  it('enforces bounded transaction timeout options on stale reservation release to preserve connection pool', async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      orderItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      orderTrackingEvent: {
        create: vi.fn().mockResolvedValue({ id: 'tracking-1' }),
      },
      order: {
        update: vi
          .fn()
          .mockResolvedValue({ id: 'order-1', status: 'CANCELLED', paymentStatus: 'FAILED' }),
      },
    };

    transactionSpy.mockImplementation(async (callback: unknown, _options?: unknown) => {
      if (typeof callback === 'function') {
        return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      }
      return undefined;
    });

    await checkoutRepository.releaseStaleReservation({
      id: 'order-test-123',
      items: [{ inventoryId: 'inv-1', quantity: 2, itemStatus: 'PENDING' }],
    });

    expect(transactionSpy).toHaveBeenCalled();
    const lastCall = transactionSpy.mock.calls[0];
    const options = lastCall?.[1] as { maxWait?: number; timeout?: number } | undefined;

    expect(options).toBeDefined();
    expect(options?.maxWait).toBe(5000);
    expect(options?.timeout).toBe(10000);
  });

  it('enforces bounded transaction timeout options on order item status updates to preserve connection pool', async () => {
    const mockTx = {
      orderItem: {
        update: vi.fn().mockResolvedValue({ id: 'item-1', itemStatus: 'DELIVERED' }),
        findMany: vi.fn().mockResolvedValue([{ id: 'item-1', itemStatus: 'DELIVERED' }]),
      },
      productInventory: {
        update: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      },
      orderTrackingEvent: {
        create: vi.fn().mockResolvedValue({ id: 'tracking-1' }),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue({ id: 'order-1', paymentStatus: 'COMPLETED' }),
        update: vi.fn().mockResolvedValue({ id: 'order-1', status: 'DELIVERED' }),
      },
    };

    transactionSpy.mockImplementation(async (callback: unknown, _options?: unknown) => {
      if (typeof callback === 'function') {
        return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      }
      return undefined;
    });

    await fulfillmentRepository.applyOrderItemStatus({
      orderId: 'order-test-123',
      orderItemId: 'item-1',
      inventoryId: 'inv-1',
      quantity: 1,
      orderStatus: 'CONFIRMED',
      orderPaymentMethod: 'COD',
      itemStatus: 'DELIVERED',
      previousItemStatus: 'PACKED',
      source: 'TEST',
    });

    expect(transactionSpy).toHaveBeenCalled();
    const lastCall = transactionSpy.mock.calls[0];
    const options = lastCall?.[1] as { maxWait?: number; timeout?: number } | undefined;

    expect(options).toBeDefined();
    expect(options?.maxWait).toBe(5000);
    expect(options?.timeout).toBe(10000);
  });
});
