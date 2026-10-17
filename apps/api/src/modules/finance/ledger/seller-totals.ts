import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import { Prisma } from '@/config/db.prisma';

/**
 * What a seller earned over a period.
 *
 * This module exists so that two screens cannot disagree. The seller dashboard
 * and the period snapshot are the same arithmetic over the same ledger rows; if
 * each computed its own totals, a seller comparing the two would be right to
 * complain about one of them, and there would be no principled way to say which.
 *
 * The ledger remains the source of truth. A snapshot is a frozen copy of this
 * calculation, not a replacement for it.
 */
export interface SellerTotals {
  grossSales: Prisma.Decimal;
  commission: Prisma.Decimal;
  refunds: Prisma.Decimal;
  deliveryCosts: Prisma.Decimal;
  /** Gross less commission and refunds. Derived, never multiplied by a rate. */
  netPayable: Prisma.Decimal;
  currency: string;
}

/** Goods sold, in. */
export const SELLER_REVENUE_TYPES: readonly LedgerEntryType[] = [LedgerEntryType.ORDER_REVENUE];

/** The platform's cut, out. */
export const SELLER_COMMISSION_TYPES: readonly LedgerEntryType[] = [LedgerEntryType.COMMISSION];

/** Money returned to a buyer, out. */
export const SELLER_REFUND_TYPES: readonly LedgerEntryType[] = [LedgerEntryType.REFUND];

/**
 * What delivering this seller's goods cost us, out. Charged by the courier, so it
 * is a cost we absorb rather than something withheld from them.
 */
export const SELLER_DELIVERY_COST_TYPES: readonly LedgerEntryType[] = [
  LedgerEntryType.COURIER_DELIVERY_FEE,
  LedgerEntryType.FREE_DELIVERY_ABSORBED,
  LedgerEntryType.COURIER_RETURN_FEE,
];

export const ZERO_MONEY = new Prisma.Decimal(0);

/** One grouped row, as Prisma returns it. Structural so callers may pass the raw rows. */
export interface GroupedLedgerRow {
  type: LedgerEntryType;
  direction: LedgerDirection;
  _sum: { amount: Prisma.Decimal | null } | null;
}

/**
 * Totals from pre-grouped rows.
 *
 * Split out from any database call so the arithmetic is unit-testable without a
 * database, and so the snapshot service and the earnings screen provably share it.
 */
export function computeSellerTotals(rows: readonly GroupedLedgerRow[]): SellerTotals {
  const sumOf = (types: readonly LedgerEntryType[], direction: LedgerDirection): Prisma.Decimal =>
    rows
      .filter((row) => types.includes(row.type) && row.direction === direction)
      .reduce((total, row) => total.plus(row._sum?.amount ?? ZERO_MONEY), ZERO_MONEY);

  const grossSales = sumOf(SELLER_REVENUE_TYPES, LedgerDirection.IN);
  const commission = sumOf(SELLER_COMMISSION_TYPES, LedgerDirection.OUT);
  const refunds = sumOf(SELLER_REFUND_TYPES, LedgerDirection.OUT);
  const deliveryCosts = sumOf(SELLER_DELIVERY_COST_TYPES, LedgerDirection.OUT);

  return {
    grossSales: grossSales.toDecimalPlaces(2),
    commission: commission.toDecimalPlaces(2),
    refunds: refunds.toDecimalPlaces(2),
    deliveryCosts: deliveryCosts.toDecimalPlaces(2),
    netPayable: grossSales.minus(commission).minus(refunds).toDecimalPlaces(2),
    currency: 'NPR',
  };
}

/** The window a period covers: [start, end). Half-open so periods tile without overlap. */
export function periodWindow(periodStart: Date, periodEnd: Date): Prisma.LedgerEntryWhereInput {
  return { occurredAt: { gte: periodStart, lt: periodEnd } };
}
