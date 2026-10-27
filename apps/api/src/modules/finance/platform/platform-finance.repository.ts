import prisma, { Prisma } from '@/config/db.prisma';

export interface PlatformOverviewRaw {
  ledgerGroups: Array<{
    type: string;
    direction: string;
    _sum: { amount: Prisma.Decimal | null };
  }>;
  activeSellersCount: number;
  settledPayoutsTotal: Prisma.Decimal;
}

export interface PlatformSellerRow {
  id: string;
  shopName: string;
  status: string;
  payoutDetails: unknown;
}

export interface VendorLedgerGroup {
  vendorId: string | null;
  type: string;
  direction: string;
  _sum: { amount: Prisma.Decimal | null };
}

export class PlatformFinanceRepository {
  async getOverviewData(from?: Date, to?: Date): Promise<PlatformOverviewRaw> {
    const where: Prisma.LedgerEntryWhereInput =
      from || to
        ? {
            occurredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lt: to } : {}),
            },
          }
        : {};

    const [ledgerGroups, activeSellersCount, settledPayoutsAggregate] = await Promise.all([
      prisma.ledgerEntry.groupBy({
        by: ['type', 'direction'],
        where,
        _sum: { amount: true },
      }),
      prisma.vendorProfile.count({
        where: { status: 'APPROVED' },
      }),
      prisma.sellerStatement.aggregate({
        _sum: { netPayable: true },
        where: {
          status: 'PAID',
          ...(from || to
            ? {
                paidAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lt: to } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    return {
      ledgerGroups: ledgerGroups as PlatformOverviewRaw['ledgerGroups'],
      activeSellersCount,
      settledPayoutsTotal: settledPayoutsAggregate._sum.netPayable ?? new Prisma.Decimal('0.00'),
    };
  }

  async listVendors(query: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ items: PlatformSellerRow[]; total: number }> {
    const where: Prisma.VendorProfileWhereInput = {
      status: 'APPROVED',
      ...(query.search
        ? {
            shopName: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.vendorProfile.findMany({
        where,
        select: {
          id: true,
          shopName: true,
          status: true,
          payoutDetails: true,
        },
        orderBy: { shopName: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.vendorProfile.count({ where }),
    ]);

    return { items, total };
  }

  async getLedgerTotalsForVendors(vendorIds: string[]): Promise<VendorLedgerGroup[]> {
    if (vendorIds.length === 0) return [];

    const groups = await prisma.ledgerEntry.groupBy({
      by: ['vendorId', 'type', 'direction'],
      where: {
        vendorId: { in: vendorIds },
      },
      _sum: { amount: true },
    });

    return groups as unknown as VendorLedgerGroup[];
  }
}

export const platformFinanceRepository = new PlatformFinanceRepository();
