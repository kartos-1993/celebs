import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backfillLedgerVendorAttribution,
  type UnassignedRevenueRecord,
} from '../backfill-ledger-vendor-attribution';

import prisma, { Prisma } from '@/config/db.prisma';

describe('backfillLedgerVendorAttribution', () => {
  const mockUnassignedEntry: UnassignedRevenueRecord = {
    id: 'entry-order-1',
    orderId: 'order-123',
    amount: new Prisma.Decimal('2800.00'),
    sourceType: 'ORDER',
    sourceId: 'order-123',
  };

  const mockOrderItem = {
    id: 'item-456',
    orderId: 'order-123',
    vendorId: 'vendor-cachee',
    subtotal: new Prisma.Decimal('2800.00'),
  };

  let findManyLedger: ReturnType<typeof vi.fn>;
  let findManyOrderItems: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    findManyLedger = vi.fn();
    findManyOrderItems = vi.fn();
    transaction = vi.fn();

    vi.spyOn(prisma.ledgerEntry, 'findMany').mockImplementation(findManyLedger as never);
    vi.spyOn(prisma.orderItem, 'findMany').mockImplementation(findManyOrderItems as never);
    vi.spyOn(prisma, '$transaction').mockImplementation(transaction as never);
  });

  it('identifies unassigned order revenue and reports backfill candidate in dry-run mode', async () => {
    findManyLedger.mockResolvedValue([mockUnassignedEntry]);
    findManyOrderItems.mockResolvedValue([mockOrderItem]);

    const result = await backfillLedgerVendorAttribution({ apply: false });

    expect(result.foundUnassignedCount).toBe(1);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toEqual({
      orderId: 'order-123',
      legacyEntryId: 'entry-order-1',
      lineItems: [
        {
          orderItemId: 'item-456',
          vendorId: 'vendor-cachee',
          subtotal: '2800.00',
        },
      ],
    });
    expect(result.appliedCount).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('applies the backfill in transaction when apply: true', async () => {
    findManyLedger.mockResolvedValue([mockUnassignedEntry]);
    findManyOrderItems.mockResolvedValue([mockOrderItem]);

    const mockCreate = vi.fn().mockResolvedValue({});
    const mockDelete = vi.fn().mockResolvedValue({});

    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        ledgerEntry: {
          create: mockCreate,
          delete: mockDelete,
        },
      });
    });

    const result = await backfillLedgerVendorAttribution({ apply: true });

    expect(result.appliedCount).toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'ORDER_REVENUE',
          direction: 'IN',
          sourceType: 'ORDER_ITEM',
          sourceId: 'item-456',
          vendorId: 'vendor-cachee',
        }),
      }),
    );
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'entry-order-1' },
    });
  });

  it('returns clean zero result when no unassigned entries exist', async () => {
    findManyLedger.mockResolvedValue([]);

    const result = await backfillLedgerVendorAttribution({ apply: false });

    expect(result.foundUnassignedCount).toBe(0);
    expect(result.candidates).toHaveLength(0);
    expect(result.appliedCount).toBe(0);
  });
});
