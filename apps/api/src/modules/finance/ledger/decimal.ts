import { Prisma } from '@/config/db.prisma';

/**
 * Money predicates that are safe on a Decimal.
 *
 * `Decimal.isPositive()` cannot be used to ask "is there money here". In this
 * Prisma Decimal it means "not negative", so it answers `true` for zero - both a
 * zero constructed in memory and a zero read back from a column. A guard written
 * with it passes on zero, which for this ledger means an order that absorbed no
 * delivery cost looks exactly like one that did.
 *
 * The comparisons below test the value rather than its sign, so they are the only
 * ones used. Pinned by `decimal.spec.ts` so the shortcut does not come back.
 */

export const ZERO = new Prisma.Decimal(0);

/** True only for a real, non-zero value above zero. */
export const isAboveZero = (value: Prisma.Decimal | null | undefined): boolean =>
  value !== null && value !== undefined && value.greaterThan(ZERO);

/** True only for a value below zero. */
export const isBelowZero = (value: Prisma.Decimal | null | undefined): boolean =>
  value !== null && value !== undefined && value.lessThan(ZERO);

export const isExactlyZero = (value: Prisma.Decimal | null | undefined): boolean =>
  value === null || value === undefined || value.equals(ZERO);
