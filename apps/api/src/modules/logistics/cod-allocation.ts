import { money } from './money';

import { Prisma } from '@/config/db.prisma';

const ZERO = new Prisma.Decimal(0);

/**
 * Splits one collectible total across several consignments.
 *
 * A customer pays a single total, but a basket holding goods from three sellers is
 * three consignments, and each courier is told an amount to collect. Those amounts
 * have to add back to the total exactly. Not approximately - exactly. If they add
 * up to a paisa short, the courier is out of pocket against a customer who has
 * already paid us in full, and the difference is ours.
 *
 * Independent rounding cannot deliver that: rounding each share down loses money,
 * rounding each up takes it from the platform. So every share is floored to whole
 * paisas and the leftovers are handed out one paisa at a time, largest remainder
 * first, which always sums back to the total exactly.
 *
 * Ties break on key rather than arrival order, so the same basket always splits the
 * same way. A courier's collection changing because the database returned rows in a
 * different order is not something anyone could explain to a customer.
 */
export interface CollectionPart {
  key: string;
  /** What this parcel represents of the whole: its goods plus its share of delivery. */
  weight: Prisma.Decimal;
}

export function allocateCollection(input: {
  total: Prisma.Decimal;
  parts: readonly CollectionPart[];
}): Map<string, Prisma.Decimal> {
  const allocation = new Map<string, Prisma.Decimal>();

  if (input.parts.length === 0) return allocation;

  // A negative total is a broken input, not an instruction to claw money back off a
  // courier. Zero for every part is the only safe reading of it.
  const totalPaisas = (input.total.isNegative() ? ZERO : input.total)
    .mul(100)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);

  // With every weight at zero there is no basis to prefer one parcel over another,
  // so each counts the same. Dividing by a zero weight sum would hand the entire
  // customer total to whichever parcel happened to be first.
  const hasWeights = input.parts.some((part) => part.weight.greaterThan(0));
  const weights = input.parts.map((part) =>
    hasWeights ? (part.weight.isNegative() ? ZERO : part.weight) : new Prisma.Decimal(1),
  );
  const weightSum = weights.reduce((acc, weight) => acc.add(weight), ZERO);

  const shares = input.parts.map((part, index) => {
    const exact = totalPaisas.mul(weights[index]!).div(weightSum);
    const floored = exact.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);

    return { key: part.key, paisas: floored, remainder: exact.minus(floored) };
  });

  const distributed = shares.reduce((acc, share) => acc.add(share.paisas), ZERO);
  const leftover = totalPaisas.minus(distributed).toNumber();

  // Fewer leftover paisas than parts, so ranking first and handing out one at a
  // time terminates without any part receiving more than its share of rounding.
  const ranked = [...shares].sort((a, b) => {
    const byRemainder = b.remainder.comparedTo(a.remainder);
    return byRemainder !== 0 ? byRemainder : a.key.localeCompare(b.key);
  });

  for (let i = 0; i < leftover && i < ranked.length; i += 1) {
    ranked[i]!.paisas = ranked[i]!.paisas.add(1);
  }

  for (const share of shares) {
    allocation.set(share.key, money(share.paisas.div(100)));
  }

  return allocation;
}
