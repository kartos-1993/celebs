import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

/**
 * Maintenance Script: Backfill Ledger Vendor Attribution
 *
 * Background:
 * Prior to line-level attribution, `postOrderPlacementEntries` posted a single
 * `ORDER_REVENUE` entry with `sourceType: 'ORDER'` and `vendorId: null`.
 * When a 3P vendor had products purchased (e.g. Cachee on order `CEL-261025-240543`),
 * the platform commission was debited against the vendor (-168), but zero gross sales
 * was credited, showing a negative balance.
 *
 * This script identifies unassigned `ORDER_REVENUE` entries, inspects the underlying
 * `OrderItem` rows, and backfills line-level `ORDER_REVENUE` entries with proper
 * `vendorId` and `sourceType: 'ORDER_ITEM'`.
 */

export interface BackfillOptions {
  /** If false, only report what will be backfilled without modifying the database. Default: false. */
  apply?: boolean;
  orderId?: string;
}

export interface UnassignedRevenueRecord {
  id: string;
  orderId: string | null;
  amount: Prisma.Decimal;
  sourceType: string;
  sourceId: string;
}

export interface CandidateOrderLine {
  orderItemId: string;
  vendorId: string;
  subtotal: string;
}

export interface BackfillCandidate {
  orderId: string;
  legacyEntryId: string;
  lineItems: CandidateOrderLine[];
}

export interface BackfillResult {
  foundUnassignedCount: number;
  candidates: BackfillCandidate[];
  appliedCount: number;
}

export async function backfillLedgerVendorAttribution(
  options: BackfillOptions = {},
): Promise<BackfillResult> {
  const { apply = false, orderId } = options;

  const unassignedEntries: UnassignedRevenueRecord[] = await prisma.ledgerEntry.findMany({
    where: {
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      vendorId: null,
      orderId: orderId ? orderId : { not: null },
      sourceType: 'ORDER',
    },
    select: {
      id: true,
      orderId: true,
      amount: true,
      sourceType: true,
      sourceId: true,
    },
  });

  const candidates: BackfillCandidate[] = [];

  for (const entry of unassignedEntries) {
    if (!entry.orderId) continue;

    const items = await prisma.orderItem.findMany({
      where: { orderId: entry.orderId },
      select: {
        id: true,
        vendorId: true,
        subtotal: true,
      },
    });

    if (items.length === 0) continue;

    candidates.push({
      orderId: entry.orderId,
      legacyEntryId: entry.id,
      lineItems: items.map((item) => ({
        orderItemId: item.id,
        vendorId: item.vendorId,
        subtotal: item.subtotal.toFixed(2),
      })),
    });
  }

  let appliedCount = 0;

  if (apply && candidates.length > 0) {
    for (const candidate of candidates) {
      await prisma.$transaction(async (tx) => {
        for (const line of candidate.lineItems) {
          await tx.ledgerEntry.create({
            data: {
              type: LedgerEntryType.ORDER_REVENUE,
              direction: LedgerDirection.IN,
              amount: new Prisma.Decimal(line.subtotal),
              currency: 'NPR',
              sourceType: 'ORDER_ITEM',
              sourceId: line.orderItemId,
              orderId: candidate.orderId,
              vendorId: line.vendorId,
              memo: 'Goods sold (backfilled from legacy order-level entry)',
            },
          });
        }

        // Safely remove the legacy unassigned order-level entry
        await tx.ledgerEntry.delete({
          where: { id: candidate.legacyEntryId },
        });
      });

      appliedCount++;
    }
  }

  return {
    foundUnassignedCount: unassignedEntries.length,
    candidates,
    appliedCount,
  };
}

if (process.argv[1]?.includes('backfill-ledger-vendor-attribution')) {
  const isApply = process.argv.includes('--apply');
  backfillLedgerVendorAttribution({ apply: isApply })
    .then((result) => {
       
      console.log('Backfill results:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err: unknown) => {
       
      console.error('Error running backfill:', err);
      process.exit(1);
    });
}
