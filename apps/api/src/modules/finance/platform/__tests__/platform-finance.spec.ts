import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformFinanceRepository } from '../platform-finance.repository';
import { PlatformFinanceService } from '../platform-finance.service';

import prisma, { Prisma } from '@/config/db.prisma';

describe('Platform Finance Overview and Seller Remittance Directory Contract', () => {
  let repository: PlatformFinanceRepository;
  let service: PlatformFinanceService;

  beforeEach(() => {
    repository = new PlatformFinanceRepository();
    service = new PlatformFinanceService(repository);
    vi.restoreAllMocks();
  });

  describe('getOverview', () => {
    it('aggregates platform GMV, commission, VAT on commission, refunds, and pending escrow balance', async () => {
      const mockLedgerGroups = [
        {
          type: 'ORDER_REVENUE',
          direction: 'IN',
          _sum: { amount: new Prisma.Decimal('100000.00') },
        },
        {
          type: 'COMMISSION',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('10000.00') },
        },
        {
          type: 'TAX_COLLECTED',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('1300.00') }, // 13% VAT on 10,000 commission
        },
        {
          type: 'REFUND',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('5000.00') },
        },
        {
          type: 'SETTLEMENT_PAYMENT',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('60000.00') },
        },
      ];

      vi.spyOn(prisma.ledgerEntry, 'groupBy').mockResolvedValue(mockLedgerGroups as never);
      vi.spyOn(prisma.vendorProfile, 'count').mockResolvedValue(8);
      vi.spyOn(prisma.sellerStatement, 'aggregate').mockResolvedValue({
        _sum: { netPayable: new Prisma.Decimal('60000.00') },
      } as never);

      const overview = await service.getOverview();

      expect(overview.totalGmv).toBe('100000.00');
      expect(overview.totalPlatformCommission).toBe('10000.00');
      expect(overview.totalVatCollected).toBe('1300.00');
      expect(overview.totalRefunds).toBe('5000.00');
      expect(overview.totalSettledPayouts).toBe('60000.00');

      // Pending escrow = GMV (100,000) - Commission (10,000) - VAT (1,300) - Refunds (5,000) - Settled (60,000) = 23,700.00
      expect(overview.pendingSettlementBalance).toBe('23700.00');
      expect(overview.activeSellersCount).toBe(8);
      expect(overview.currency).toBe('NPR');
    });
  });

  describe('listSellers', () => {
    it('returns seller remittance directory with parsed payout methods and ledger totals', async () => {
      const vendorId1 = '550e8400-e29b-41d4-a716-446655440001';
      const vendorId2 = '550e8400-e29b-41d4-a716-446655440002';

      const mockVendors = [
        {
          id: vendorId1,
          shopName: 'Cachee Apparel',
          status: 'APPROVED',
          payoutDetails: {
            payoutMethod: 'BANK_ACCOUNT',
            bankName: 'Nabil Bank',
            accountNumber: '01101017500123',
          },
        },
        {
          id: vendorId2,
          shopName: 'Himalayan Crafts',
          status: 'APPROVED',
          payoutDetails: null,
        },
      ];

      const mockVendorLedgerGroups = [
        {
          vendorId: vendorId1,
          type: 'ORDER_REVENUE',
          direction: 'IN',
          _sum: { amount: new Prisma.Decimal('50000.00') },
        },
        {
          vendorId: vendorId1,
          type: 'COMMISSION',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('5000.00') },
        },
        {
          vendorId: vendorId1,
          type: 'REFUND',
          direction: 'OUT',
          _sum: { amount: new Prisma.Decimal('2000.00') },
        },
      ];

      vi.spyOn(prisma.vendorProfile, 'findMany').mockResolvedValue(mockVendors as never);
      vi.spyOn(prisma.vendorProfile, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.ledgerEntry, 'groupBy').mockResolvedValue(mockVendorLedgerGroups as never);

      const result = await service.listSellers({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);

      const [cachee, himalayan] = result.items;
      if (!cachee || !himalayan) throw new Error('Expected 2 vendor items');
      expect(cachee.shopName).toBe('Cachee Apparel');
      expect(cachee.payoutMethod).toBe('BANK_ACCOUNT');
      expect(cachee.grossSales).toBe('50000.00');
      expect(cachee.commission).toBe('5000.00');
      expect(cachee.refunds).toBe('2000.00');
      // Net keep = 50,000 - 5,000 - 2,000 = 43,000.00
      expect(cachee.netPayable).toBe('43000.00');

      expect(himalayan.shopName).toBe('Himalayan Crafts');
      expect(himalayan.payoutMethod).toBe('UNCONFIGURED');
      expect(himalayan.grossSales).toBe('0.00');
      expect(himalayan.netPayable).toBe('0.00');
    });
  });
});
