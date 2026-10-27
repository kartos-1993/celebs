import { computeSellerTotals, type GroupedLedgerRow } from '../ledger/seller-totals';
import { calculateNepalCommissionTax } from '../tax/tax-calculator';

import {
  PlatformFinanceRepository,
  platformFinanceRepository,
  type VendorLedgerGroup,
} from './platform-finance.repository';

import { Prisma } from '@/config/db.prisma';

export interface PlatformOverviewDto {
  totalGmv: string;
  totalPlatformCommission: string;
  totalVatCollected: string;
  totalRefunds: string;
  totalSettledPayouts: string;
  pendingSettlementBalance: string;
  activeSellersCount: number;
  currency: string;
}

export interface PlatformSellerItemDto {
  vendorId: string;
  shopName: string;
  status: string;
  payoutMethod: 'BANK_ACCOUNT' | 'ESEWA' | 'KHALTI' | 'UNCONFIGURED';
  payoutDetails: unknown;
  grossSales: string;
  commission: string;
  refunds: string;
  netPayable: string;
  currency: string;
}

export class PlatformFinanceService {
  constructor(private readonly repository: PlatformFinanceRepository = platformFinanceRepository) {}

  async getOverview(query?: { from?: Date; to?: Date }): Promise<PlatformOverviewDto> {
    const { ledgerGroups, activeSellersCount, settledPayoutsTotal } =
      await this.repository.getOverviewData(query?.from, query?.to);

    let gmv = new Prisma.Decimal('0.00');
    let commissionOut = new Prisma.Decimal('0.00');
    let commissionIn = new Prisma.Decimal('0.00');
    let refunds = new Prisma.Decimal('0.00');

    for (const group of ledgerGroups) {
      const amount = group._sum.amount ?? new Prisma.Decimal('0.00');
      if (!amount.isPositive()) continue;

      if (group.type === 'ORDER_REVENUE' && group.direction === 'IN') {
        gmv = gmv.plus(amount);
      } else if (group.type === 'COMMISSION') {
        if (group.direction === 'OUT') commissionOut = commissionOut.plus(amount);
        if (group.direction === 'IN') commissionIn = commissionIn.plus(amount);
      } else if (group.type === 'REFUND' && group.direction === 'OUT') {
        refunds = refunds.plus(amount);
      }
    }

    const netCommission = commissionOut.minus(commissionIn);
    // Nepal Statutory VAT: 13% on platform marketplace commission
    const { vatAmount: netVat } = calculateNepalCommissionTax(netCommission);
    const settled = settledPayoutsTotal;

    // Pending Escrow = GMV - Commission - 13% VAT - Refunds - Settled payouts
    const pendingSettlementBalance = gmv
      .minus(netCommission)
      .minus(netVat)
      .minus(refunds)
      .minus(settled);

    return {
      totalGmv: gmv.toFixed(2),
      totalPlatformCommission: netCommission.toFixed(2),
      totalVatCollected: netVat.toFixed(2),
      totalRefunds: refunds.toFixed(2),
      totalSettledPayouts: settled.toFixed(2),
      pendingSettlementBalance: pendingSettlementBalance.toFixed(2),
      activeSellersCount,
      currency: 'NPR',
    };
  }

  async listSellers(query: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ items: PlatformSellerItemDto[]; total: number }> {
    const { items: vendors, total } = await this.repository.listVendors(query);

    const vendorIds = vendors.map((v) => v.id);
    const ledgerGroups = await this.repository.getLedgerTotalsForVendors(vendorIds);

    const groupsByVendor = new Map<string, VendorLedgerGroup[]>();
    for (const group of ledgerGroups) {
      if (!group.vendorId) continue;
      const list = groupsByVendor.get(group.vendorId) ?? [];
      list.push(group);
      groupsByVendor.set(group.vendorId, list);
    }

    const items: PlatformSellerItemDto[] = vendors.map((vendor) => {
      const vendorGroups = groupsByVendor.get(vendor.id) ?? [];
      const totals = computeSellerTotals(vendorGroups as unknown as GroupedLedgerRow[]);

      const payoutDetails = vendor.payoutDetails as Record<string, unknown> | null;
      let payoutMethod: 'BANK_ACCOUNT' | 'ESEWA' | 'KHALTI' | 'UNCONFIGURED' = 'UNCONFIGURED';

      if (payoutDetails && typeof payoutDetails === 'object') {
        const method = String(payoutDetails.payoutMethod || '').toUpperCase();
        if (method === 'BANK_ACCOUNT' || method === 'ESEWA' || method === 'KHALTI') {
          payoutMethod = method;
        }
      }

      return {
        vendorId: vendor.id,
        shopName: vendor.shopName,
        status: vendor.status,
        payoutMethod,
        payoutDetails: vendor.payoutDetails,
        grossSales: totals.grossSales.toFixed(2),
        commission: totals.commission.toFixed(2),
        refunds: totals.refunds.toFixed(2),
        netPayable: totals.netPayable.toFixed(2),
        currency: totals.currency,
      };
    });

    return { items, total };
  }
}

export const platformFinanceService = new PlatformFinanceService();
