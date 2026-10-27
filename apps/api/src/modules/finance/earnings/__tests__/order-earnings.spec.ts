import { beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateNepalCommissionTax } from '../../tax/tax-calculator';
import { EarningsRepository } from '../earnings.repository';

import prisma, { Prisma } from '@/config/db.prisma';

describe('Order Earnings Breakdown Contract', () => {
  let repository: EarningsRepository;
  const vendorA = '550e8400-e29b-41d4-a716-446655440001';
  const vendorB = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    repository = new EarningsRepository();
    vi.restoreAllMocks();
  });

  it('aggregates multiple items belonging to the same vendor within an order', async () => {
    const mockOrders = [
      {
        id: 'order-1',
        orderNumber: 'CEL-20261027-001',
        status: 'DELIVERED',
        createdAt: new Date('2026-10-25T10:00:00Z'),
        items: [
          {
            id: 'item-1',
            vendorId: vendorA,
            subtotal: new Prisma.Decimal('1000.00'),
            commissionAmount: new Prisma.Decimal('100.00'),
          },
          {
            id: 'item-2',
            vendorId: vendorA,
            subtotal: new Prisma.Decimal('500.00'),
            commissionAmount: new Prisma.Decimal('50.00'),
          },
        ],
      },
    ];

    vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as never);
    vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.ledgerEntry, 'findMany').mockResolvedValue([]);

    const result = await repository.listOrderEarnings({
      vendorId: vendorA,
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);

    const [first] = result.items;
    if (!first) throw new Error('Expected first item');
    expect(first.orderId).toBe('order-1');
    expect(first.orderNumber).toBe('CEL-20261027-001');
    expect(first.itemCount).toBe(2);
    expect(first.grossSales.toFixed(2)).toBe('1500.00');
    expect(first.commission.toFixed(2)).toBe('150.00');

    // Nepal VAT: 13% on NPR 150.00 commission = NPR 19.50
    const expectedVat = calculateNepalCommissionTax(new Prisma.Decimal('150.00')).vatAmount;
    expect(first.vatOnCommission.toFixed(2)).toBe(expectedVat.toFixed(2));
    expect(first.vatOnCommission.toFixed(2)).toBe('19.50');

    // Net keep = Gross (1500) - Commission (150) - VAT on Commission (19.50) - Refunds (0) = 1330.50
    expect(first.netEarnings.toFixed(2)).toBe('1330.50');
    expect(first.refunds.toFixed(2)).toBe('0.00');
    expect(first.refundStatus).toBe('NONE');
    expect(first.creditNoteAvailable).toBe(false);
  });

  it('strictly isolates multi-vendor order items and excludes items belonging to peer vendors', async () => {
    const mockOrders = [
      {
        id: 'order-multi',
        orderNumber: 'CEL-20261027-MULTI',
        status: 'DELIVERED',
        createdAt: new Date('2026-10-25T11:00:00Z'),
        items: [
          {
            id: 'item-vendor-a',
            vendorId: vendorA,
            subtotal: new Prisma.Decimal('2000.00'),
            commissionAmount: new Prisma.Decimal('200.00'),
          },
          // Vendor B line must be filtered by where clause and ignored if present
          {
            id: 'item-vendor-b',
            vendorId: vendorB,
            subtotal: new Prisma.Decimal('8000.00'),
            commissionAmount: new Prisma.Decimal('800.00'),
          },
        ],
      },
    ];

    vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as never);
    vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.ledgerEntry, 'findMany').mockResolvedValue([]);

    const result = await repository.listOrderEarnings({
      vendorId: vendorA,
      page: 1,
      limit: 10,
    });

    const [entry] = result.items;
    if (!entry) throw new Error('Expected entry');
    expect(entry.grossSales.toFixed(2)).toBe('2000.00');
    expect(entry.commission.toFixed(2)).toBe('200.00');
    expect(entry.vatOnCommission.toFixed(2)).toBe('26.00'); // 13% of 200
    expect(entry.netEarnings.toFixed(2)).toBe('1774.00'); // 2000 - 200 - 26
  });

  it('accurately accounts for partial refund with ledger attribution and flags Credit Note availability', async () => {
    const mockOrders = [
      {
        id: 'order-refunded',
        orderNumber: 'CEL-20261027-REF',
        status: 'DELIVERED',
        createdAt: new Date('2026-10-25T12:00:00Z'),
        items: [
          {
            id: 'item-ref',
            vendorId: vendorA,
            subtotal: new Prisma.Decimal('1000.00'),
            commissionAmount: new Prisma.Decimal('100.00'),
          },
        ],
      },
    ];

    const mockLedgerEntries = [
      {
        orderId: 'order-refunded',
        vendorId: vendorA,
        type: 'REFUND',
        direction: 'OUT',
        amount: new Prisma.Decimal('400.00'),
      },
    ];

    vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as never);
    vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.ledgerEntry, 'findMany').mockResolvedValue(mockLedgerEntries as never);

    const result = await repository.listOrderEarnings({
      vendorId: vendorA,
      page: 1,
      limit: 10,
    });

    const [entry] = result.items;
    if (!entry) throw new Error('Expected entry');
    expect(entry.refunds.toFixed(2)).toBe('400.00');
    expect(entry.refundStatus).toBe('PARTIAL');
    expect(entry.creditNoteAvailable).toBe(true);

    // Net keep = 1000 - 100 - 13 - 400 = 487.00
    expect(entry.netEarnings.toFixed(2)).toBe('487.00');
  });

  it('marks refundStatus as FULL when refund equals or exceeds gross sales', async () => {
    const mockOrders = [
      {
        id: 'order-full-refund',
        orderNumber: 'CEL-20261027-FULL',
        status: 'RETURNED',
        paymentStatus: 'REFUNDED',
        createdAt: new Date('2026-10-25T13:00:00Z'),
        items: [
          {
            id: 'item-full',
            vendorId: vendorA,
            subtotal: new Prisma.Decimal('500.00'),
            commissionAmount: new Prisma.Decimal('50.00'),
          },
        ],
      },
    ];

    const mockLedgerEntries = [
      {
        orderId: 'order-full-refund',
        vendorId: vendorA,
        type: 'REFUND',
        direction: 'OUT',
        amount: new Prisma.Decimal('500.00'),
      },
    ];

    vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as never);
    vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.ledgerEntry, 'findMany').mockResolvedValue(mockLedgerEntries as never);

    const result = await repository.listOrderEarnings({
      vendorId: vendorA,
      page: 1,
      limit: 10,
    });

    const [entry] = result.items;
    if (!entry) throw new Error('Expected entry');
    expect(entry.refundStatus).toBe('FULL');
    expect(entry.creditNoteAvailable).toBe(true);
  });
});
