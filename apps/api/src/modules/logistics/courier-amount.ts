import { Prisma } from '@/config/db.prisma';

/**
 * The one place a money value is allowed to become a plain number.
 *
 * Courier APIs take `amount_to_collect` as an integer - Pathao rejects 1500.75
 * with "The amount to collect must be an integer" - so a paisa has to be resolved
 * before a parcel is handed over. Every other money value in this codebase stays
 * a `Prisma.Decimal`, because a JS number cannot hold one reliably: 0.1 + 0.2 is
 * 0.30000000000000004, and that error would end up in a figure a courier collects
 * and we later reconcile against a statement.
 *
 * Rounding is **down**, deliberately. Collecting a rupee less than the order says
 * costs the platform under a rupee and never once produces a customer who was
 * asked for more than they agreed to. Rounding up would do the opposite: it is
 * money taken that was never quoted.
 *
 * The residual is not hidden. Once the collectible total is rounded to whole
 * rupees at quote time this becomes a pass-through rather than a rounding step,
 * and any difference is posted to the ledger as an explicit adjustment.
 */
export function courierWholeRupees(amount: Prisma.Decimal): number {
  return amount.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN).toNumber();
}
