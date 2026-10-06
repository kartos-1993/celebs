import { Prisma } from '@/config/db.prisma';

/**
 * Rounds to money precision, half-up.
 *
 * Half-up because that is what the commission engine already does per line, and
 * two systems that disagree by one paisa at the halfway point disagree about
 * whose money it is. Rounding is written out rather than left to Decimal's
 * default: relying on a library default for a money rule is how the rule
 * silently changes on an upgrade.
 */
export const MONEY_PLACES = 2;

export const money = (value: Prisma.Decimal): Prisma.Decimal =>
  value.toDecimalPlaces(MONEY_PLACES, Prisma.Decimal.ROUND_HALF_UP);

export const zeroMoney = (): Prisma.Decimal => new Prisma.Decimal(0);
